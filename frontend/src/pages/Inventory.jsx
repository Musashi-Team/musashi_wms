import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Loader2, Pencil, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import api, { errMsg, fieldErrors, notifyChange } from '../api/client';
import { ConfirmDialog, DataTable, FilterDropdown, FormInput, FormSelect, FormTextarea, Modal, Pagination, SearchInput, StockBadge } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useFacility } from '../context/FacilityContext';
import { useToast } from '../context/ToastContext';
import useList from '../hooks/useList';
import useLookups from '../hooks/useLookups';
import { fmtDateTime } from '../utils/format';
import { can } from '../utils/permissions';

const EMPTY = { name: '', category: '', unit: 'pcs', zone: '', quantity: 0, min_stock: 0, max_stock: 0, reorder_level: 0, reorder_quantity: 0, description: '' };
const NUMS = ['quantity', 'min_stock', 'max_stock', 'reorder_level', 'reorder_quantity'];

function ItemForm({ open, item, onClose }) {
  const { warehouseId } = useFacility();
  const toast = useToast();
  const { zones } = useLookups(warehouseId);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(item ? { name: item.name, category: item.category, unit: item.unit, zone: item.zone || '', quantity: item.quantity, min_stock: item.min_stock, max_stock: item.max_stock, reorder_level: item.reorder_level, reorder_quantity: item.reorder_quantity, description: item.description } : EMPTY);
  }, [open, item]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrors({ name: 'Nama barang wajib diisi.' });
      return;
    }
    const payload = { ...form, zone: form.zone || null, warehouse: item ? item.warehouse : warehouseId };
    NUMS.forEach((k) => (payload[k] = Number(payload[k]) || 0));
    // jumlah stok pada item yang sudah ada diubah lewat Stock In/Out/Adjustment agar tercatat di riwayat
    if (item) delete payload.quantity;
    setSaving(true);
    try {
      if (item) await api.patch(`/inventory/items/${item.id}/`, payload);
      else await api.post('/inventory/items/', payload);
      toast.success(item ? 'Item diperbarui.' : 'Item ditambahkan.');
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
    <Modal open={open} onClose={onClose} size="lg" title={item ? `Edit ${item.sku}` : 'Tambah barang / spare part'}
      footer={<><button className="btn-outline" onClick={onClose}>Batal</button><button type="submit" form="item-form" className="btn-primary" disabled={saving}>{saving && <Loader2 size={16} className="animate-spin" />} Simpan</button></>}>
      <form id="item-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <FormInput className="sm:col-span-2" label="Nama barang" required value={form.name} onChange={set('name')} error={errors.name} />
        <FormInput label="Kategori" value={form.category} onChange={set('category')} placeholder="Spare part, Consumable..." />
        <FormInput label="Satuan" value={form.unit} onChange={set('unit')} />
        <FormSelect label="Zona" value={form.zone} onChange={set('zone')} options={zones.map((z) => ({ value: z.id, label: z.name }))} />
        {!item && <FormInput label="Stok awal" type="number" min="0" value={form.quantity} onChange={set('quantity')} error={errors.quantity} />}
        <FormInput label="Minimum stock" type="number" min="0" value={form.min_stock} onChange={set('min_stock')} error={errors.min_stock} />
        <FormInput label="Maximum stock" type="number" min="0" value={form.max_stock} onChange={set('max_stock')} error={errors.max_stock} />
        <FormInput label="Re-order level" type="number" min="0" value={form.reorder_level} onChange={set('reorder_level')} error={errors.reorder_level} />
        <FormInput label="Re-order quantity" type="number" min="0" value={form.reorder_quantity} onChange={set('reorder_quantity')} error={errors.reorder_quantity} />
        <FormTextarea className="sm:col-span-2" label="Deskripsi" value={form.description} onChange={set('description')} />
      </form>
    </Modal>
  );
}

const MOVE_META = {
  in: { title: 'Stock In', qtyLabel: 'Jumlah masuk' },
  out: { title: 'Stock Out', qtyLabel: 'Jumlah keluar' },
  adjustment: { title: 'Stock Adjustment', qtyLabel: 'Jumlah stok hasil hitung fisik' },
};

