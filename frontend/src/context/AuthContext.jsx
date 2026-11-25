import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { clearAuth, getRefresh, refreshAccess, setAccessToken, setRefresh } from '../api/client';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Saat aplikasi dibuka: jika ada refresh token, pulihkan sesi.
  useEffect(() => {
    let active = true;
    (async () => {
      if (getRefresh()) {
        try {
          await refreshAccess();
          const { data } = await api.get('/auth/me/');
          if (active) setUser(data);
        } catch {
          clearAuth();
        }
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Dipicu interceptor saat refresh gagal (sesi habis)
  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('wms:logout', onLogout);
    return () => window.removeEventListener('wms:logout', onLogout);
  }, []);

  const login = useCallback(async (username, password) => {
    const { data } = await api.post('/auth/login/', { username, password });
    setAccessToken(data.access);
    setRefresh(data.refresh);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    const refresh = getRefresh();
    try {
      if (refresh) await api.post('/auth/logout/', { refresh });
    } catch {
      /* abaikan: token tetap dihapus di sisi klien */
    }
    clearAuth();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await api.get('/auth/me/');
    setUser(data);
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>{children}</AuthContext.Provider>;
}
