export const fmtDate = (value) => {
  if (!value) return '-';
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const fmtDateTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const todayIso = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const pct = (part, total) => (total ? Math.round((part / total) * 1000) / 10 : 0);

/** Buang nilai kosong dari objek params sebelum dikirim ke API. */
export const cleanParams = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v !== null && v !== undefined && v !== false));

export const STATUS_LABEL = {
  open: 'Open',
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  completed: 'Completed',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
  operational: 'Operational',
  maintenance: 'Maintenance',
  offline: 'Offline',
};
