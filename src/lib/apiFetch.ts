import { getApiUrl } from '@/config/env';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '@/lib/storage';
import { perfRecordApiSplit } from '@/lib/perf';

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

type ApiError = Error & { status?: number; data?: unknown };

let refreshPromise: Promise<string | null> | null = null;
let activeApiUrl: string | null = null;
/** See perf.ts — silences chatter logs while keeping every raw timing delta. */
const PERF_QUIET = process.env.EXPO_PUBLIC_PERF_QUIET === '1';

function nowMs() {
  return typeof performance !== 'undefined' && performance.now
    ? performance.now()
    : Date.now();
}

async function doFetch(url: string, init?: RequestInit): Promise<Response> {
  const isDevLAN = __DEV__ && !url.includes('localhost') && !url.includes('127.0.0.1');
  // Place-order does DB + push + email; 1.5s was aborting real requests mid-flight
  // (server logged `POST /orders/case` with status `-`, client saw a network error).
  const REQUEST_TIMEOUT_MS = isDevLAN ? 30_000 : 12_000;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        ...init,
        signal: init?.signal ?? controller.signal,
      });
      clearTimeout(timeoutId);
      if (isDevLAN) {
        const apiUrl = getApiUrl();
        if (url.startsWith(apiUrl)) {
          activeApiUrl = apiUrl;
        }
      } else if (__DEV__ && url.includes('localhost:5000/api/v1')) {
        activeApiUrl = getApiUrl().replace(
          /http:\/\/[^/]+:5000\/api\/v1/,
          'http://localhost:5000/api/v1',
        );
      }
      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  } catch (err: any) {
    const errMsg = String(err?.message ?? err);
    const isTimeoutOrNetwork =
      err.name === 'AbortError' ||
      errMsg.includes('NoRouteToHostException') ||
      errMsg.includes('Host unreachable') ||
      errMsg.includes('Network request failed') ||
      errMsg.includes('Failed to connect');

    if (isTimeoutOrNetwork && __DEV__ && !url.includes('localhost') && !url.includes('127.0.0.1')) {
      const fallbackUrl = url.replace(/http:\/\/[^/]+:5000/, 'http://localhost:5000');
      if (process.env.EXPO_PUBLIC_PERF_VERBOSE === '1') {
        console.warn(
          `[apiFetch] Primary host unreachable or timed out (${url}). Retrying over USB ADB reverse (${fallbackUrl})...`,
        );
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30_000);
      try {
        const response = await fetch(fallbackUrl, {
          ...init,
          signal: init?.signal ?? controller.signal,
        });
        clearTimeout(timeoutId);
        activeApiUrl = getApiUrl().replace(
          /http:\/\/[^/]+:5000\/api\/v1/,
          'http://localhost:5000/api/v1',
        );
        return response;
      } catch (fallbackErr) {
        clearTimeout(timeoutId);
        throw fallbackErr;
      }
    }
    throw err;
  }
}

