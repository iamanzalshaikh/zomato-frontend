import { fetchCaseMerchantMenu } from '@/services/case';
import {
  caseCartHasZeroPriceLines,
  useCaseCartStore,
  type CaseCartPricePatch,
  type CaseCartLine,
} from '@/stores/caseCart';

let repairInFlight: Promise<number> | null = null;

function norm(s: string) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** Wait until AsyncStorage cart rehydrate finishes (otherwise repair sees empty []). */
export function waitForCaseCartHydration(): Promise<void> {
  try {
    const api = useCaseCartStore.persist;
    if (api.hasHydrated()) return Promise.resolve();
    return new Promise((resolve) => {
      const unsub = api.onFinishHydration(() => {
        unsub();
        resolve();
      });
      // Safety: don't hang forever
      setTimeout(() => {
        unsub();
        resolve();
      }, 2500);
    });
  } catch {
    return Promise.resolve();
  }
}

function derivePrimary(items: CaseCartLine[]) {
  if (!items.length) return { restaurantId: null as string | null, restaurantName: null as string | null };
  const ids = [...new Set(items.map((i) => i.restaurantId).filter(Boolean))];
  if (ids.length === 1) {
    const first = items.find((i) => i.restaurantId === ids[0]);
    return { restaurantId: ids[0], restaurantName: first?.restaurantName ?? null };
  }
  return { restaurantId: 'multi', restaurantName: `${ids.length} stores` };
}

/** If unit price is 0 but line total is set, recover unit price = total / qty. */
export function healPricesFromLineTotals(): number {
  const state = useCaseCartStore.getState();
  let fixed = 0;
  const next = state.items.map((line) => {
    if (Number(line.price) > 0) return line;
    const qty = Math.max(1, Number(line.quantity) || 1);
    const total = Number(line.total);
    if (!(total > 0)) return line;
    const unit = total / qty;
    if (!(unit > 0)) return line;
    fixed += 1;
    return { ...line, price: unit, total: unit * qty };
  });
  if (fixed > 0) {
    useCaseCartStore.setState({ items: next, ...derivePrimary(next) });
    if (__DEV__) console.log(`[cart] healed ${fixed} line(s) from total→price`);
  }
  return fixed;
}

/**
 * Backfills unit prices for legacy CASE cart lines saved with price=0.
 * Returns how many lines were patched. Callers should then drop any that are still 0.
 */
