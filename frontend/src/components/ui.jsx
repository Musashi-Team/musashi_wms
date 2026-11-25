import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Search, X } from 'lucide-react';
import { STATUS_LABEL } from '../utils/format';

const STATUS_STYLE = {
  overdue: 'bg-brand-50 text-brand-600',
  in_progress: 'bg-blue-50 text-blue-700',
  open: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-green-50 text-green-700',
  completed: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-400 line-through',
  operational: 'bg-green-50 text-green-700',
  maintenance: 'bg-amber-50 text-amber-700',
  offline: 'bg-brand-50 text-brand-600',
};

export function StatusBadge({ status }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status] || 'bg-gray-100 text-gray-700'}`}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

const PRIORITY_DOT = { high: 'bg-brand-500', medium: 'bg-amber-400', low: 'bg-green-500' };
export function PriorityBadge({ priority }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[priority] || 'bg-gray-400'}`} />
      <span className="capitalize">{priority}</span>
    </span>
  );
}

const STOCK_STYLE = {
  ok: ['bg-green-50 text-green-700', 'OK'],
  reorder: ['bg-amber-50 text-amber-700', 'Re-order'],
  critical: ['bg-brand-50 text-brand-600', 'Critical'],
  out: ['bg-brand-100 text-brand-700', 'Out of stock'],
  over: ['bg-blue-50 text-blue-700', 'Overstock'],
};
export function StockBadge({ status }) {
  const [cls, label] = STOCK_STYLE[status] || STOCK_STYLE.ok;
  return <span className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

export function SearchInput({ value, onChange, placeholder = 'Search...', className = '' }) {
  const [local, setLocal] = useState(value || '');
  useEffect(() => setLocal(value || ''), [value]);
  useEffect(() => {
    const t = setTimeout(() => local !== (value || '') && onChange(local), 350);
    return () => clearTimeout(t);
  }, [local]);
  return (
    <div className={`relative ${className}`}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
      <input className="input pl-9" value={local} placeholder={placeholder} onChange={(e) => setLocal(e.target.value)} />
    </div>
  );
}

export function FilterDropdown({ value, onChange, options, placeholder = 'All', className = '' }) {
  return (
    <select className={`input w-auto min-w-[8.5rem] ${className}`} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/* ---------- Pagination ---------- */
export function Pagination({ page, pageSize, count, onChange }) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  const from = count ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, count);
  return (
    <div className="flex items-center justify-between gap-3 border-t border-ink-line px-4 py-3 text-sm text-ink-soft">
      <span>
        {from}-{to} of {count}
      </span>
      <div className="flex items-center gap-2">
        <button className="btn-outline !px-2 !py-1.5" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
          <ChevronLeft size={16} />
        </button>
        <span>
          {page} / {pages}
        </span>
        <button className="btn-outline !px-2 !py-1.5" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

export function DataTable({ columns, rows, loading, error, empty = 'Tidak ada data.', rowKey = 'id', onRowClick }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead className="border-b border-ink-line bg-page/60">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={`th ${c.className || ''}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-line">
          {loading && (
            <tr>
              <td colSpan={columns.length} className="td py-10 text-center text-ink-muted">
                <Loader2 className="mx-auto animate-spin" size={20} />
              </td>
            </tr>
          )}
          {!loading && error && (
            <tr>
              <td colSpan={columns.length} className="td py-8 text-center text-brand-600">
                {error}
              </td>
            </tr>
          )}
          {!loading && !error && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="td py-10 text-center text-ink-muted">
                {empty}
              </td>
            </tr>
          )}
          {!loading &&
            !error &&
            rows.map((row) => (
              <tr key={row[rowKey]} className={onRowClick ? 'cursor-pointer hover:bg-page/60' : 'hover:bg-page/40'} onClick={() => onRowClick?.(row)}>
                {columns.map((c) => (
                  <td key={c.key} className={`td ${c.className || ''}`}>
                    {c.render ? c.render(row) : row[c.key] ?? '-'}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Modal ---------- */
export function Modal({ open, title, onClose, children, size = 'md', footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  const width = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`flex max-h-[92vh] w-full ${width} flex-col rounded-t-xl bg-white shadow-xl sm:rounded-xl`}>
        <div className="flex items-center justify-between border-b border-ink-line px-5 py-4">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded p-1 text-ink-muted hover:bg-page" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-ink-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title = 'Konfirmasi', message, confirmLabel = 'Hapus', onConfirm, onClose, busy }) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>
            Batal
          </button>
          <button className="btn-primary" onClick={onConfirm} disabled={busy}>
            {busy && <Loader2 size={16} className="animate-spin" />} {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-ink-soft">{message}</p>
    </Modal>
  );
}

export function Field({ label, error, required, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-ink-soft">
        {label} {required && <span className="text-brand-500">*</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-ink-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-brand-600">{error}</span>}
    </label>
  );
}

export function FormInput({ label, error, required, hint, className, ...props }) {
  return (
    <Field label={label} error={error} required={required} hint={hint} className={className}>
      <input className="input" {...props} />
    </Field>
  );
}

export function FormSelect({ label, error, required, options, placeholder = '- pilih -', className, ...props }) {
  return (
    <Field label={label} error={error} required={required} className={className}>
      <select className="input" {...props}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function FormTextarea({ label, error, required, className, ...props }) {
  return (
    <Field label={label} error={error} required={required} className={className}>
      <textarea className="input min-h-[80px]" {...props} />
    </Field>
  );
}

export function Spinner({ className = '' }) {
  return <Loader2 className={`animate-spin text-ink-muted ${className}`} size={20} />;
}

export function EmptyState({ children }) {
  return <p className="px-4 py-8 text-center text-sm text-ink-muted">{children}</p>;
}
