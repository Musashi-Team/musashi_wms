import { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import api, { errMsg, fieldErrors, notifyChange } from '../api/client';
import { ConfirmDialog, DataTable, FormInput, FormSelect, Modal, Pagination, SearchInput } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useFacility } from '../context/FacilityContext';
import { useToast } from '../context/ToastContext';
import useList from '../hooks/useList';
import { can, ROLE_LABELS } from '../utils/permissions';

/* ---------------- Profil ---------------- */
function Profile() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ first_name: user.first_name, last_name: user.last_name, email: user.email, phone: user.phone || '' });
  const [pw, setPw] = useState({ old_password: '', new_password: '' });
  const [errors, setErrors] = useState({});
  const [pwErrors, setPwErrors] = useState({});
  const [busy, setBusy] = useState('');

  const saveProfile = async (e) => {
    e.preventDefault();
    setBusy('profile');
    try {
      await api.patch('/auth/me/', form);
      await refreshUser();
      setErrors({});
      toast.success('Profil diperbarui.');
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errMsg(err));
    } finally {
      setBusy('');
    }
  };

  const changePw = async (e) => {
    e.preventDefault();
    setBusy('pw');
    try {
      await api.post('/auth/change-password/', pw);
      setPw({ old_password: '', new_password: '' });
      setPwErrors({});
      toast.success('Password berhasil diubah.');
    } catch (err) {
      setPwErrors(fieldErrors(err));
      toast.error(errMsg(err));
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="grid gap-6 p-5 lg:grid-cols-2">
      <form onSubmit={saveProfile} className="space-y-4">
        <h3 className="font-semibold">Profil saya</h3>
        <p className="text-sm text-ink-soft">{user.username} - {ROLE_LABELS[user.role]}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput label="Nama depan" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} error={errors.first_name} />
          <FormInput label="Nama belakang" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} error={errors.last_name} />
          <FormInput label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
          <FormInput label="Telepon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={errors.phone} />
        </div>
        <button className="btn-primary" disabled={busy === 'profile'}>{busy === 'profile' && <Loader2 size={16} className="animate-spin" />} Simpan profil</button>
      </form>
      <form onSubmit={changePw} className="space-y-4">
        <h3 className="font-semibold">Ubah password</h3>
        <FormInput label="Password lama" type="password" autoComplete="current-password" value={pw.old_password} onChange={(e) => setPw({ ...pw, old_password: e.target.value })} error={pwErrors.old_password} />
        <FormInput label="Password baru" type="password" autoComplete="new-password" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} error={pwErrors.new_password} hint="Minimal 8 karakter, tidak terlalu umum." />
        <button className="btn-primary" disabled={busy === 'pw' || !pw.old_password || !pw.new_password}>{busy === 'pw' && <Loader2 size={16} className="animate-spin" />} Ubah password</button>
      </form>
    </div>
  );
}

/* ---------------- Users ---------------- */
const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));
const EMPTY_USER = { username: '', first_name: '', last_name: '', email: '', phone: '', role: 'warehouse_staff', warehouse: '', password: '', is_active: true };

function UserForm({ open, user, onClose }) {
  const { warehouses } = useFacility();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_USER);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(user ? { username: user.username, first_name: user.first_name, last_name: user.last_name, email: user.email, phone: user.phone, role: user.role, warehouse: user.warehouse || '', password: '', is_active: user.is_active } : EMPTY_USER);
  }, [open, user]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.username.trim()) errs.username = 'Username wajib diisi.';
    if (!user && !form.password) errs.password = 'Password wajib diisi.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const payload = { ...form, warehouse: form.warehouse || null };
    if (!payload.password) delete payload.password;
    setSaving(true);
    try {
      if (user) await api.patch(`/users/${user.id}/`, payload);
      else await api.post('/users/', payload);
      toast.success(user ? 'User diperbarui.' : 'User ditambahkan.');
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
    <Modal open={open} onClose={onClose} size="lg" title={user ? `Edit ${user.username}` : 'Tambah user'}
      footer={<><button className="btn-outline" onClick={onClose}>Batal</button><button type="submit" form="user-form" className="btn-primary" disabled={saving}>{saving && <Loader2 size={16} className="animate-spin" />} Simpan</button></>}>
      <form id="user-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <FormInput label="Username" required value={form.username} onChange={set('username')} error={errors.username} />
        <FormInput label={user ? 'Password baru (opsional)' : 'Password'} required={!user} type="password" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} />
        <FormInput label="Nama depan" value={form.first_name} onChange={set('first_name')} error={errors.first_name} />
        <FormInput label="Nama belakang" value={form.last_name} onChange={set('last_name')} error={errors.last_name} />
        <FormInput label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} />
        <FormInput label="Telepon" value={form.phone} onChange={set('phone')} />
        <FormSelect label="Role" required value={form.role} onChange={set('role')} placeholder="" options={ROLE_OPTIONS} error={errors.role} />
        <FormSelect label="Warehouse default" value={form.warehouse} onChange={set('warehouse')} options={warehouses.map((w) => ({ value: w.id, label: w.name }))} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Akun aktif</label>
      </form>
    </Modal>
  );
}