export async function repairCaseCartZeroPrices(): Promise<number> {
  await waitForCaseCartHydration();

  try {
    if (!caseCartHasZeroPriceLines()) return 0;
  } catch {
    return 0;
  }
  if (repairInFlight) return repairInFlight;

  repairInFlight = (async () => {
    try {
      const state = useCaseCartStore.getState();
      const items = Array.isArray(state.items) ? state.items : [];
      const fallbackMerchant =
        state.restaurantId && state.restaurantId !== 'multi' ? state.restaurantId : null;

      const broken = items.filter((i) => !(Number(i.price) > 0));
      if (!broken.length) return 0;

      const merchantIds = [
        ...new Set(
          [
            ...broken.map((i) => String(i.restaurantId || '')),
            fallbackMerchant ?? '',
            ...items.map((i) => String(i.restaurantId || '')),
          ].filter((id) => id && id !== 'multi'),
        ),
      ];

      if (!merchantIds.length) {
        if (__DEV__) {
          console.warn('[cart] price repair: no merchant ids', {
            broken: broken.map((b) => ({
              id: b._id,
              menuItemId: b.menuItemId,
              restaurantId: b.restaurantId,
              name: b.itemName,
              price: b.price,
            })),
          });
        }
        return 0;
      }

      if (__DEV__) {
        console.log(
          `[cart] repairing ${broken.length} zero-price line(s) via merchants:`,
          merchantIds,
        );
      }

      const menus = await Promise.all(
        merchantIds.map(async (id) => {
          try {
            return { id, menu: await fetchCaseMerchantMenu(id) };
          } catch (e) {
            if (__DEV__) {
              console.warn(`[cart] menu fetch failed for ${id}:`, e instanceof Error ? e.message : e);
            }
            return { id, menu: null as Awaited<ReturnType<typeof fetchCaseMerchantMenu>> | null };
          }
        }),
      );
      const menuByMerchant = new Map(menus.map((m) => [m.id, m.menu]));
      const allItems = menus.flatMap((m) =>
        (m.menu?.items ?? []).map((it) => ({ merchantId: m.id, menuName: m.menu!.restaurantName, it })),
      );
      const patches: CaseCartPricePatch[] = [];

      for (const line of broken) {
        const mid = String(line.restaurantId || fallbackMerchant || '');
        const menu = mid ? menuByMerchant.get(mid) : null;

        let match =
          menu?.items?.find(
            (it) =>
              String(it.id) === String(line.menuItemId) ||
              String(it._id) === String(line.menuItemId),
          ) ?? null;
        let matchMerchant = mid;
        let matchStoreName = menu?.restaurantName;

        // Fallback: search every loaded menu by id, then by name
        if (!match && line.menuItemId) {
          const hit = allItems.find(
            (row) =>
              String(row.it.id) === String(line.menuItemId) ||
              String(row.it._id) === String(line.menuItemId),
          );
          if (hit) {
            match = hit.it;
            matchMerchant = hit.merchantId;
            matchStoreName = hit.menuName;
          }
        }

        if (!match && line.itemName && line.itemName !== 'Item') {
          const want = norm(line.itemName);
          const pool = menu?.items?.length ? menu.items : allItems.map((r) => r.it);
          match =
            pool.find((it) => norm(it.itemName) === want) ??
            pool.find((it) => norm(it.itemName).includes(want) || want.includes(norm(it.itemName))) ??
            null;
          if (match && !matchMerchant) {
            const hit = allItems.find((r) => r.it === match || r.it.id === match!.id);
            if (hit) {
              matchMerchant = hit.merchantId;
              matchStoreName = hit.menuName;
            }
          }
        }

        if (!match) continue;
        const unit = Number(match.discountedPrice ?? match.price ?? 0);
        if (!(unit > 0)) continue;

        patches.push({
          lineId: line._id,
          price: unit,
          itemName: match.itemName,
          restaurantName: matchStoreName,
        });

        // Also fix missing/wrong restaurantId on the line
        if (matchMerchant && (!line.restaurantId || line.restaurantId === 'multi')) {
          useCaseCartStore.setState((s) => ({
            items: s.items.map((it) =>
              it._id === line._id ? { ...it, restaurantId: matchMerchant } : it,
            ),
          }));
        }
      }

      if (!patches.length) {
        if (__DEV__) {
          console.warn(
            `[cart] price repair: 0/${broken.length} matched. menuCounts=`,
            menus.map((m) => ({ id: m.id, n: m.menu?.items?.length ?? 0 })),
          );
        }
        return 0;
      }

      const patchFn = useCaseCartStore.getState().patchLinePrices;
      if (typeof patchFn === 'function') {
        patchFn(patches);
      } else {
        const byId = new Map(patches.map((p) => [p.lineId, p]));
        const next = useCaseCartStore.getState().items.map((line) => {
          const patch = byId.get(line._id);
          if (!patch || !(Number(patch.price) > 0)) return line;
          const price = Number(patch.price);
          return {
            ...line,
            price,
            total: price * Number(line.quantity || 1),
            itemName:
              line.itemName && line.itemName !== 'Item'
                ? line.itemName
                : patch.itemName || line.itemName,
            restaurantName: line.restaurantName || patch.restaurantName || line.restaurantName,
          };
        });
        useCaseCartStore.setState({ items: next, ...derivePrimary(next) });
      }

      if (__DEV__) console.log(`🟢 [cart] repaired ${patches.length} zero-price line(s)`);
      return patches.length;
    } catch (e) {
      if (__DEV__) {
        console.warn('[cart] price repair skipped:', e instanceof Error ? e.message : e);
      }
      return 0;
    } finally {
      repairInFlight = null;
    }
  })();

  return repairInFlight;
}

/**
 * Drop any lines that still have price <= 0 after repair.
 * Returns how many were removed.
 */
export function dropZeroPriceCartLines(): number {
  const state = useCaseCartStore.getState();
  const before = state.items.length;
  // Last chance: derive from total before dropping
  healPricesFromLineTotals();
  const next = useCaseCartStore.getState().items.filter((i) => Number(i.price) > 0);
  if (next.length === before) return 0;
  useCaseCartStore.setState({
    items: next,
    ...derivePrimary(next),
    ...(next.length === 0
      ? { restaurantId: null, restaurantName: null, generalNote: '', dontSendCutlery: true }
      : {}),
  });
  if (__DEV__) console.warn(`[cart] dropped ${before - next.length} unpriced line(s)`);
  return before - next.length;
}

/** Hydrate → repair → drop leftovers. Returns remaining item count with real prices. */
export async function ensureCaseCartPrices(): Promise<{
  repaired: number;
  dropped: number;
  itemCount: number;
  subtotal: number;
}> {
  await waitForCaseCartHydration();
  // Recover unit price from line.total when price was saved as 0
  healPricesFromLineTotals();
  const repaired = await repairCaseCartZeroPrices();
  // Only drop lines that still have no price AND no usable total
  const dropped = dropZeroPriceCartLines();
  const items = useCaseCartStore.getState().items;
  const subtotal = items.reduce((s, i) => s + Number(i.price) * Number(i.quantity || 1), 0);
  if (__DEV__) {
    console.log('[cart] ensureCaseCartPrices', {
      repaired,
      dropped,
      itemCount: items.length,
      subtotal,
      lines: items.map((i) => ({
        name: i.itemName,
        price: i.price,
        total: i.total,
        qty: i.quantity,
      })),
    });
  }
  return { repaired, dropped, itemCount: items.length, subtotal };
}
