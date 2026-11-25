import { ROLE_LABELS } from '../utils/permissions';

const FAQ = [
  ['Bagaimana membuat work order?', 'Klik "Create work order" di Dashboard atau halaman Work Orders, isi judul, aset, prioritas, due date, dan teknisi.'],
  ['Kapan work order menjadi Overdue?', 'Work order Open/Scheduled/In progress yang melewati due date otomatis ditandai Overdue.'],
  ['Bagaimana mencatat stok masuk dan keluar?', 'Di menu Inventory, gunakan ikon panah pada baris item (Stock In, Stock Out, Adjustment). Setiap perubahan tercatat di Stock movements.'],
  ['Bagaimana jadwal maintenance berulang bekerja?', 'Buat plan dengan frekuensi tertentu. Gunakan "Generate work order" untuk membuat WO dari plan; tanggal berikutnya maju otomatis.'],
  ['Bagaimana mengganti warehouse?', 'Gunakan dropdown "Current facility" di bagian bawah sidebar. Semua data mengikuti warehouse terpilih.'],
];

const ACCESS = [
  ['Super Admin', 'Semua modul termasuk user & role'],
  ['Warehouse Admin', 'Aset, work order, maintenance, inventory, warehouse'],
  ['Maintenance Supervisor', 'Aset, work order, maintenance plan'],
  ['Technician', 'Update status/catatan/dokumentasi pada work order miliknya'],
];

export default function Help() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Help center</h1>
        <p className="mt-1 text-sm text-ink-soft">Panduan singkat penggunaan MUSASHI WMS.</p>
      </div>
      <section className="card divide-y divide-ink-line">
        {FAQ.map(([q, a]) => (
          <div key={q} className="p-5"><p className="font-medium">{q}</p><p className="mt-1 text-sm text-ink-soft">{a}</p></div>
        ))}
      </section>
      <section className="card p-5">
        <h3 className="font-semibold">Hak akses per role</h3>
        <p className="mb-3 text-sm text-ink-soft">Semua role dapat melihat data; yang membedakan adalah hak mengubah.</p>
        <ul className="space-y-1.5 text-sm">
          {ACCESS.map(([r, d]) => (<li key={r}><b>{r}:</b> <span className="text-ink-soft">{d}</span></li>))}
        </ul>
        <p className="mt-3 text-xs text-ink-muted">Role terdaftar: {Object.values(ROLE_LABELS).join(', ')}.</p>
      </section>
      <section className="card p-5 text-sm text-ink-soft">
        Dokumentasi API (Swagger): <a className="font-medium text-brand-600 hover:underline" href="/api/docs/" target="_blank" rel="noreferrer">/api/docs/</a>
      </section>
    </div>
  );
}
