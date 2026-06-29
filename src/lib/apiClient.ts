import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

import { getApiUrl } from '@/config/env';
import { refreshAccessToken } from '@/lib/tokenRefresh';
import { clearTokens, getAccessToken } from '@/lib/storage';
import { perfStart, perfEnd } from '@/lib/perf';

type RetryConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _skipAuthRefresh?: boolean;
  _perfId?: string;  // perf tracking id
};

// eslint-disable-next-line import/no-named-as-default-member
export const api: AxiosInstance = axios.create({
  headers: {
    'Content-Type': 'application/json',
    'Connection': 'keep-alive',
  },
  timeout: 30000,
});

let refreshPromise: Promise<string | null> | null = null;

function isAuthEndpoint(url?: string): boolean {
  if (!url) return false;
  return url.includes('/auth/login') || url.includes('/auth/verify-otp') || url.includes('/auth/send-otp');
}

api.interceptors.request.use(
  async (config) => {
    const retryConfig = config as RetryConfig;
    config.baseURL = getApiUrl();
    const token = await getAccessToken();
    if (__DEV__) {
      const label = `${String(config.method).toUpperCase()} ${config.url ?? ''}`;
      console.log(`🌐 [API] ${label}`);
      // Start perf timer — stored on config so response interceptor can read it
      retryConfig._perfId = perfStart(label);
    }
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
    return retryConfig;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      const cfg = response.config as RetryConfig;
      perfEnd(cfg._perfId ?? '', response.status);
      console.log(`✅ [API] ${response.status} ${response.config.url ?? ''}`);
    }
    return response;
  },
  async (error: AxiosError) => {
    const status = error.response?.status;
    const config = (error.config ?? {}) as RetryConfig;

    if (__DEV__) {
      perfEnd(config._perfId ?? '', status ?? 0);
      console.log(`❌ [API] ${status ?? 'NO_STATUS'} ${config.url ?? ''}`, {
        message: error.message,
        data: error.response?.data,
      });
    }

    if (status !== 401 || config._retry || config._skipAuthRefresh || isAuthEndpoint(config.url)) {
      return Promise.reject(error);
    }

    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }

    const newAccessToken = await refreshPromise;
    if (!newAccessToken) {
      await clearTokens();
      return Promise.reject(error);
    }

    config._retry = true;
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${newAccessToken}`;
    return api.request(config);
  },
);