async function refreshTokens(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const baseApiUrl = (__DEV__ && activeApiUrl) ? activeApiUrl : getApiUrl();
    const res = await doFetch(`${baseApiUrl}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as any;
    const data = body?.data;
    if (!data?.accessToken || !data?.refreshToken) return null;
    await setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    return data.accessToken as string;
  } catch {
    return null;
  }
}

function isAuthPath(path: string) {
  return path.startsWith('/auth/');
}

async function readAndParse(
  res: Response,
  tHeaders: number,
): Promise<{
  data: Json;
  bodyMs: number;
  parseMs: number;
  bytes: number;
  rawAt: number;
  doneAt: number;
}> {
  const rawAt = tHeaders;
  const tBody0 = nowMs();
  const text = await res.text();
  const tBody1 = nowMs();
  const bodyMs = Math.round(tBody1 - tBody0);
  const bytes = typeof text === 'string' ? text.length : 0;

  const tParse0 = nowMs();
  const data = text ? (JSON.parse(text) as Json) : null;
  const tParse1 = nowMs();
  const parseMs = Math.round(tParse1 - tParse0);

  return { data, bodyMs, parseMs, bytes, rawAt, doneAt: tParse1 };
}

export async function apiFetch<T = any>(
  path: string,
  init?: RequestInit & { _retry?: boolean },
): Promise<T> {
  const tAll0 = nowMs();
  const baseApiUrl = (__DEV__ && activeApiUrl) ? activeApiUrl : getApiUrl();
  const url = path.startsWith('http') ? path : `${baseApiUrl}${path}`;
  const headers = new Headers(init?.headers ?? {});
  if (!headers.has('Content-Type') && init?.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const tAuth0 = nowMs();
  const accessToken = await getAccessToken();
  const authMs = Math.round(nowMs() - tAuth0);
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const method = String(init?.method ?? 'GET').toUpperCase();
  const shortPath = path.startsWith('http') ? path.replace(/^https?:\/\/[^/]+/, '') : path;

  if (__DEV__ && !PERF_QUIET) {
    console.log(`🚀 [API-START] ${method} ${shortPath}`);
  }

  const tNet0 = nowMs();
  const res = await doFetch(url, { ...init, headers });
  const tHeaders = nowMs();
  const networkMs = Math.round(tHeaders - tNet0);

  // Headers received = raw response in hand; body not downloaded/parsed yet.
  if (__DEV__ && !PERF_QUIET) {
    console.log(
      `📡 [API-HEADERS] ${method} ${shortPath} → headers after ${networkMs}ms (HTTP ${res.status}) — body not read yet`,
    );
  }

  // Non-401: read body + parse, then return / throw
  if (res.status !== 401) {
    const { data, bodyMs, parseMs, bytes, rawAt, doneAt } = await readAndParse(res, tHeaders);
    if (__DEV__) {
      const total = Math.round(nowMs() - tAll0);
      const icon = total > 3000 ? '🔴' : total > 1000 ? '🟠' : total > 500 ? '🟡' : '🟢';
      if (!PERF_QUIET) {
        console.log(`${icon} [API] ${method} ${shortPath} → ${total}ms  (HTTP ${res.status})`);
      }
      perfRecordApiSplit({
        path: shortPath,
        method,
        authMs,
        networkMs,
        bodyMs,
        parseMs,
        bytes,
        status: res.status,
        rawAt,
        doneAt,
      });
    }
    if (!res.ok) {
      const err = new Error((data as any)?.message ?? `Request failed: ${res.status}`) as ApiError;
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data as T;
  }

  // 401 handling: do not refresh on auth endpoints or retries
  if (init?._retry || isAuthPath(path)) {
    if (__DEV__ && !PERF_QUIET) {
      const ms = Math.round(nowMs() - tAll0);
      console.log(`🔴 [API] ${method} ${shortPath} → ${ms}ms  (HTTP 401)`);
    }
    const err = new Error('Unauthorized') as ApiError;
    err.status = 401;
    throw err;
  }

  if (!refreshPromise) {
    refreshPromise = refreshTokens().finally(() => {
      refreshPromise = null;
    });
  }
  const newAccessToken = await refreshPromise;
  if (!newAccessToken) {
    await clearTokens();
    const err = new Error('Session expired') as ApiError;
    err.status = 401;
    throw err;
  }

  const retryHeaders = new Headers(init?.headers ?? {});
  if (!retryHeaders.has('Content-Type') && init?.body && !(init.body instanceof FormData)) {
    retryHeaders.set('Content-Type', 'application/json');
  }
  retryHeaders.set('Authorization', `Bearer ${newAccessToken}`);

  const tNetRetry0 = nowMs();
  const retryRes = await doFetch(url, { ...init, headers: retryHeaders, _retry: true } as any);
  const tRetryHeaders = nowMs();
  const retryNetworkMs = Math.round(tRetryHeaders - tNetRetry0);

  if (__DEV__ && !PERF_QUIET) {
    console.log(
      `📡 [API-HEADERS] ${method} ${shortPath} → headers after ${retryNetworkMs}ms (HTTP ${retryRes.status}, after refresh)`,
    );
  }

  const { data: retryData, bodyMs, parseMs, bytes, rawAt, doneAt } = await readAndParse(
    retryRes,
    tRetryHeaders,
  );
  if (__DEV__) {
    const ms = Math.round(nowMs() - tAll0);
    const icon = ms > 3000 ? '🔴' : ms > 1000 ? '🟠' : ms > 500 ? '🟡' : '🟢';
    if (!PERF_QUIET) {
      console.log(
        `${icon} [API] ${method} ${shortPath} → ${ms}ms  (HTTP ${retryRes.status}, after refresh)`,
      );
    }
    perfRecordApiSplit({
      path: shortPath,
      method,
      authMs,
      networkMs: retryNetworkMs,
      bodyMs,
      parseMs,
      bytes,
      status: retryRes.status,
      rawAt,
      doneAt,
    });
  }
  if (!retryRes.ok) {
    const err = new Error(
      (retryData as any)?.message ?? `Request failed: ${retryRes.status}`,
    ) as ApiError;
    err.status = retryRes.status;
    err.data = retryData;
    throw err;
  }
  return retryData as T;
}
