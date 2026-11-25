import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';

const FacilityContext = createContext(null);
export const useFacility = () => useContext(FacilityContext);

/** Menyimpan warehouse/facility yang sedang dipilih. Semua halaman memfilter data dengan warehouseId ini. */
export function FacilityProvider({ children }) {
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState(() => localStorage.getItem('wms_warehouse') || '');
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    const { data } = await api.get('/warehouses/', { params: { page_size: 200, is_active: true } });
    setWarehouses(data.results);
    setWarehouseId((cur) => {
      const valid = data.results.find((w) => String(w.id) === String(cur));
      const next = valid ? String(valid.id) : data.results[0] ? String(data.results[0].id) : '';
      localStorage.setItem('wms_warehouse', next);
      return next;
    });
    setReady(true);
  }, []);

  useEffect(() => {
    if (user) reload().catch(() => setReady(true));
  }, [user, reload]);

  const select = (id) => {
    localStorage.setItem('wms_warehouse', String(id));
    setWarehouseId(String(id));
  };

  const current = warehouses.find((w) => String(w.id) === String(warehouseId)) || null;

  return (
    <FacilityContext.Provider value={{ warehouses, warehouseId, current, select, reload, ready }}>
      {children}
    </FacilityContext.Provider>
  );
}
