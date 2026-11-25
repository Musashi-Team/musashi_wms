import { NavLink } from 'react-router-dom';
import { BarChart3, Box, Building2, CalendarClock, ChevronDown, HelpCircle, LayoutDashboard, Package, Settings, Wrench, X } from 'lucide-react';
import Logo from './Logo';
import { useFacility } from '../context/FacilityContext';

const MAIN = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/assets', label: 'Assets', icon: Box },
  { to: '/work-orders', label: 'Work Orders', icon: Wrench, badge: true },
  { to: '/maintenance', label: 'Maintenance Plan', icon: CalendarClock },
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
];
const SECONDARY = [
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/help', label: 'Help Center', icon: HelpCircle },
];

function Item({ item, badge, onNavigate }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
          isActive ? 'bg-brand-50 text-brand-600' : 'text-ink-soft hover:bg-page hover:text-ink'
        }`
      }
    >
      <Icon size={18} />
      <span className="flex-1">{item.label}</span>
      {item.badge && badge > 0 && (
        <span className="rounded-full bg-ink-line px-2 py-0.5 text-[11px] font-semibold text-ink-soft">{badge}</span>
      )}
    </NavLink>
  );
}

export default function Sidebar({ open, onClose, activeWorkOrders }) {
  const { warehouses, warehouseId, current, select } = useFacility();
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-ink-line bg-white transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button className="absolute right-3 top-3 rounded p-1 text-ink-muted hover:bg-page lg:hidden" onClick={onClose} aria-label="Close menu">
          <X size={18} />
        </button>
        <div className="border-b border-ink-line px-4 py-5">
          <Logo />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Workspace</p>
          <div className="space-y-1">
            {MAIN.map((i) => (
              <Item key={i.to} item={i} badge={activeWorkOrders} onNavigate={onClose} />
            ))}
          </div>
          <div className="my-4 border-t border-ink-line" />
          <div className="space-y-1">
            {SECONDARY.map((i) => (
              <Item key={i.to} item={i} onNavigate={onClose} />
            ))}
          </div>
        </nav>

        <div className="m-3 rounded-lg bg-page p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Current facility</p>
          <div className="mt-1.5 flex items-center gap-2 text-sm font-semibold">
            <Building2 size={16} className="text-ink-soft" />
            {current?.name || 'No warehouse'}
          </div>
          <div className="relative mt-2">
            <select
              className="w-full appearance-none rounded-md border border-ink-line bg-white py-1.5 pl-2 pr-7 text-xs text-ink-soft focus:outline-none focus:ring-2 focus:ring-brand-100"
              value={warehouseId}
              onChange={(e) => select(e.target.value)}
              aria-label="Select warehouse"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted" />
          </div>
        </div>
      </aside>
    </>
  );
}
