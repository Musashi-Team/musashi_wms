import { useEffect, useState } from 'react';
import { Eye, ImageIcon, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import api, { errMsg, fieldErrors, notifyChange } from '../api/client';
import { ConfirmDialog, DataTable, FilterDropdown, FormInput, FormSelect, FormTextarea, Modal, Pagination, SearchInput, Spinner, StatusBadge, Field } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useFacility } from '../context/FacilityContext';
import { useToast } from '../context/ToastContext';
import useList from '../hooks/useList';
import useLookups from '../hooks/useLookups';
import { fmtDate } from '../utils/format';
import { can } from '../utils/permissions';

const STATUS = [
  { value: 'operational', label: 'Operational' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'offline', label: 'Offline' },
];
const CONDITION = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
];
const EMPTY = { name: '', category: '', serial_number: '', zone: '', location_detail: '', purchase_date: '', condition: 'good', status: 'operational', description: '' };

function AssetForm({ open, asset, onClose }) {
  const { warehouseId } = useFacility();
  const toast = useToast();
  const { zones, categories, reloadLookups } = useLookups(warehouseId);
  const [form, setForm] = useState(EMPTY);
  const [photo, setPhoto] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [newCat, setNewCat] = useState('');

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setPhoto(null);
    setNewCat('');
    setForm(
      asset
        ? { name: asset.name, category: asset.category || '', serial_number: asset.serial_number, zone: asset.zone || '', location_detail: asset.location_detail, purchase_date: asset.purchase_date || '', condition: asset.condition, status: asset.status, description: asset.description }
        : EMPTY
    );
  }, [open, asset]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const addCategory = async () => {
    if (!newCat.trim()) return;
    try {
      const { data } = await api.post('/asset-categories/', { name: newCat.trim() });
      await reloadLookups();
      setForm((f) => ({ ...f, category: data.id }));
      setNewCat('');
      toast.success('Kategori ditambahkan.');
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrors({ name: 'Nama aset wajib diisi.' });
      return;
    }
    // FormData agar foto bisa diunggah; nilai kosong tidak dikirim
    const fd = new FormData();
    Object.entries({ ...form, warehouse: asset ? asset.warehouse : warehouseId }).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined) fd.append(k, v);
    });
    if (asset) {
      ['category', 'zone', 'purchase_date'].forEach((k) => form[k] === '' && fd.append(k, ''));
    }
    if (photo) fd.append('photo', photo);
    setSaving(true);
    try {
      if (asset) await api.patch(`/assets/${asset.id}/`, fd);
      else await api.post('/assets/', fd);
      toast.success(asset ? 'Aset diperbarui.' : 'Aset ditambahkan.');
      notifyChange();
      onClose();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={asset ? `Edit ${asset.asset_id}` : 'Tambah aset baru'}
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>Batal</button>
          <button type="submit" form="asset-form" className="btn-primary" disabled={saving}>
            {saving && <Loader2 size={16} className="animate-spin" />} Simpan
          </button>
        </>
      }
    >
      <form id="asset-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <FormInput className="sm:col-span-2" label="Asset name" required value={form.name} onChange={set('name')} error={errors.name} />
        <div>
          <FormSelect label="Category" value={form.category} onChange={set('category')} error={errors.category} options={categories.map((c) => ({ value: c.id, label: c.name }))} />
          <div className="mt-2 flex gap-2">
            <input className="input py-1.5 text-xs" placeholder="Kategori baru..." value={newCat} onChange={(e) => setNewCat(e.target.value)} />
            <button type="button" className="btn-outline !py-1.5 text-xs" onClick={addCategory}>Tambah</button>
          </div>
        </div>
        <FormInput label="Serial number" value={form.serial_number} onChange={set('serial_number')} error={errors.serial_number} />
        <FormSelect label="Zone" value={form.zone} onChange={set('zone')} error={errors.zone} options={zones.map((z) => ({ value: z.id, label: z.name }))} />
        <FormInput label="Detail lokasi" value={form.location_detail} onChange={set('location_detail')} placeholder="Mis. Rak B-12" />
        <FormInput label="Purchase date" type="date" value={form.purchase_date} onChange={set('purchase_date')} error={errors.purchase_date} />
        <FormSelect label="Condition" value={form.condition} onChange={set('condition')} placeholder="" options={CONDITION} />
        <FormSelect label="Status" value={form.status} onChange={set('status')} placeholder="" options={STATUS} />
        <Field label="Foto aset" error={errors.photo} hint="JPG/PNG">
          <input type="file" accept="image/*" className="input py-1.5" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
        </Field>
        <FormTextarea className="sm:col-span-2" label="Description" value={form.description} onChange={set('description')} />
      </form>
    </Modal>
  );
}

