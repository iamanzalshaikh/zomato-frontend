/**
 * ⚡ QuickBite Performance Logger
 * Measures API response times, screen mount durations, and render counts.
 * All logs are DEV-only and produce zero overhead in production builds.
 */

import { useEffect, useRef } from 'react';

// ─── API Timing ────────────────────────────────────────────────────────────

const _pendingRequests = new Map<string, number>();

/**
 * Call at the START of every API request.
 * Returns a unique requestId to pass to perfEnd().
 */
export function perfStart(label: string): string {
  if (!__DEV__) return '';
  const id = `${label}__${Date.now()}`;
  _pendingRequests.set(id, performance.now());
  return id;
}

/**
 * Call at the END of every API request.
 * Logs the elapsed time with colour-coded severity.
 */
export function perfEnd(id: string, status = 200): void {
  if (!__DEV__ || !id) return;
  const start = _pendingRequests.get(id);
  if (start == null) return;
  _pendingRequests.delete(id);

  const ms = Math.round(performance.now() - start);
  const label = id.replace(/__\d+$/, '');

  let icon = '🟢'; // fast  < 300 ms
  if (ms > 1000) icon = '🔴';      // slow  > 1 s
  else if (ms > 500) icon = '🟠';  // warn  > 500 ms

  console.log(`${icon} [PERF] ${label} → ${ms}ms  (HTTP ${status})`);
}

// ─── Screen Mount Timer ────────────────────────────────────────────────────

/**
 * Returns a cleanup function. Call inside useEffect(() => { return perfScreen('ScreenName'); }, [])
 * Logs how long it took for the screen's first useEffect to fire (i.e. mount time).
 */
export function perfScreen(name: string): () => void {
  if (!__DEV__) return () => {};
  const t0 = performance.now();
  console.log(`📱 [SCREEN] ${name} mounting...`);
  const ms = Math.round(performance.now() - t0);
  console.log(`📱 [SCREEN] ${name} mounted in ${ms}ms`);
  return () => {
    console.log(`📱 [SCREEN] ${name} unmounted`);
  };
}

// ─── Render Counter ────────────────────────────────────────────────────────

const _renderCounts = new Map<string, number>();

/**
 * Call at the TOP of any component to log how many times it re-renders.
 * Usage: perfRender('RestaurantItem')
 */
export function perfRender(name: string): void {
  if (!__DEV__) return;
  const count = (_renderCounts.get(name) ?? 0) + 1;
  _renderCounts.set(name, count);
  if (count > 1) {
    // Only log re-renders (count > 1) to reduce noise
    console.log(`🔄 [RENDER] ${name} re-rendered × ${count}`);
  }
}

// ─── Query Cache Inspector ─────────────────────────────────────────────────

/**
 * Logs query cache/network status once per fetch cycle (not every re-render).
 */
export function usePerfQuery(name: string, isFetching: boolean, dataUpdatedAt: number): void {
  const lastKey = useRef('');

  useEffect(() => {
    if (!__DEV__) return;
    const key = `${isFetching}:${dataUpdatedAt}`;
    if (key === lastKey.current) return;
    lastKey.current = key;

    const ageMs = dataUpdatedAt > 0 ? Date.now() - dataUpdatedAt : 0;
    const source = isFetching
      ? '🌐 NETWORK'
      : dataUpdatedAt > 0
        ? `💾 CACHE (${Math.round(ageMs / 1000)}s old)`
        : '🆕 INITIAL';
    console.log(`📊 [QUERY] ${name} → ${source}`);
  }, [name, isFetching, dataUpdatedAt]);
}

/** @deprecated Prefer usePerfQuery in query hooks */
export function perfQuery(name: string, isFetching: boolean, dataUpdatedAt: number): void {
  if (!__DEV__) return;
  const ageMs = dataUpdatedAt > 0 ? Date.now() - dataUpdatedAt : 0;
  const source = isFetching
    ? '🌐 NETWORK'
    : dataUpdatedAt > 0
      ? `💾 CACHE (${Math.round(ageMs / 1000)}s old)`
      : '🆕 INITIAL';
  console.log(`📊 [QUERY] ${name} → ${source}`);
}