function Users() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(undefined);
  const [deleting, setDeleting] = useState(null);
  const { results, count, loading, error } = useList('/users/', { search, page, page_size: 10 });

  const remove = async () => {
    try {
      await api.delete(`/users/${deleting.id}/`);
      toast.success('User dihapus.');
      setDeleting(null);
      notifyChange();
    } catch (e) {
      toast.error(errMsg(e));
      setDeleting(null);
    }
  };

  const columns = [
    { key: 'full_name', header: 'Name', render: (r) => <div><p className="font-medium">{r.full_name}</p><p className="text-xs text-ink-muted">{r.username}</p></div> },
    { key: 'email', header: 'Email' },
    { key: 'role_display', header: 'Role' },
    { key: 'warehouse_name', header: 'Warehouse' },
    { key: 'is_active', header: 'State', render: (r) => <span className={`text-xs font-medium ${r.is_active ? 'text-green-700' : 'text-ink-muted'}`}>{r.is_active ? 'Active' : 'Disabled'}</span> },
    { key: 'action', header: 'Action', className: 'text-right', render: (r) => (
      <div className="flex justify-end gap-1">
        <button className="rounded p-1.5 text-ink-muted hover:bg-page" onClick={() => setEditing(r)} aria-label="Edit"><Pencil size={16} /></button>
        {r.id !== me.id && <button className="rounded p-1.5 text-ink-muted hover:bg-page hover:text-brand-600" onClick={() => setDeleting(r)} aria-label="Delete"><Trash2 size={16} /></button>}
      </div>
    ) },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 p-4">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari user..." className="w-full sm:w-64" />
        <button className="btn-primary ml-auto" onClick={() => setEditing(null)}><Plus size={16} /> Tambah user</button>
      </div>
      <DataTable columns={columns} rows={results} loading={loading} error={error} />
      <Pagination page={page} pageSize={10} count={count} onChange={setPage} />
      <UserForm open={editing !== undefined} user={editing} onClose={() => setEditing(undefined)} />
      <ConfirmDialog open={!!deleting} message={`Hapus user ${deleting?.username}?`} onClose={() => setDeleting(null)} onConfirm={remove} />
    </>
  );
}

/* ---------------- Warehouses & zones ---------------- */
function WarehouseForm({ open, warehouse, onClose }) {
  const { reload } = useFacility();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', code: '', address: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) { setErrors({}); setForm(warehouse ? { name: warehouse.name, code: warehouse.code, address: warehouse.address } : { name: '', code: '', address: '' }); }
  }, [open, warehouse]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (warehouse) await api.patch(`/warehouses/${warehouse.id}/`, form);
      else await api.post('/warehouses/', form);
      await reload();
      toast.success('Warehouse disimpan.');
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
    <Modal open={open} onClose={onClose} size="sm" title={warehouse ? 'Edit warehouse' : 'Tambah warehouse'}
      footer={<><button className="btn-outline" onClick={onClose}>Batal</button><button type="submit" form="wh-form" className="btn-primary" disabled={saving}>{saving && <Loader2 size={16} className="animate-spin" />} Simpan</button></>}>
      <form id="wh-form" onSubmit={submit} className="space-y-4">
        <FormInput label="Nama" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
        <FormInput label="Kode" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} error={errors.code} />
        <FormInput label="Alamat" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      </form>
    </Modal>
  );
}

