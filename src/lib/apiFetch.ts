import { getApiUrl } from '@/config/env';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '@/lib/storage';

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

type ApiError = Error & { status?: number; data?: unknown };

let refreshPromise: Promise<string | null> | null = null;

async function doFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err: any) {
    const errMsg = String(err?.message ?? err);
    const isNetworkErr =
      errMsg.includes('NoRouteToHostException') ||
      errMsg.includes('Host unreachable') ||
      errMsg.includes('Network request failed') ||
      errMsg.includes('Failed to connect');

    if (isNetworkErr && __DEV__ && !url.includes('localhost') && !url.includes('127.0.0.1')) {
      const fallbackUrl = url.replace(/http:\/\/[^/]+:5000/, 'http://localhost:5000');
      console.warn(`[apiFetch] Primary host unreachable (${url}). Retrying over USB ADB reverse (${fallbackUrl})...`);
      return await fetch(fallbackUrl, init);
    }
    throw err;
  }
}

async function refreshTokens(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await doFetch(`${getApiUrl()}/auth/refresh-token`, {
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

export async function apiFetch<T = any>(path: string, init?: RequestInit & { _retry?: boolean }): Promise<T> {
  const url = path.startsWith('http') ? path : `${getApiUrl()}${path}`;
  const headers = new Headers(init?.headers ?? {});
  if (!headers.has('Content-Type') && init?.body) headers.set('Content-Type', 'application/json');

  const accessToken = await getAccessToken();
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const res = await doFetch(url, { ...init, headers });

  // Non-401: just return / throw
  if (res.status !== 401) {
    const text = await res.text();
    const data = text ? (JSON.parse(text) as Json) : null;
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
  if (!retryHeaders.has('Content-Type') && init?.body) retryHeaders.set('Content-Type', 'application/json');
  retryHeaders.set('Authorization', `Bearer ${newAccessToken}`);
  const retryRes = await doFetch(url, { ...init, headers: retryHeaders, _retry: true } as any);
  const retryText = await retryRes.text();
  const retryData = retryText ? (JSON.parse(retryText) as Json) : null;
  if (!retryRes.ok) {
    const err = new Error((retryData as any)?.message ?? `Request failed: ${retryRes.status}`) as ApiError;
    err.status = retryRes.status;
    err.data = retryData;
    throw err;
  }
  return retryData as T;
}