function AssetDetail({ asset, onClose }) {
  const [hist, setHist] = useState(null);
  useEffect(() => {
    setHist(null);
    if (asset) api.get(`/assets/${asset.id}/history/`).then((r) => setHist(r.data)).catch(() => setHist({ maintenance: [], work_orders: [] }));
  }, [asset]);
  if (!asset) return null;
  const rows = [
    ['Asset ID', asset.asset_id], ['Category', asset.category_name], ['Serial number', asset.serial_number], ['Warehouse', asset.warehouse_name],
    ['Zone', asset.zone_name], ['Location detail', asset.location_detail], ['Purchase date', fmtDate(asset.purchase_date)], ['Condition', asset.condition_display],
  ];
  return (
    <Modal open onClose={onClose} size="lg" title={asset.name}>
      <div className="space-y-6">
        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="flex h-40 w-full shrink-0 items-center justify-center overflow-hidden rounded-lg bg-page sm:w-48">
            {asset.photo ? <img src={asset.photo} alt={asset.name} className="h-full w-full object-cover" /> : <ImageIcon className="text-ink-muted" size={32} />}
          </div>
          <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3">
            {rows.map(([k, v]) => (
              <div key={k}>
                <dt className="text-[11px] uppercase tracking-wide text-ink-muted">{k}</dt>
                <dd className="text-sm">{v || '-'}</dd>
              </div>
            ))}
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-ink-muted">Status</dt>
              <dd className="mt-0.5"><StatusBadge status={asset.status} /></dd>
            </div>
          </dl>
        </div>
        {asset.description && <p className="text-sm text-ink-soft">{asset.description}</p>}
        <div>
          <p className="mb-2 text-sm font-semibold">Riwayat maintenance</p>
          {!hist ? <Spinner /> : hist.maintenance.length === 0 ? <p className="text-sm text-ink-muted">Belum ada riwayat maintenance.</p> : (
            <ul className="divide-y divide-ink-line rounded-lg border border-ink-line text-sm">
              {hist.maintenance.slice(0, 15).map((h) => (
                <li key={h.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2">
                  <span className="w-24 text-ink-muted">{fmtDate(h.date)}</span>
                  <span className="capitalize">{h.type}</span>
                  <span className="flex-1 truncate text-ink-soft">{h.notes}</span>
                  <span className="text-xs text-ink-muted">{h.work_order} {h.performed_by && `- ${h.performed_by}`}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default function Assets() {
  const { user } = useAuth();
  const { warehouseId } = useFacility();
  const toast = useToast();
  const { categories } = useLookups(warehouseId);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(undefined);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const { results, count, loading, error } = useList('/assets/', { warehouse: warehouseId, search, status, category, condition, page, page_size: 10 });
  const canEdit = can(user, 'assets');
  const canDelete = can(user, 'assetDelete');
  const reset = (fn) => (v) => { fn(v); setPage(1); };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/assets/${deleting.id}/`);
      toast.success('Aset dihapus.');
      setDeleting(null);
      notifyChange();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: 'asset_id', header: 'Asset ID', render: (r) => <span className="text-xs font-medium">{r.asset_id}</span> },
    { key: 'name', header: 'Name', render: (r) => (
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded bg-page">
          {r.photo ? <img src={r.photo} alt="" className="h-full w-full object-cover" /> : <ImageIcon size={16} className="text-ink-muted" />}
        </span>
        <div>
          <p className="font-medium">{r.name}</p>
          <p className="text-xs text-ink-muted">{r.serial_number || '-'}</p>
        </div>
      </div>
    ) },
    { key: 'category_name', header: 'Category' },
    { key: 'zone_name', header: 'Location', render: (r) => [r.zone_name, r.location_detail].filter(Boolean).join(' / ') || '-' },
    { key: 'purchase_date', header: 'Purchased', render: (r) => fmtDate(r.purchase_date) },
    { key: 'condition_display', header: 'Condition' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'action', header: 'Action', className: 'text-right', render: (r) => (
      <div className="flex justify-end gap-1">
        <button className="rounded p-1.5 text-ink-muted hover:bg-page" onClick={() => setViewing(r)} aria-label="Detail"><Eye size={16} /></button>
        {canEdit && <button className="rounded p-1.5 text-ink-muted hover:bg-page" onClick={() => setEditing(r)} aria-label="Edit"><Pencil size={16} /></button>}
        {canDelete && <button className="rounded p-1.5 text-ink-muted hover:bg-page hover:text-brand-600" onClick={() => setDeleting(r)} aria-label="Delete"><Trash2 size={16} /></button>}
      </div>
    ) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assets</h1>
          <p className="mt-1 text-sm text-ink-soft">Daftar seluruh aset warehouse, kondisi, dan riwayat maintenance.</p>
        </div>
        {canEdit && <button className="btn-primary" onClick={() => setEditing(null)}><Plus size={16} /> Tambah aset</button>}
      </div>

      <section className="card">
        <div className="flex flex-wrap items-center gap-2 p-4">
          <SearchInput value={search} onChange={reset(setSearch)} placeholder="Cari nama, ID, serial number..." className="w-full sm:w-72" />
          <FilterDropdown value={status} onChange={reset(setStatus)} options={STATUS} placeholder="All status" />
          <FilterDropdown value={category} onChange={reset(setCategory)} options={categories.map((c) => ({ value: c.id, label: c.name }))} placeholder="All categories" />
          <FilterDropdown value={condition} onChange={reset(setCondition)} options={CONDITION} placeholder="All conditions" />
        </div>
        <DataTable columns={columns} rows={results} loading={loading} error={error} empty="Belum ada aset." />
        <Pagination page={page} pageSize={10} count={count} onChange={setPage} />
      </section>

      <AssetForm open={editing !== undefined} asset={editing} onClose={() => setEditing(undefined)} />
      <AssetDetail asset={viewing} onClose={() => setViewing(null)} />
      <ConfirmDialog open={!!deleting} message={`Hapus aset ${deleting?.asset_id} - ${deleting?.name}? Riwayat maintenance aset ini juga akan terhapus.`} onClose={() => setDeleting(null)} onConfirm={remove} busy={busy} />
    </div>
  );
}
