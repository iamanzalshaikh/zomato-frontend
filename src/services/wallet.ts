import { apiFetch } from '@/lib/apiFetch';

export async function fetchWallet() {
  try {
    const body = await apiFetch('/wallet');
    const data = (body as any)?.data ?? body;
    return {
      balance: Number(data?.balance ?? data?.walletBalance ?? 0),
      walletBalance: Number(data?.balance ?? data?.walletBalance ?? 0),
      walletHoldOverride: Boolean(data?.walletHoldOverride),
      transactions: data?.transactions ?? [],
      ...data,
    };
  } catch {
    const body = await apiFetch('/users/wallet');
    const data = (body as any)?.data?.wallet ?? (body as any)?.data ?? {};
    return {
      balance: Number(data?.balance ?? data?.walletBalance ?? 0),
      walletBalance: Number(data?.balance ?? data?.walletBalance ?? 0),
      ...data,
    };
  }
}

export async function fetchWalletTransactions(page = 1, limit = 20) {
  try {
    const qs = `?${new URLSearchParams({ page: String(page), limit: String(limit) })}`;
    const body = await apiFetch(`/users/wallet/transactions${qs}`);
    return (body as any)?.data?.transactions ?? (body as any)?.data ?? [];
  } catch {
    return [];
  }
}
