import { useCallback, useEffect, useState } from 'react';
import { BellRing, CheckCheck, ChevronLeft, ChevronRight, ClipboardPlus, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import api, { errMsg, fieldErrors, notifyChange } from '../api/client';
import { ConfirmDialog, DataTable, FilterDropdown, FormInput, FormSelect, FormTextarea, Modal, Pagination, PriorityBadge, SearchInput, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useFacility } from '../context/FacilityContext';
import { useToast } from '../context/ToastContext';
import useList from '../hooks/useList';
import useLookups from '../hooks/useLookups';
import { fmtDate, todayIso } from '../utils/format';
import { can } from '../utils/permissions';

const FREQ = [
  { value: 'once', label: 'Once' }, { value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' }, { value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' },
  { value: 'semiannual', label: 'Every 6 months' }, { value: 'yearly', label: 'Yearly' },
];
const TYPES = [{ value: 'preventive', label: 'Preventive' }, { value: 'corrective', label: 'Corrective' }];
const PRIORITY = [{ value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }];
const EMPTY = { title: '', plan_type: 'preventive', asset: '', frequency: 'monthly', next_date: todayIso(), priority: 'medium', assigned_to: '', reminder_days: 3, description: '' };

function PlanForm({ open, plan, onClose }) {
  const { warehouseId } = useFacility();
  const toast = useToast();
  const { assets, users } = useLookups(warehouseId);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(plan ? { title: plan.title, plan_type: plan.plan_type, asset: plan.asset || '', frequency: plan.frequency, next_date: plan.next_date, priority: plan.priority, assigned_to: plan.assigned_to || '', reminder_days: plan.reminder_days, description: plan.description } : { ...EMPTY, next_date: todayIso() });
  }, [open, plan]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.title.trim()) errs.title = 'Judul wajib diisi.';
    if (!form.next_date) errs.next_date = 'Tanggal wajib diisi.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const payload = { ...form, asset: form.asset || null, assigned_to: form.assigned_to || null, reminder_days: Number(form.reminder_days) || 0, warehouse: plan ? plan.warehouse : warehouseId };
    setSaving(true);
    try {
      if (plan) await api.patch(`/maintenance/plans/${plan.id}/`, payload);
      else await api.post('/maintenance/plans/', payload);
      toast.success(plan ? 'Jadwal diperbarui.' : 'Jadwal dibuat.');
      notifyChange();
      onClose();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const techs = users.filter((u) => ['technician', 'maintenance_supervisor'].includes(u.role));
  return (
    <Modal open={open} onClose={onClose} size="lg" title={plan ? 'Edit jadwal maintenance' : 'Buat jadwal maintenance'}
      footer={<><button className="btn-outline" onClick={onClose}>Batal</button><button type="submit" form="plan-form" className="btn-primary" disabled={saving}>{saving && <Loader2 size={16} className="animate-spin" />} Simpan</button></>}>
      <form id="plan-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <FormInput className="sm:col-span-2" label="Judul" required value={form.title} onChange={set('title')} error={errors.title} />
        <FormSelect label="Jenis" value={form.plan_type} onChange={set('plan_type')} placeholder="" options={TYPES} />
        <FormSelect label="Aset" value={form.asset} onChange={set('asset')} error={errors.asset} options={assets.map((a) => ({ value: a.id, label: `${a.asset_id} - ${a.name}` }))} />
        <FormSelect label="Frekuensi" value={form.frequency} onChange={set('frequency')} placeholder="" options={FREQ} />
        <FormInput label="Tanggal maintenance berikutnya" type="date" required value={form.next_date} onChange={set('next_date')} error={errors.next_date} />
        <FormSelect label="Prioritas" value={form.priority} onChange={set('priority')} placeholder="" options={PRIORITY} />
        <FormInput label="Reminder (hari sebelumnya)" type="number" min="0" value={form.reminder_days} onChange={set('reminder_days')} />
        <FormSelect className="sm:col-span-2" label="Teknisi" value={form.assigned_to} onChange={set('assigned_to')} options={techs.map((u) => ({ value: u.id, label: `${u.full_name} (${u.role_display})` }))} />
        <FormTextarea className="sm:col-span-2" label="Deskripsi / SOP" value={form.description} onChange={set('description')} />
      </form>
    </Modal>
  );
}

