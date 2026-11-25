import { useEffect, useState } from 'react';
import { FileDown, FileSpreadsheet, Loader2 } from 'lucide-react';
import api, { errMsg } from '../api/client';
import { Spinner } from '../components/ui';
import { useFacility } from '../context/FacilityContext';
import { useToast } from '../context/ToastContext';

const REPORTS = [
  { slug: 'assets', label: 'Asset Report', desc: 'Daftar aset, kondisi, dan status', dates: false },
  { slug: 'maintenance', label: 'Maintenance Report', desc: 'Riwayat maintenance per aset', dates: true },
  { slug: 'work-orders', label: 'Work Order Report', desc: 'Seluruh work order dan statusnya', dates: true },
  { slug: 'inventory', label: 'Inventory Report', desc: 'Posisi stok dan status re-order', dates: false },
  { slug: 'stock-movements', label: 'Stock Movement Report', desc: 'Stock in, out, dan adjustment', dates: true },
  { slug: 'asset-downtime', label: 'Asset Downtime Report', desc: 'Lama downtime dari WO corrective', dates: true },
];

export default function Reports() {
  const { warehouseId } = useFacility();
  const toast = useToast();
  const [slug, setSlug] = useState('assets');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState('');
  const current = REPORTS.find((r) => r.slug === slug);
  const params = { warehouse: warehouseId, date_from: current.dates ? dateFrom || undefined : undefined, date_to: current.dates ? dateTo || undefined : undefined };

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get(`/reports/${slug}/`, { params })
      .then((r) => active && setData(r.data))
      .catch((e) => active && (toast.error(errMsg(e)), setData(null)))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [slug, dateFrom, dateTo, warehouseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const download = async (kind) => {
    setExporting(kind);
    try {
      const res = await api.get(`/reports/${slug}/`, { params: { ...params, export: kind }, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug}.${kind}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Laporan ${kind.toUpperCase()} diunduh.`);
    } catch (e) {
      toast.error('Gagal mengekspor laporan.');
    } finally {
      setExporting('');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-ink-soft">Pratinjau laporan dan ekspor ke PDF atau Excel.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((r) => (
          <button key={r.slug} onClick={() => setSlug(r.slug)} className={`card p-4 text-left transition ${slug === r.slug ? '!border-brand-500 ring-2 ring-brand-100' : 'hover:border-ink-muted'}`}>
            <p className="font-semibold">{r.label}</p>
            <p className="mt-0.5 text-sm text-ink-soft">{r.desc}</p>
          </button>
        ))}
      </div>

      <section className="card">
        <div className="flex flex-wrap items-end gap-3 border-b border-ink-line p-4">
          <div className="mr-auto">
            <h3 className="font-semibold">{current.label}</h3>
            <p className="text-xs text-ink-muted">{data ? `${data.total} baris${data.total > 200 ? ' (pratinjau 200 baris pertama)' : ''}` : ''}</p>
          </div>
          {current.dates && (
            <>
              <label className="text-xs text-ink-soft">Dari<input type="date" className="input mt-1" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></label>
              <label className="text-xs text-ink-soft">Sampai<input type="date" className="input mt-1" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></label>
            </>
          )}
          <button className="btn-outline" disabled={!!exporting} onClick={() => download('xlsx')}>{exporting === 'xlsx' ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />} Excel</button>
          <button className="btn-primary" disabled={!!exporting} onClick={() => download('pdf')}>{exporting === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />} PDF</button>
        </div>
        {loading || !data ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full min-w-[640px]">
              <thead className="sticky top-0 border-b border-ink-line bg-page"><tr>{data.headers.map((h) => <th key={h} className="th whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-ink-line">
                {data.rows.length === 0 && <tr><td colSpan={data.headers.length} className="td py-10 text-center text-ink-muted">Tidak ada data pada filter ini.</td></tr>}
                {data.rows.map((row, i) => <tr key={i}>{row.map((c, j) => <td key={j} className="td">{c}</td>)}</tr>)}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
