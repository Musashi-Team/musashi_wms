import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function ActivityChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} barGap={4} barCategoryGap="22%">
        <CartesianGrid vertical={false} stroke="#EEF0F3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#8A91A0' }} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#8A91A0' }} width={30} />
        <Tooltip cursor={{ fill: '#F5F6F8' }} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
        <Bar dataKey="completed" name="Completed" fill="#EF2935" radius={[3, 3, 0, 0]} maxBarSize={14} />
        <Bar dataKey="created" name="Created" fill="#C9CDD4" radius={[3, 3, 0, 0]} maxBarSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const COLORS = { operational: '#3C414B', maintenance: '#B5BAC3', offline: '#EF2935' };

export function AssetHealthChart({ assets }) {
  const data = ['operational', 'maintenance', 'offline'].map((k) => ({ key: k, value: assets[k] }));
  const empty = assets.total === 0;
  return (
    <div className="relative h-[170px] w-[170px] shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={empty ? [{ key: 'none', value: 1 }] : data} dataKey="value" innerRadius={58} outerRadius={80} stroke="#fff" strokeWidth={2} startAngle={90} endAngle={-270}>
            {(empty ? [{ key: 'none' }] : data).map((d) => (
              <Cell key={d.key} fill={COLORS[d.key] || '#E7E9EE'} />
            ))}
          </Pie>
          {!empty && <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />}
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold">{assets.total}</span>
        <span className="text-[10px] uppercase tracking-wide text-ink-muted">Total assets</span>
      </div>
    </div>
  );
}

export const HEALTH_COLORS = COLORS;
