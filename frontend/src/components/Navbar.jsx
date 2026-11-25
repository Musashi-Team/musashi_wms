import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, Search, User } from 'lucide-react';
import api, { notifyChange } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useFacility } from '../context/FacilityContext';
import { ROLE_LABELS } from '../utils/permissions';
import { fmtDateTime } from '../utils/format';

const TITLES = {
  '/': 'Dashboard',
  '/assets': 'Assets',
  '/work-orders': 'Work Orders',
  '/maintenance': 'Maintenance Plan',
  '/inventory': 'Inventory',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/help': 'Help Center',
};

const LEVEL_DOT = { danger: 'bg-brand-500', warning: 'bg-amber-400', info: 'bg-blue-500' };

function useOutsideClose(ref, onClose) {
  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && onClose();
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, onClose]);
}

function LanguageToggle({ lang, setLang }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-ink-line bg-page p-0.5 text-xs font-semibold">
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`rounded-md px-2 py-1 transition ${
          lang === 'en' ? 'bg-brand-500 text-white' : 'text-ink-soft hover:text-ink'
        }`}
      >
        ENG
      </button>
      <button
        type="button"
        onClick={() => setLang('id')}
        className={`rounded-md px-2 py-1 transition ${
          lang === 'id' ? 'bg-brand-500 text-white' : 'text-ink-soft hover:text-ink'
        }`}
      >
        IND
      </button>
    </div>
  );
}

function Notifications() {
  const { warehouseId } = useFacility();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const ref = useRef(null);
  useOutsideClose(ref, () => setOpen(false));

  const load = async () => {
    try {
      const { data } = await api.get('/notifications/', { params: { page_size: 10, warehouse: warehouseId || undefined } });
      setItems(data.results);
    } catch {
    }
  };
  useEffect(() => {
    load();
    window.addEventListener('wms:data-changed', load);
    return () => window.removeEventListener('wms:data-changed', load);
  }, [warehouseId]);

  const unread = items.filter((n) => !n.is_read).length;
  const markAll = async () => {
    await api.post('/notifications/read-all/');
    load();
  };
  const markOne = async (n) => {
    if (!n.is_read) {
      await api.post(`/notifications/${n.id}/read/`);
      load();
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="relative rounded-lg p-2 text-ink-soft hover:bg-page" aria-label="Notifications">
        <Bell size={19} />
        {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-500" />}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-1.5rem)] rounded-xl border border-ink-line bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-ink-line px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs font-medium text-brand-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-80 divide-y divide-ink-line overflow-y-auto">
            {items.length === 0 && <li className="px-4 py-6 text-center text-sm text-ink-muted">Tidak ada notifikasi.</li>}
            {items.map((n) => (
              <li key={n.id} onClick={() => markOne(n)} className={`flex cursor-pointer gap-3 px-4 py-3 hover:bg-page ${n.is_read ? 'opacity-60' : ''}`}>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${LEVEL_DOT[n.level]}`} />
                <div>
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.message && <p className="text-xs text-ink-soft">{n.message}</p>}
                  <p className="mt-0.5 text-[11px] text-ink-muted">{fmtDateTime(n.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ProfileMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutsideClose(ref, () => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2.5 rounded-lg p-1 hover:bg-page">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-white">
          <User size={18} />
        </span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-sm font-semibold">{user.full_name}</span>
          <span className="block text-xs text-ink-muted">{ROLE_LABELS[user.role] || user.role}</span>
        </span>
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-48 rounded-xl border border-ink-line bg-white py-1 shadow-lg">
          <button className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-page" onClick={() => { setOpen(false); navigate('/settings'); }}>
            <User size={16} /> My profile
          </button>
          <button className="flex w-full items-center gap-2 px-4 py-2 text-sm text-brand-600 hover:bg-page" onClick={logout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default function Navbar({ onMenu }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'en');
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
    window.dispatchEvent(new CustomEvent('wms:lang-changed', { detail: { lang } }));
  }, [lang]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const submit = (e) => {
    e.preventDefault();
    navigate(`/work-orders${q.trim() ? `?search=${encodeURIComponent(q.trim())}` : ''}`);
    notifyChange();
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-ink-line bg-white px-4 sm:px-6">
      <button className="rounded-lg p-2 text-ink-soft hover:bg-page lg:hidden" onClick={onMenu} aria-label="Open menu">
        <Menu size={20} />
      </button>
      <h2 className="text-sm font-semibold">{TITLES[pathname] || 'MUSASHI'}</h2>

      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        <form onSubmit={submit} className="relative hidden md:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input className="input w-64 bg-page pl-9" placeholder="Search assets, work orders..." value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
        <LanguageToggle lang={lang} setLang={setLang} />
        <Notifications />
        <ProfileMenu />
      </div>
    </header>
  );
}