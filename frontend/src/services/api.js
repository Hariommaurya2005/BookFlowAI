import axios from 'axios';
import { clearTokens, getToken, isRememberedSession, setTokens } from './tokenStorage';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = getToken('accessToken');
  const isPublicBookingRequest = String(config.url || '').startsWith('/public/booking/');
  // Public customer booking must remain usable without a signed-in BookFlow account.
  if (token && !isPublicBookingRequest) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config || {};
    const responseMessage = error.response?.data?.message || '';
    const workEmailPolicyError = error.response?.status === 403 && /personal email provider|work email|organization domain/i.test(responseMessage);
    if (workEmailPolicyError) {
      clearTokens();
      const isPublicBookingPage = window.location.pathname.startsWith('/book/') || window.location.pathname.startsWith('/booking/manage');
      if (window.location.pathname !== '/login' && !isPublicBookingPage) window.location.href = '/login';
    }
    const url = String(original.url || '');
    const isAuthEndpoint = /\/auth\/(login|register|refresh-token|forgot-password|reset-password|verify-email)/.test(url);
    const isPublicBookingApi = url.startsWith('/public/booking/');
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint && !isPublicBookingApi) {
      original._retry = true;
      try {
        const refreshToken = getToken('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken }, { timeout: 20000 });
        setTokens(data.data, isRememberedSession());
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        clearTokens();
        const isPublicBookingPage = window.location.pathname.startsWith('/book/') || window.location.pathname.startsWith('/booking/manage');
        if (!window.location.pathname.startsWith('/login') && !isPublicBookingPage) window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