function Warehouses() {
  const { reload } = useFacility();
  const toast = useToast();
  const { results, loading, error } = useList('/warehouses/', { page_size: 200 });
  const [editing, setEditing] = useState(undefined);
  const [zoneFor, setZoneFor] = useState(null);
  const [zone, setZone] = useState({ name: '', code: '' });
  const [deleting, setDeleting] = useState(null);

  const addZone = async (e) => {
    e.preventDefault();
    try {
      await api.post('/zones/', { warehouse: zoneFor.id, name: zone.name, code: zone.code });
      setZone({ name: '', code: '' });
      setZoneFor(null);
      await reload();
      notifyChange();
      toast.success('Zona ditambahkan.');
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const removeZone = async (z) => {
    try {
      await api.delete(`/zones/${z.id}/`);
      notifyChange();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/warehouses/${deleting.id}/`);
      toast.success('Warehouse dihapus.');
      setDeleting(null);
      await reload();
      notifyChange();
    } catch (e) {
      toast.error(errMsg(e));
      setDeleting(null);
    }
  };

  return (
    <div className="p-5">
      <div className="mb-4 flex justify-end"><button className="btn-primary" onClick={() => setEditing(null)}><Plus size={16} /> Tambah warehouse</button></div>
      {loading && <p className="text-sm text-ink-muted">Memuat...</p>}
      {error && <p className="text-sm text-brand-600">{error}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {results.map((w) => (
          <div key={w.id} className="rounded-lg border border-ink-line p-4">
            <div className="flex items-start justify-between">
              <div><p className="font-semibold">{w.name} <span className="text-xs font-normal text-ink-muted">({w.code})</span></p><p className="text-sm text-ink-soft">{w.address || '-'}</p></div>
              <div className="flex gap-1">
                <button className="rounded p-1.5 text-ink-muted hover:bg-page" onClick={() => setEditing(w)} aria-label="Edit"><Pencil size={16} /></button>
                <button className="rounded p-1.5 text-ink-muted hover:bg-page hover:text-brand-600" onClick={() => setDeleting(w)} aria-label="Delete"><Trash2 size={16} /></button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {w.zones.map((z) => (
                <span key={z.id} className="inline-flex items-center gap-1 rounded bg-page px-2 py-1 text-xs">
                  {z.name}
                  <button onClick={() => removeZone(z)} className="text-ink-muted hover:text-brand-600" aria-label={`Delete ${z.name}`}>&times;</button>
                </span>
              ))}
              <button className="rounded border border-dashed border-ink-line px-2 py-1 text-xs text-ink-soft hover:bg-page" onClick={() => setZoneFor(w)}>+ Plant</button>
            </div>
          </div>
        ))}
      </div>
      <WarehouseForm open={editing !== undefined} warehouse={editing} onClose={() => setEditing(undefined)} />
      <Modal open={!!zoneFor} onClose={() => setZoneFor(null)} size="sm" title={`Tambah Plant - ${zoneFor?.name}`}
        footer={<><button className="btn-outline" onClick={() => setZoneFor(null)}>Batal</button><button type="submit" form="zone-form" className="btn-primary">Simpan</button></>}>
        <form id="zone-form" onSubmit={addZone} className="space-y-4">
          <FormInput label="Nama Plant" required value={zone.name} onChange={(e) => setZone({ ...zone, name: e.target.value })} placeholder="Plant Cikarang" />
          <FormInput label="Kode" required value={zone.code} onChange={(e) => setZone({ ...zone, code: e.target.value })} placeholder="E" />
        </form>
      </Modal>
      <ConfirmDialog open={!!deleting} message={`Hapus warehouse ${deleting?.name}? Semua aset, work order, dan stok di dalamnya ikut terhapus.`} onClose={() => setDeleting(null)} onConfirm={remove} />
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const tabs = [
    { id: 'profile', label: 'Profile' },
    ...(can(user, 'users') ? [{ id: 'users', label: 'Users & roles' }] : []),
    ...(can(user, 'warehouses') ? [{ id: 'warehouses', label: 'Warehouses' }] : []),
  ];
  const [tab, setTab] = useState('profile');
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-ink-soft">Profil, manajemen user & role, serta warehouse.</p>
      </div>
      <section className="card">
        <div className="flex gap-1 border-b border-ink-line px-4 pt-3">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === t.id ? 'border-brand-500 text-brand-600' : 'border-transparent text-ink-soft hover:text-ink'}`}>{t.label}</button>
          ))}
        </div>
        {tab === 'profile' && <Profile />}
        {tab === 'users' && <Users />}
        {tab === 'warehouses' && <Warehouses />}
      </section>
    </div>
  );
}
