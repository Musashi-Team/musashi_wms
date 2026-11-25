import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, CalendarDays, ClipboardList, Package, Plus, Timer } from 'lucide-react';
import api, { errMsg } from '../api/client';
import { ActivityChart, AssetHealthChart, HEALTH_COLORS } from '../components/Charts';
import SummaryCard from '../components/SummaryCard';
import WorkOrderForm from '../components/WorkOrderForm';
import WorkOrdersPanel from '../components/WorkOrdersPanel';
import { Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useFacility } from '../context/FacilityContext';
import { useToast } from '../context/ToastContext';
import { can } from '../utils/permissions';
import { pct } from '../utils/format';

const PERIODS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];
const PERIOD_NOTE = { weekly: 'Last 7 days', monthly: 'Last 30 days', yearly: new Date().getFullYear() };

export default function Dashboard() {
  const { user } = useAuth();
  const { warehouseId } = useFacility();
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [period, setPeriod] = useState('weekly');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const { data } = await api.get('/dashboard/stats/', { params: { warehouse: warehouseId } });
      setStats(data);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [warehouseId]); 

  const loadActivity = useCallback(async () => {
    try {
      const { data } = await api.get('/dashboard/activity/', { params: { warehouse: warehouseId, period } });
      setActivity(data.data);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }, [warehouseId, period]); 

  useEffect(() => {
    loadStats();
    loadActivity();
    window.addEventListener('wms:data-changed', loadStats);
    window.addEventListener('wms:data-changed', loadActivity);
    return () => {
      window.removeEventListener('wms:data-changed', loadStats);
      window.removeEventListener('wms:data-changed', loadActivity);
    };
  }, [loadStats, loadActivity]);

  const month = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const inv = stats?.inventory;
  const assets = stats?.assets;
  const wo = stats?.work_orders;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Maintenance dashboard</h1>
          <p className="mt-1 text-sm text-ink-soft">Monitor warehouse health and keep operations moving.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-2 rounded-lg border border-ink-line bg-white px-3 py-2 text-sm text-ink-soft sm:inline-flex">
            <CalendarDays size={16} /> {month}
          </span>
          {can(user, 'workOrders') && (
            <button className="btn-primary" onClick={() => setCreating(true)}>
              <Plus size={16} /> Create order
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="card grid divide-y divide-ink-line sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-4 xl:divide-x">
        <SummaryCard loading={loading} title="Minimum Stock" icon={Package} value={inv?.below_min} tone={inv?.below_min ? 'danger' : 'success'} note={inv?.below_min ? `${inv.below_min} items at/below minimum` : 'All above minimum'} />
        <SummaryCard loading={loading} title="Maximum Stock" icon={ClipboardList} highlight value={inv?.above_max} tone={inv?.above_max ? 'warning' : 'success'} note={inv?.above_max ? `${inv.above_max} items over maximum` : 'No overstock'} />
        <SummaryCard loading={loading} title="Re-Order Level" icon={Timer} value={inv?.reorder_alerts} tone={inv?.reorder_alerts ? 'warning' : 'success'} note={inv?.reorder_alerts ? 'Items reached re-order level' : 'No re-order needed'} />
        <SummaryCard loading={loading} title="Re-Order Quantity" icon={Activity} value={inv?.reorder_quantity} tone="neutral" note={`Units to order across ${inv?.reorder_alerts ?? 0} items`} />
        <SummaryCard loading={loading} title="Stock Aging" icon={Timer} value={inv?.reorder_quantity} tone="neutral" note={`Stock of anti-aging facial products`} />
        <SummaryCard loading={loading} title="Reduce Material" icon={Package} value={inv?.reorder_quantity} tone="neutral" note={`Monitoring Reduce Material`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Maintenance activity */}
        <section className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">Maintenance activity</h3>
              <p className="text-sm text-ink-soft">Work order activity - {PERIOD_NOTE[period]}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden items-center gap-3 text-xs text-ink-soft sm:flex">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-brand-500" /> Completed</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#C9CDD4]" /> Created</span>
              </div>
              <select className="input w-auto py-1.5" value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Period">
                {PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4">{loading ? <div className="flex h-60 items-center justify-center"><Spinner /></div> : <ActivityChart data={activity} />}</div>
        </section>

        {/* Asset health */}
        <section className="card flex flex-col p-5">
          <h3 className="text-base font-semibold">Asset health</h3>
          <p className="text-sm text-ink-soft">Current status across all zones</p>
          {assets ? (
            <div className="my-4 flex flex-1 flex-wrap items-center justify-center gap-5">
              <AssetHealthChart assets={assets} />
              <ul className="space-y-2.5 text-sm">
                {['Chemical', 'Electrical', 'Mechanical'].map((k) => (
                  <li key={k} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: HEALTH_COLORS[k] }} />
                    <span className="w-24 capitalize text-ink-soft">{k}</span>
                    <span className="font-semibold">{assets[k]}</span>
                    <span className="text-xs text-ink-muted">{pct(assets[k], assets.total)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center"><Spinner /></div>
          )}
          <div className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-xs ${assets?.offline ? 'bg-brand-50 text-brand-600' : 'bg-green-50 text-green-700'}`}>
            <span className="font-medium">{assets?.offline ? `${assets.offline} assets offline` : 'All assets online'}</span>
            <Link to="/assets" className="inline-flex items-center gap-1 font-semibold hover:underline">
              View assets <ArrowRight size={12} />
            </Link>
          </div>
        </section>
      </div>

      <WorkOrdersPanel compact counts={wo && { overdue: wo.overdue, due_today: wo.due_today }} />

      <WorkOrderForm open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
