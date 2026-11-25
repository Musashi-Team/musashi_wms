import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import api from '../api/client';
import { useFacility } from '../context/FacilityContext';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { Spinner } from './ui';


export default function Layout() {
  const { warehouseId, current, ready } = useFacility();
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!warehouseId) return undefined;
    const load = () =>
      api
        .get('/dashboard/stats/', { params: { warehouse: warehouseId } })
        .then((r) => setActive(r.data.work_orders.active))
        .catch(() => {});
    load();
    window.addEventListener('wms:data-changed', load);
    return () => window.removeEventListener('wms:data-changed', load);
  }, [warehouseId]);

  return (
    <div className="min-h-screen">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} activeWorkOrders={active} />
      <div className="lg:pl-64">
        <Navbar onMenu={() => setMenuOpen(true)} />
        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
          {!ready ? (
            <div className="flex justify-center py-20">
              <Spinner />
            </div>
          ) : !current ? (
            <div className="card p-8 text-center text-sm text-ink-soft">
              Belum ada warehouse. Buat warehouse terlebih dahulu di menu Settings.
            </div>
          ) : (
            <Outlet />
          )}
        </main>
        <footer className="flex flex-wrap justify-between gap-2 px-6 pb-6 text-[11px] text-ink-muted">
          <span>Last synced: {new Date().toLocaleString('en-GB')}</span>
          <span>Musashi - Warehouse Maintenance System</span>
        </footer>
      </div>
    </div>
  );
}
