import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowRight, Eye, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import api, { errMsg, notifyChange } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useFacility } from '../context/FacilityContext';
import { useToast } from '../context/ToastContext';
import useList from '../hooks/useList';
import { can } from '../utils/permissions';
import { fmtDate } from '../utils/format';
import { ConfirmDialog, DataTable, FilterDropdown, Pagination, PriorityBadge, SearchInput, StatusBadge } from './ui';
import WorkOrderDetail from './WorkOrderDetail';
import WorkOrderForm, { PRIORITY_OPTIONS, STATUS_OPTIONS } from './WorkOrderForm';

export default function WorkOrdersPanel({ compact = false, counts }) {
  const { user } = useAuth();
  const { warehouseId } = useFacility();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(compact ? '' : searchParams.get('search') || '');
  const [tab, setTab] = useState('all');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [ordering, setOrdering] = useState('due_date');
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState(null);
  const [editing, setEditing] = useState(undefined);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const urlSearch = searchParams.get('search') || '';
  useEffect(() => {
    if (!compact) {
      setSearch(urlSearch);
      setPage(1);
    }
  }, [urlSearch, compact]);

  const pageSize = compact ? 5 : 10;
  const { results, count, loading, error } = useList('/work-orders/', {
    warehouse: warehouseId,
    search,
    status: tab === 'overdue' ? 'overdue' : status,
    due_today: tab === 'due_today' ? true : '',
    active: compact && !status && tab === 'all' ? true : '',
    priority,
    ordering,
    page,
    page_size: pageSize,
  });

  const canCreate = can(user, 'workOrders');
  const reset = (fn) => (v) => {
    fn(v);
    setPage(1);
  };

  const onSearch = (v) => {
    setSearch(v);
    setPage(1);
    if (!compact) setSearchParams(v ? { search: v } : {});
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/work-orders/${deleting.id}/`);
      toast.success(`${deleting.wo_number} dihapus.`);
      setDeleting(null);
      notifyChange();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const dateHeader = (
    <button className="inline-flex items-center gap-1 uppercase" onClick={() => setOrdering((o) => (o === 'due_date' ? '-due_date' : 'due_date'))}>
      Due date {ordering === 'due_date' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
    </button>
  );

  const columns = [
    { key: 'wo_number', header: compact ? 'Work order / Asset' : 'ID', render: (r) => (
      compact ? (
        <div className="flex items-center gap-3">
          <span className="w-14 shrink-0 text-xs text-ink-muted">{r.wo_number}</span>
          <div>
            <p className="font-medium">{r.title}</p>
            <p className="text-xs text-ink-muted">{r.asset_name || '-'}</p>
          </div>
        </div>
      ) : <span className="text-xs font-medium">{r.wo_number}</span>
    ) },
    ...(compact ? [] : [{ key: 'title', header: 'Work order / Asset', render: (r) => (
      <div>
        <p className="font-medium">{r.title}</p>
        <p className="text-xs text-ink-muted">{r.asset_name || '-'}</p>
      </div>
    ) }]),
    { key: 'zone_name', header: 'Zone' },
    { key: 'priority', header: 'Priority', render: (r) => <PriorityBadge priority={r.priority} /> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'due_date', header: dateHeader, render: (r) => <span className={r.status === 'overdue' ? 'font-medium text-brand-600' : ''}>{fmtDate(r.due_date)}</span> },
    { key: 'assigned_to_name', header: 'Assigned to' },
    { key: 'action', header: 'Action', className: 'text-right', render: (r) => (
      <div className="flex justify-end gap-1">
        {compact ? (
          <button className="rounded p-1.5 text-ink-muted hover:bg-page" onClick={() => setDetailId(r.id)} aria-label="View detail">
            <MoreHorizontal size={18} />
          </button>
        ) : (
          <>
            <button className="rounded p-1.5 text-ink-muted hover:bg-page" onClick={() => setDetailId(r.id)} aria-label="View detail"><Eye size={16} /></button>
            {canCreate && (
              <>
                <button className="rounded p-1.5 text-ink-muted hover:bg-page" onClick={() => setEditing(r)} aria-label="Edit"><Pencil size={16} /></button>
                <button className="rounded p-1.5 text-ink-muted hover:bg-page hover:text-brand-600" onClick={() => setDeleting(r)} aria-label="Delete"><Trash2 size={16} /></button>
              </>
            )}
          </>
        )}
      </div>
    ) },
  ];

  const tabs = [
    { id: 'all', label: 'All orders' },
    { id: 'overdue', label: 'Overdue', n: counts?.overdue },
    { id: 'due_today', label: 'Due today', n: counts?.due_today },
  ];

  return (
    <section className="card">
      <div className="flex flex-wrap items-start justify-between gap-3 p-5">
        <div>
          <h3 className="text-base font-semibold">{compact ? 'Priority work orders' : 'All work orders'}</h3>
          <p className="text-sm text-ink-soft">{compact ? 'Keep upcoming and urgent tasks on track.' : 'Kelola, tugaskan, dan pantau semua pekerjaan maintenance.'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-ink-line bg-page p-0.5 text-xs font-medium">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => { setTab(t.id); setPage(1); }} className={`rounded-md px-3 py-1.5 ${tab === t.id ? 'bg-white text-ink shadow-sm' : 'text-ink-soft'}`}>
                {t.label} {t.n !== undefined && <span className="ml-1 text-ink-muted">{t.n}</span>}
              </button>
            ))}
          </div>
          {compact ? (
            <Link to="/work-orders" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
              View all orders <ArrowRight size={14} />
            </Link>
          ) : (
            canCreate && (
              <button className="btn-primary" onClick={() => setEditing(null)}>
                <Plus size={16} /> Create order
              </button>
            )
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-ink-line px-5 py-3">
        <SearchInput value={search} onChange={onSearch} placeholder="Search work order..." className="w-full sm:w-64" />
        {tab === 'all' && <FilterDropdown value={status} onChange={reset(setStatus)} options={STATUS_OPTIONS} placeholder="All status" />}
        <FilterDropdown value={priority} onChange={reset(setPriority)} options={PRIORITY_OPTIONS} placeholder="All priority" />
      </div>

      <DataTable columns={columns} rows={results} loading={loading} error={error} empty="Tidak ada work order yang sesuai." />
      <Pagination page={page} pageSize={pageSize} count={count} onChange={setPage} />

      <WorkOrderDetail workOrderId={detailId} onClose={() => setDetailId(null)} />
      <WorkOrderForm open={editing !== undefined} workOrder={editing} onClose={() => setEditing(undefined)} />
      <ConfirmDialog open={!!deleting} message={`Hapus ${deleting?.wo_number} - ${deleting?.title}? Tindakan ini tidak dapat dibatalkan.`} onClose={() => setDeleting(null)} onConfirm={confirmDelete} busy={busy} />
    </section>
  );
}
