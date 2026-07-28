/**
 * Dev performance timers — always show load times so you can compare
 * 1st open (network) vs 2nd open (cache).
 */

import { useLayoutEffect, useRef } from 'react';

/**
 * Quiet mode — keeps every raw Date.now()/performance.now() delta and the
 * [GAP] afterParse verdict (the number under test), but silences the
 * high-volume chatter logs. Used to isolate whether afterParse gaps are real
 * JS-thread render cost or partly an artifact of the logging volume itself.
 * Requires a full Metro restart to take effect (EXPO_PUBLIC_* is baked at build time).
 */
const PERF_QUIET = process.env.EXPO_PUBLIC_PERF_QUIET === '1';

const _pendingRequests = new Map<string, number>();
/** Per-query visit counters: 1 = cold/first, 2+ = later */
const _queryVisits = new Map<string, number>();
const _queryFetchStart = new Map<string, number>();

type ApiSplitRecord = {
  path: string;
  method: string;
  /** When Response headers arrived (before body read / JSON.parse) */
  rawAt: number;
  /** When apiFetch returned parsed JSON to the caller */
  doneAt: number;
  authMs: number;
  networkMs: number;
  bodyMs: number;
  parseMs: number;
  bytes: number;
  status: number;
};

/** Recent completed apiFetch splits — used to compare vs React Query resolve. */
const _recentApiSplits: ApiSplitRecord[] = [];
const RECENT_API_KEEP = 30;

function nowMs() {
  return typeof performance !== 'undefined' && performance.now
    ? performance.now()
    : Date.now();
}

function iconFor(ms: number) {
  if (ms > 3000) return '🔴';
  if (ms > 1000) return '🟠';
  if (ms > 500) return '🟡';
  return '🟢';
}

