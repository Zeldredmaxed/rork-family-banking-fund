import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

/**
 * API Base URL — Railway Production
 */
const API_BASE_URL = 'https://web-production-085b1.up.railway.app';

const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

const AUTH_ENDPOINTS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
];

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Token Management ──────────────────────────────────────────────

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  try {
    if (!token || typeof token !== 'string') {
      console.log('[api-client] setToken called with invalid value:', token);
      return;
    }
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    console.log('[api-client] Access token stored successfully');
  } catch (e) {
    console.log('[api-client] Failed to store access token:', e);
  }
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function setRefreshToken(token: string): Promise<void> {
  try {
    if (!token || typeof token !== 'string') {
      console.log('[api-client] setRefreshToken called with invalid value:', token);
      return;
    }
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
    console.log('[api-client] Refresh token stored successfully');
  } catch (e) {
    console.log('[api-client] Failed to store refresh token:', e);
  }
}

export async function clearTokens(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync('member_id');
    await SecureStore.deleteItemAsync('member_name');
    await SecureStore.deleteItemAsync('is_board_member');
    await SecureStore.deleteItemAsync('is_admin');
    console.log('[api-client] All tokens cleared');
  } catch (e) {
    console.log('[api-client] Error clearing tokens:', e);
  }
}

// ─── Request Interceptor ───────────────────────────────────────────

function isAuthEndpoint(url?: string): boolean {
  if (!url) return false;
  return AUTH_ENDPOINTS.some((ep) => url.includes(ep));
}

api.interceptors.request.use(
  async (config) => {
    if (!isAuthEndpoint(config.url)) {
      const token = await getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response Interceptor (401 refresh) ─────────────────────────────

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint(originalRequest.url)
    ) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshSubscribers.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) {
          await clearTokens();
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token: newRefreshToken } = response.data;
        await setToken(access_token);
        await setRefreshToken(newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        onRefreshed(access_token);

        return api(originalRequest);
      } catch (refreshError) {
        await clearTokens();
        refreshSubscribers = [];
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export { API_BASE_URL };
export default api;
