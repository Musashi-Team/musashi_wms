import axios from 'axios';

const API = import.meta.env.VITE_API_URL || '/api';

let accessToken = null;
const REFRESH_KEY = 'wms_refresh';

export const setAccessToken = (t) => {
  accessToken = t;
};
export const getRefresh = () => sessionStorage.getItem(REFRESH_KEY);
export const setRefresh = (t) => (t ? sessionStorage.setItem(REFRESH_KEY, t) : sessionStorage.removeItem(REFRESH_KEY));
export const clearAuth = () => {
  accessToken = null;
  setRefresh(null);
};

const api = axios.create({ baseURL: API });

api.interceptors.request.use((cfg) => {
  if (accessToken) cfg.headers.Authorization = `Bearer ${accessToken}`;
  return cfg;
});

let refreshing = null;
export function refreshAccess() {
  const refresh = getRefresh();
  if (!refresh) return Promise.reject(new Error('no refresh token'));
  if (!refreshing) {
    refreshing = axios
      .post(`${API}/auth/refresh/`, { refresh })
      .then((r) => {
        accessToken = r.data.access;
        if (r.data.refresh) setRefresh(r.data.refresh);
        return r.data.access;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const original = err.config;
    const url = original?.url || '';
    if (err.response?.status === 401 && !original._retry && !url.includes('/auth/login') && !url.includes('/auth/refresh')) {
      original._retry = true;
      try {
        const token = await refreshAccess();
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        clearAuth();
        window.dispatchEvent(new Event('wms:logout'));
      }
    }
    return Promise.reject(err);
  }
);

export function errMsg(err) {
  const data = err?.response?.data;
  if (!data) return err?.message || 'Terjadi kesalahan jaringan.';
  if (typeof data === 'string') return 'Terjadi kesalahan pada server.';
  if (data.detail) return data.detail;
  return Object.entries(data)
    .map(([k, v]) => `${k === 'non_field_errors' ? '' : k + ': '}${Array.isArray(v) ? v.join(' ') : typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join(' | ');
}

export function fieldErrors(err) {
  const data = err?.response?.data;
  if (!data || typeof data !== 'object') return {};
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? v.join(' ') : typeof v === 'string' ? v : ''])
  );
}

export const notifyChange = () => window.dispatchEvent(new Event('wms:data-changed'));

export default api;