function nth(n: number) {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

export function perfStart(label: string): string {
  if (!__DEV__) return '';
  const id = `${label}__${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  _pendingRequests.set(id, nowMs());
  return id;
}

export function perfEnd(id: string, status = 200): void {
  if (!__DEV__ || !id) return;
  const start = _pendingRequests.get(id);
  if (start == null) return;
  _pendingRequests.delete(id);

  const ms = Math.round(nowMs() - start);
  const label = id.replace(/__\d+_[a-z0-9]+$/i, '').replace(/__\d+$/, '');
  if (!PERF_QUIET) {
    console.log(`${iconFor(ms)} [API] ${label} → ${ms}ms  (HTTP ${status})`);
  }
}

/**
 * Record one apiFetch split so QUERY resolve can measure post-response gap.
 */
export function perfRecordApiSplit(
  rec: Omit<ApiSplitRecord, 'rawAt' | 'doneAt'> & {
    rawAt?: number;
    doneAt?: number;
  },
): void {
  if (!__DEV__) return;
  const rawAt = rec.rawAt ?? nowMs();
  const doneAt = rec.doneAt ?? nowMs();
  const full: ApiSplitRecord = { ...rec, rawAt, doneAt };
  _recentApiSplits.push(full);
  while (_recentApiSplits.length > RECENT_API_KEEP) _recentApiSplits.shift();

  if (!PERF_QUIET) {
    const total = rec.authMs + rec.networkMs + rec.bodyMs + rec.parseMs;
    console.log(
      `${iconFor(total)} [API-SPLIT] ${rec.method} ${rec.path} ` +
        `auth=${rec.authMs}ms · network(headers)=${rec.networkMs}ms · body=${rec.bodyMs}ms (${rec.bytes}B) · parse=${rec.parseMs}ms · total=${total}ms · HTTP ${rec.status}`,
    );
  }
}

/** Manual mark for screen / bootstrap blocks */
export function perfMark(label: string, ms: number, detail?: string): void {
  if (!__DEV__ || PERF_QUIET) return;
  const extra = detail ? ` · ${detail}` : '';
  console.log(`${iconFor(ms)} [LOAD] ${label} → ${ms}ms${extra}`);
}

export function perfScreen(name: string): () => void {
  if (!__DEV__ || PERF_QUIET) return () => {};
  const t0 = nowMs();
  console.log(`📱 [SCREEN] ${name} mounting…`);
  return () => {
    console.log(`📱 [SCREEN] ${name} unmounted after ${Math.round(nowMs() - t0)}ms`);
  };
}

const _renderCounts = new Map<string, number>();

export function perfRender(name: string): void {
  if (!__DEV__ || PERF_QUIET) return;
  const count = (_renderCounts.get(name) ?? 0) + 1;
  _renderCounts.set(name, count);
  if (count > 1 && count % 5 === 0) {
    console.log(`🔄 [RENDER] ${name} re-rendered × ${count}`);
  }
}

/**
 * Logs query load timing + gap vs raw apiFetch so we can tell
 * network transit vs post-response client work.
 */
export function usePerfQuery(name: string, isFetching: boolean, dataUpdatedAt: number): void {
  const lastKey = useRef('');
  const sawData = useRef(false);

  // useLayoutEffect: fires right after commit (tighter than useEffect).
  useLayoutEffect(() => {
    if (!__DEV__) return;

    if (isFetching) {
      if (!_queryFetchStart.has(name)) {
        _queryFetchStart.set(name, nowMs());
        const visit = (_queryVisits.get(name) ?? 0) + 1;
        _queryVisits.set(name, visit);
        if (!PERF_QUIET) {
          console.log(`⏱️ [QUERY] ${name} → fetching… (${nth(visit)} load)`);
        }
      }
      lastKey.current = `fetching:${dataUpdatedAt}`;
      return;
    }

    const started = _queryFetchStart.get(name);
    if (started != null) {
      const resolvedAt = nowMs();
      const ms = Math.round(resolvedAt - started);
      _queryFetchStart.delete(name);
      const visit = _queryVisits.get(name) ?? 1;
      const which =
        visit === 1 ? '1st load · NETWORK' : `${nth(visit)} load · NETWORK refresh`;
      if (!PERF_QUIET) {
        console.log(`${iconFor(ms)} [QUERY] ${name} → ${ms}ms (${which})`);
      }

      const during = _recentApiSplits.filter(
        (a) => a.doneAt >= started - 50 && a.doneAt <= resolvedAt + 50,
      );
      if (during.length) {
        const last = during[during.length - 1]!;
        const untilRawMs = Math.round(last.rawAt - started);
        const afterRawMs = Math.round(resolvedAt - last.rawAt);
        const afterDoneMs = Math.round(resolvedAt - last.doneAt);
        let verdict = '→ mostly in-network / apiFetch';
        if (afterDoneMs > 200) {
          verdict = '→ delay AFTER response parsed (React Query / JS thread)';
        } else if (afterRawMs > last.bodyMs + last.parseMs + 200) {
          verdict = '→ delay AFTER headers (body/parse/JS)';
        } else if (untilRawMs > last.networkMs + last.authMs + 500) {
          verdict = '→ delay BEFORE/DURING network (queue or transit)';
        }
        console.log(
          `📐 [GAP] ${name} vs last API ${last.method} ${last.path}: ` +
            `queryWall=${ms}ms · untilHeaders=${untilRawMs}ms · afterHeaders=${afterRawMs}ms · afterParse=${afterDoneMs}ms ${verdict}`,
        );
      }

      sawData.current = dataUpdatedAt > 0;
      lastKey.current = `done:${dataUpdatedAt}`;
      return;
    }

    const key = `cache:${dataUpdatedAt}`;
    if (dataUpdatedAt > 0 && key !== lastKey.current) {
      lastKey.current = key;
      const visit = (_queryVisits.get(name) ?? 0) + 1;
      _queryVisits.set(name, visit);
      const ageMs = Date.now() - dataUpdatedAt;
      if (!PERF_QUIET) {
        console.log(
          `🟢 [QUERY] ${name} → 0ms (${nth(visit)} open · CACHE, ${Math.round(ageMs / 1000)}s old)`,
        );
      }
      sawData.current = true;
    }
  }, [name, isFetching, dataUpdatedAt]);
}

/** @deprecated Prefer usePerfQuery — this no longer logs on every render. */
export function perfQuery(name: string, isFetching: boolean, dataUpdatedAt: number): void {
  void name;
  void isFetching;
  void dataUpdatedAt;
}

const _blockStarts = new Map<string, number>();

export function perfBlockStart(name: string): void {
  if (!__DEV__) return;
  if (_blockStarts.has(name)) return;
  _blockStarts.set(name, nowMs());
  if (!PERF_QUIET) {
    console.log(`⏱️ [BLOCK] ${name} started (waiting for data…)`);
  }
}

export function perfBlockEnd(name: string, detail?: string): void {
  if (!__DEV__) return;
  const start = _blockStarts.get(name);
  if (start == null) return;
  _blockStarts.delete(name);
  const ms = Math.round(nowMs() - start);
  perfMark(name, ms, detail ?? 'ready');
}