const KIND_STYLE = { plan: 'bg-brand-50 text-brand-600', work_order: 'bg-blue-50 text-blue-700' };

function CalendarView() {
  const { warehouseId } = useFacility();
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [events, setEvents] = useState(null);
  const month = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;

  const load = useCallback(() => {
    api.get('/maintenance/plans/calendar/', { params: { month, warehouse: warehouseId } }).then((r) => setEvents(r.data.events)).catch(() => setEvents([]));
  }, [month, warehouseId]);
  useEffect(() => {
    setEvents(null);
    load();
    window.addEventListener('wms:data-changed', load);
    return () => window.removeEventListener('wms:data-changed', load);
  }, [load]);

  const first = cursor.getDay();
  const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const today = todayIso();
  const dateStr = (d) => `${month}-${String(d).padStart(2, '0')}`;

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">{cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-3 text-xs text-ink-soft sm:flex">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-brand-500" /> Plan</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-blue-500" /> Work order</span>
          </span>
          <button className="btn-outline !p-1.5" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Previous month"><ChevronLeft size={16} /></button>
          <button className="btn-outline !py-1.5" onClick={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); }}>Today</button>
          <button className="btn-outline !p-1.5" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Next month"><ChevronRight size={16} /></button>
        </div>
      </div>
      {events === null ? <div className="flex justify-center py-16"><Spinner /></div> : (
        <div className="overflow-x-auto">
          <div className="grid min-w-[640px] grid-cols-7 border-l border-t border-ink-line text-xs">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="border-b border-r border-ink-line bg-page px-2 py-1.5 font-semibold text-ink-muted">{d}</div>)}
            {cells.map((d, i) => {
              const list = d ? events.filter((e) => e.date === dateStr(d)) : [];
              return (
                <div key={i} className={`min-h-[96px] border-b border-r border-ink-line p-1.5 ${d ? '' : 'bg-page/50'}`}>
                  {d && <span className={`mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${dateStr(d) === today ? 'bg-brand-500 font-semibold text-white' : 'text-ink-soft'}`}>{d}</span>}
                  <div className="space-y-1">
                    {list.slice(0, 3).map((e, k) => <p key={k} title={e.title} className={`truncate rounded px-1.5 py-0.5 ${KIND_STYLE[e.kind]}`}>{e.title}</p>)}
                    {list.length > 3 && <p className="px-1 text-ink-muted">+{list.length - 3} more</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Plans() {
  const { user } = useAuth();
  const { warehouseId } = useFacility();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(undefined);
  const [deleting, setDeleting] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const { results, count, loading, error } = useList('/maintenance/plans/', { warehouse: warehouseId, search, plan_type: type, page, page_size: 10 });
  const reminders = useList('/maintenance/plans/reminders/', { warehouse: warehouseId });
  const canManage = can(user, 'maintenance');
  const canComplete = can(user, 'maintenanceComplete');

  const act = async (plan, path, okMsg) => {
    setBusyId(plan.id);
    try {
      const { data } = await api.post(`/maintenance/plans/${plan.id}/${path}/`, {});
      toast.success(data.wo_number ? `${okMsg} (${data.wo_number})` : okMsg);
      notifyChange();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/maintenance/plans/${deleting.id}/`);
      toast.success('Jadwal dihapus.');
      setDeleting(null);
      notifyChange();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const columns = [
    { key: 'title', header: 'Plan', render: (r) => <div><p className="font-medium">{r.title}</p><p className="text-xs text-ink-muted">{r.asset_name || '-'}</p></div> },
    { key: 'plan_type_display', header: 'Type' },
    { key: 'frequency_display', header: 'Frequency' },
    { key: 'next_date', header: 'Next date', render: (r) => fmtDate(r.next_date) },
    { key: 'priority', header: 'Priority', render: (r) => <PriorityBadge priority={r.priority} /> },
    { key: 'assigned_to_name', header: 'Technician' },
    { key: 'is_active', header: 'State', render: (r) => <span className={`text-xs font-medium ${r.is_active ? 'text-green-700' : 'text-ink-muted'}`}>{r.is_active ? 'Active' : 'Finished'}</span> },
    { key: 'action', header: 'Action', className: 'text-right', render: (r) => (
      <div className="flex justify-end gap-1">
        {canManage && r.is_active && <button title="Generate work order" disabled={busyId === r.id} className="rounded p-1.5 text-ink-muted hover:bg-page" onClick={() => act(r, 'generate-work-order', 'Work order dibuat')}><ClipboardPlus size={16} /></button>}
        {canComplete && r.is_active && r.asset && <button title="Tandai selesai" disabled={busyId === r.id} className="rounded p-1.5 text-ink-muted hover:bg-page" onClick={() => act(r, 'complete', 'Maintenance dicatat')}><CheckCheck size={16} /></button>}
        {canManage && <button className="rounded p-1.5 text-ink-muted hover:bg-page" onClick={() => setEditing(r)} aria-label="Edit"><Pencil size={16} /></button>}
        {canManage && <button className="rounded p-1.5 text-ink-muted hover:bg-page hover:text-brand-600" onClick={() => setDeleting(r)} aria-label="Delete"><Trash2 size={16} /></button>}
      </div>
    ) },
  ];

  return (
    <>
      {reminders.results.length > 0 && (
        <div className="m-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
          <p className="flex items-center gap-2 font-medium text-amber-800"><BellRing size={16} /> Reminder maintenance ({reminders.results.length})</p>
          <ul className="mt-1.5 space-y-0.5 text-amber-900">
            {reminders.results.slice(0, 5).map((p) => (
              <li key={p.id}>{p.title} - {p.days_left < 0 ? `terlambat ${-p.days_left} hari` : p.days_left === 0 ? 'hari ini' : `${p.days_left} hari lagi`} ({fmtDate(p.next_date)})</li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 p-4">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari jadwal..." className="w-full sm:w-64" />
        <FilterDropdown value={type} onChange={(v) => { setType(v); setPage(1); }} options={TYPES} placeholder="All types" />
        {canManage && <button className="btn-primary ml-auto" onClick={() => setEditing(null)}><Plus size={16} /> Buat jadwal</button>}
      </div>
      <DataTable columns={columns} rows={results} loading={loading} error={error} empty="Belum ada jadwal maintenance." />
      <Pagination page={page} pageSize={10} count={count} onChange={setPage} />
      <PlanForm open={editing !== undefined} plan={editing} onClose={() => setEditing(undefined)} />
      <ConfirmDialog open={!!deleting} message={`Hapus jadwal "${deleting?.title}"?`} onClose={() => setDeleting(null)} onConfirm={remove} />
    </>
  );
}

function History() {
  const { warehouseId } = useFacility();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { results, count, loading, error } = useList('/maintenance/histories/', { asset__warehouse: warehouseId, search, page, page_size: 10 });
  const columns = [
    { key: 'performed_at', header: 'Date', render: (r) => fmtDate(r.performed_at) },
    { key: 'asset_name', header: 'Asset', render: (r) => <div><p className="font-medium">{r.asset_name}</p><p className="text-xs text-ink-muted">{r.asset_code}</p></div> },
    { key: 'maintenance_type', header: 'Type', render: (r) => <span className="capitalize">{r.maintenance_type}</span> },
    { key: 'wo_number', header: 'Work order' },
    { key: 'performed_by_name', header: 'Performed by' },
    { key: 'notes', header: 'Notes' },
  ];
  return (
    <>
      <div className="p-4"><SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari riwayat..." className="w-full sm:w-64" /></div>
      <DataTable columns={columns} rows={results} loading={loading} error={error} empty="Belum ada riwayat maintenance." />
      <Pagination page={page} pageSize={10} count={count} onChange={setPage} />
    </>
  );
}

export default function Maintenance() {
  const [tab, setTab] = useState('plans');
  const tabs = [{ id: 'plans', label: 'Plans' }, { id: 'calendar', label: 'Calendar' }, { id: 'history', label: 'History' }];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Maintenance plan</h1>
        <p className="mt-1 text-sm text-ink-soft">Jadwal preventive & corrective maintenance, kalender, dan riwayat.</p>
      </div>
      <section className="card">
        <div className="flex gap-1 border-b border-ink-line px-4 pt-3">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === t.id ? 'border-brand-500 text-brand-600' : 'border-transparent text-ink-soft hover:text-ink'}`}>{t.label}</button>
          ))}
        </div>
        {tab === 'plans' && <Plans />}
        {tab === 'calendar' && <CalendarView />}
        {tab === 'history' && <History />}
      </section>
    </div>
  );
}
