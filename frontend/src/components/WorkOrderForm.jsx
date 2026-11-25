import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import api, { errMsg, fieldErrors, notifyChange } from '../api/client';
import { useFacility } from '../context/FacilityContext';
import { useToast } from '../context/ToastContext';
import useLookups from '../hooks/useLookups';
import { todayIso } from '../utils/format';
import { FormInput, FormSelect, FormTextarea, Modal } from './ui';

const EMPTY = {
  title: '', asset: '', zone: '', wo_type: 'corrective', priority: 'medium', status: 'open',
  due_date: todayIso(), assigned_to: '', description: '', notes: '',
};

export const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];
export const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function WorkOrderForm({ open, onClose, workOrder }) {
  const { warehouseId } = useFacility();
  const toast = useToast();
  const { assets, zones, users } = useLookups(warehouseId);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      workOrder
        ? {
            title: workOrder.title, asset: workOrder.asset || '', zone: workOrder.zone || '', wo_type: workOrder.wo_type,
            priority: workOrder.priority, status: workOrder.status, due_date: workOrder.due_date,
            assigned_to: workOrder.assigned_to || '', description: workOrder.description || '', notes: workOrder.notes || '',
          }
        : { ...EMPTY, due_date: todayIso() }
    );
  }, [open, workOrder]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onAsset = (e) => {
    const id = e.target.value;
    const asset = assets.find((a) => String(a.id) === id);
    setForm((f) => ({ ...f, asset: id, zone: asset?.zone ? String(asset.zone) : f.zone }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.title.trim()) errs.title = 'Judul wajib diisi.';
    if (!form.due_date) errs.due_date = 'Due date wajib diisi.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const payload = {
      ...form,
      asset: form.asset || null,
      zone: form.zone || null,
      assigned_to: form.assigned_to || null,
      warehouse: workOrder ? workOrder.warehouse : warehouseId,
    };
    setSaving(true);
    try {
      if (workOrder) await api.patch(`/work-orders/${workOrder.id}/`, payload);
      else await api.post('/work-orders/', payload);
      toast.success(workOrder ? 'Work order diperbarui.' : 'Work order dibuat.');
      notifyChange();
      onClose(true);
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const techs = users.filter((u) => ['technician', 'maintenance_supervisor'].includes(u.role));

  return (
    <Modal
      open={open}
      onClose={() => onClose(false)}
      size="lg"
      title={workOrder ? `Edit ${workOrder.wo_number}` : 'Create work order'}
      footer={
        <>
          <button type="button" className="btn-outline" onClick={() => onClose(false)}>Batal</button>
          <button type="submit" form="wo-form" className="btn-primary" disabled={saving}>
            {saving && <Loader2 size={16} className="animate-spin" />} Simpan
          </button>
        </>
      }
    >
      <form id="wo-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <FormInput className="sm:col-span-2" label="Judul pekerjaan" required value={form.title} onChange={set('title')} error={errors.title} placeholder="Mis. Conveyor belt inspection" />
        <FormSelect label="Nama Material" value={form.asset} onChange={onAsset} error={errors.asset} options={assets.map((a) => ({ value: a.id, label: `${a.asset_id} - ${a.name}` }))} />
        <FormSelect label="Plant" value={form.zone} onChange={set('zone')} error={errors.zone} options={zones.map((z) => ({ value: z.id, label: z.name }))} />
        <FormSelect label="No Mesin" value={form.wo_type} onChange={set('wo_type')} placeholder="" options={[{ value: 'corrective', label: 'Corrective' }, { value: 'preventive', label: 'Preventive' }]} />
        <FormSelect label="Prioritas" value={form.priority} onChange={set('priority')} placeholder="" options={PRIORITY_OPTIONS} />
        <FormSelect label="Status" value={form.status} onChange={set('status')} placeholder="" options={STATUS_OPTIONS} />
        <FormInput label="Due date" type="date" required value={form.due_date} onChange={set('due_date')} error={errors.due_date} />
        <FormSelect className="sm:col-span-2" label="Ditugaskan ke (teknisi)" value={form.assigned_to} onChange={set('assigned_to')} error={errors.assigned_to} options={techs.map((u) => ({ value: u.id, label: `${u.full_name} (${u.role_display})` }))} />
        <FormTextarea className="sm:col-span-2" label="Deskripsi" value={form.description} onChange={set('description')} />
        <FormTextarea className="sm:col-span-2" label="Catatan pekerjaan" value={form.notes} onChange={set('notes')} />
      </form>
    </Modal>
  );
}