function MovementForm({ item, type, onClose }) {
  const toast = useToast();
  const [qty, setQty] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setQty(''); setReference(''); setNotes(''); setError('');
  }, [item, type]);
  if (!item || !type) return null;
  const meta = MOVE_META[type];

  const submit = async (e) => {
    e.preventDefault();
    if (qty === '' || Number(qty) < 0 || (type !== 'adjustment' && Number(qty) <= 0)) {
      setError('Masukkan jumlah yang valid.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/inventory/movements/', { item: item.id, movement_type: type, quantity: Number(qty), reference, notes });
      toast.success(`${meta.title} berhasil dicatat.`);
      notifyChange();
      onClose();
    } catch (err) {
      setError(fieldErrors(err).quantity || errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} size="sm" title={`${meta.title} - ${item.name}`}
      footer={<><button className="btn-outline" onClick={onClose}>Batal</button><button type="submit" form="move-form" className="btn-primary" disabled={saving}>{saving && <Loader2 size={16} className="animate-spin" />} Simpan</button></>}>
      <form id="move-form" onSubmit={submit} className="space-y-4">
        <p className="text-sm text-ink-soft">Stok saat ini: <b>{item.quantity} {item.unit}</b></p>
        <FormInput label={meta.qtyLabel} type="number" min="0" autoFocus value={qty} onChange={(e) => setQty(e.target.value)} error={error} />
        <FormInput label="Referensi" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="No. PO / WO / dokumen" />
        <FormTextarea label="Catatan" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </form>
    </Modal>
  );
}

