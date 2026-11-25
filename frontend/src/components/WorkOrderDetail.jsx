import { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Loader2, Paperclip, Trash2, Upload } from 'lucide-react';
import api, { errMsg, notifyChange } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { can } from '../utils/permissions';
import { fmtDate, fmtDateTime } from '../utils/format';
import { STATUS_OPTIONS } from './WorkOrderForm';
import { Modal, PriorityBadge, Spinner, StatusBadge } from './ui';

function Row({ label, children }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</p>
      <div className="mt-0.5 text-sm">{children || '-'}</div>
    </div>
  );
}

export default function WorkOrderDetail({ workOrderId, onClose }) {
  const { user } = useAuth();
  const toast = useToast();
  const fileRef = useRef(null);
  const [wo, setWo] = useState(null);
  const [logs, setLogs] = useState([]);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([api.get(`/work-orders/${workOrderId}/`), api.get(`/work-orders/${workOrderId}/history/`)]);
      setWo(a.data);
      setNotes(a.data.notes || '');
      setLogs(b.data);
    } catch (e) {
      toast.error(errMsg(e));
      onClose();
    }
  }, [workOrderId]); 

  useEffect(() => {
    setWo(null);
    if (workOrderId) load();
  }, [workOrderId, load]);

  // Teknisi hanya boleh mengubah WO yang ditugaskan kepadanya
  const canUpdate = wo && can(user, 'workOrderUpdate') && (user.role !== 'technician' || wo.assigned_to === user.id);

  const patch = async (data, okMsg) => {
    setBusy(true);
    try {
      await api.patch(`/work-orders/${wo.id}/`, data);
      toast.success(okMsg);
      notifyChange();
      await load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    setBusy(true);
    try {
      await api.post(`/work-orders/${wo.id}/attachments/`, fd);
      toast.success('Dokumentasi diunggah.');
      await load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  const removeAtt = async (id) => {
    try {
      await api.delete(`/work-orders/${wo.id}/attachments/${id}/`);
      await load();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <Modal open={!!workOrderId} onClose={onClose} size="lg" title={wo ? `${wo.wo_number} - ${wo.title}` : 'Work order'}>
      {!wo ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Row label="Status"><StatusBadge status={wo.status} /></Row>
            <Row label="Priority"><PriorityBadge priority={wo.priority} /></Row>
            <Row label="Type"><span className="capitalize">{wo.wo_type}</span></Row>
            <Row label="Asset">{wo.asset_name && `${wo.asset_code} - ${wo.asset_name}`}</Row>
            <Row label="Zone">{wo.zone_name}</Row>
            <Row label="Due date">{fmtDate(wo.due_date)}</Row>
            <Row label="Assigned to">{wo.assigned_to_name}</Row>
            <Row label="Created by">{wo.created_by_name}</Row>
            <Row label="Completed">{wo.completed_at ? fmtDateTime(wo.completed_at) : null}</Row>
          </div>
          {wo.description && <Row label="Description">{wo.description}</Row>}

          {canUpdate && (
            <div className="rounded-lg bg-page p-4">
              <p className="mb-3 text-sm font-semibold">Update pekerjaan</p>
              <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
                <select className="input" value={wo.status} disabled={busy} onChange={(e) => patch({ status: e.target.value }, 'Status diperbarui.')}>
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <textarea className="input min-h-[40px] flex-1" placeholder="Catatan pekerjaan..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                  <button className="btn-primary self-start" disabled={busy || notes === (wo.notes || '')} onClick={() => patch({ notes }, 'Catatan disimpan.')}>
                    Simpan
                  </button>
                </div>
              </div>
            </div>
          )}
          {!canUpdate && wo.notes && <Row label="Notes">{wo.notes}</Row>}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold"><Paperclip size={16} /> Dokumentasi</p>
              {canUpdate && (
                <>
                  <input ref={fileRef} type="file" className="hidden" onChange={upload} />
                  <button className="btn-outline !py-1.5" disabled={busy} onClick={() => fileRef.current?.click()}>
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Upload
                  </button>
                </>
              )}
            </div>
            {wo.attachments.length === 0 ? (
              <p className="text-sm text-ink-muted">Belum ada dokumentasi.</p>
            ) : (
              <ul className="divide-y divide-ink-line rounded-lg border border-ink-line">
                {wo.attachments.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <FileText size={16} className="text-ink-muted" />
                    <a href={a.file} target="_blank" rel="noreferrer" className="flex-1 truncate text-brand-600 hover:underline">
                      {decodeURIComponent(a.file.split('/').pop())}
                    </a>
                    <span className="hidden text-xs text-ink-muted sm:block">{fmtDateTime(a.created_at)}</span>
                    {canUpdate && (
                      <button onClick={() => removeAtt(a.id)} className="text-ink-muted hover:text-brand-600" aria-label="Delete attachment">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">Riwayat</p>
            <ul className="space-y-2 border-l-2 border-ink-line pl-4">
              {logs.map((l) => (
                <li key={l.id} className="text-sm">
                  <p>{l.detail || l.action}</p>
                  <p className="text-xs text-ink-muted">{l.user_name || 'System'} - {fmtDateTime(l.created_at)}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Modal>
  );
}