function Items() {
  const { user } = useAuth();
  const { warehouseId } = useFacility();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [low, setLow] = useState(false);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(undefined);
  const [move, setMove] = useState({ item: null, type: null });
  const [deleting, setDeleting] = useState(null);
  const { results, count, loading, error } = useList('/inventory/items/', { warehouse: warehouseId, search, category, low_stock: low, page, page_size: 10 });
  const cats = useList('/inventory/items/', { warehouse: warehouseId, page_size: 500 });
  const lowCount = useList('/inventory/items/', { warehouse: warehouseId, low_stock: true, page_size: 1 });
  const canEdit = can(user, 'inventory');
  const categories = [...new Set(cats.results.map((i) => i.category).filter(Boolean))].sort();

  const remove = async () => {
    try {
      await api.delete(`/inventory/items/${deleting.id}/`);
      toast.success('Item dihapus.');
      setDeleting(null);
      notifyChange();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const columns = [
    { key: 'sku', header: 'SKU', render: (r) => <span className="text-xs font-medium">{r.sku}</span> },
    { key: 'name', header: 'Item', render: (r) => <div><p className="font-medium">{r.name}</p><p className="text-xs text-ink-muted">{r.category || '-'} {r.zone_name && `- ${r.zone_name}`}</p></div> },
    { key: 'quantity', header: 'Qty', render: (r) => <span className="font-semibold">{r.quantity} <span className="font-normal text-ink-muted">{r.unit}</span></span> },
    { key: 'min_stock', header: 'Min / Max', render: (r) => `${r.min_stock} / ${r.max_stock}` },
    { key: 'reorder_level', header: 'Re-order lvl / qty', render: (r) => `${r.reorder_level} / ${r.reorder_quantity}` },
    { key: 'stock_status', header: 'Status', render: (r) => <StockBadge status={r.stock_status} /> },
    ...(canEdit ? [{ key: 'action', header: 'Action', className: 'text-right', render: (r) => (
      <div className="flex justify-end gap-1">
        <button title="Stock In" className="rounded p-1.5 text-ink-muted hover:bg-page hover:text-green-700" onClick={() => setMove({ item: r, type: 'in' })}><ArrowDownToLine size={16} /></button>
        <button title="Stock Out" className="rounded p-1.5 text-ink-muted hover:bg-page hover:text-brand-600" onClick={() => setMove({ item: r, type: 'out' })}><ArrowUpFromLine size={16} /></button>
        <button title="Adjustment" className="rounded p-1.5 text-ink-muted hover:bg-page" onClick={() => setMove({ item: r, type: 'adjustment' })}><SlidersHorizontal size={16} /></button>
        <button title="Edit" className="rounded p-1.5 text-ink-muted hover:bg-page" onClick={() => setEditing(r)}><Pencil size={16} /></button>
        <button title="Delete" className="rounded p-1.5 text-ink-muted hover:bg-page hover:text-brand-600" onClick={() => setDeleting(r)}><Trash2 size={16} /></button>
      </div>
    ) }] : []),
  ];

  return (
    <>
      {lowCount.count > 0 && (
        <div className="m-4 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          <span className="flex items-center gap-2"><AlertTriangle size={16} /> {lowCount.count} item mencapai re-order level.</span>
          <button className="font-semibold underline" onClick={() => { setLow(true); setPage(1); }}>Tampilkan</button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 p-4">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari SKU atau nama..." className="w-full sm:w-64" />
        <FilterDropdown value={category} onChange={(v) => { setCategory(v); setPage(1); }} options={categories.map((c) => ({ value: c, label: c }))} placeholder="All categories" />
        <label className="flex items-center gap-2 text-sm text-ink-soft"><input type="checkbox" checked={low} onChange={(e) => { setLow(e.target.checked); setPage(1); }} /> Low stock only</label>
        {canEdit && <button className="btn-primary ml-auto" onClick={() => setEditing(null)}><Plus size={16} /> Tambah item</button>}
      </div>
      <DataTable columns={columns} rows={results} loading={loading} error={error} empty="Belum ada item inventory." />
      <Pagination page={page} pageSize={10} count={count} onChange={setPage} />
      <ItemForm open={editing !== undefined} item={editing} onClose={() => setEditing(undefined)} />
      <MovementForm item={move.item} type={move.type} onClose={() => setMove({ item: null, type: null })} />
      <ConfirmDialog open={!!deleting} message={`Hapus ${deleting?.sku} - ${deleting?.name} beserta riwayat pergerakan stoknya?`} onClose={() => setDeleting(null)} onConfirm={remove} />
    </>
  );
}

function Movements() {
  const { warehouseId } = useFacility();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const { results, count, loading, error } = useList('/inventory/movements/', { item__warehouse: warehouseId, search, movement_type: type, page, page_size: 10 });
  const columns = [
    { key: 'created_at', header: 'Date', render: (r) => fmtDateTime(r.created_at) },
    { key: 'item_name', header: 'Item', render: (r) => <div><p className="font-medium">{r.item_name}</p><p className="text-xs text-ink-muted">{r.item_sku}</p></div> },
    { key: 'movement_display', header: 'Type' },
    { key: 'change', header: 'Change', render: (r) => <span className={r.change < 0 ? 'font-semibold text-brand-600' : 'font-semibold text-green-700'}>{r.change > 0 ? `+${r.change}` : r.change}</span> },
    { key: 'balance_after', header: 'Balance' },
    { key: 'reference', header: 'Reference' },
    { key: 'created_by_name', header: 'By' },
  ];
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 p-4">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari item / referensi..." className="w-full sm:w-64" />
        <FilterDropdown value={type} onChange={(v) => { setType(v); setPage(1); }} options={[{ value: 'in', label: 'Stock In' }, { value: 'out', label: 'Stock Out' }, { value: 'adjustment', label: 'Adjustment' }]} placeholder="All types" />
      </div>
      <DataTable columns={columns} rows={results} loading={loading} error={error} empty="Belum ada pergerakan stok." />
      <Pagination page={page} pageSize={10} count={count} onChange={setPage} />
    </>
  );
}

export default function Inventory() {
  const [tab, setTab] = useState('items');
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
        <p className="mt-1 text-sm text-ink-soft">Kelola spare part, stok masuk/keluar, dan level re-order.</p>
      </div>
      <section className="card">
        <div className="flex gap-1 border-b border-ink-line px-4 pt-3">
          {[['items', 'Items'], ['movements', 'Stock movements']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === id ? 'border-brand-500 text-brand-600' : 'border-transparent text-ink-soft hover:text-ink'}`}>{label}</button>
          ))}
        </div>
        {tab === 'items' ? <Items /> : <Movements />}
      </section>
    </div>
  );
}
