const TONE = {
  danger: 'text-brand-600',
  warning: 'text-amber-600',
  success: 'text-green-600',
  neutral: 'text-ink-muted',
};
const DOT = { danger: 'bg-brand-500', warning: 'bg-amber-400', success: 'bg-green-500', neutral: 'bg-gray-300' };

export default function SummaryCard({ title, value, note, icon: Icon, tone = 'neutral', highlight = false, loading }) {
  return (
    <div className="p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm text-ink-soft">{title}</p>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${highlight ? 'bg-brand-50 text-brand-500' : 'bg-page text-ink-muted'}`}>
          <Icon size={16} />
        </span>
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight">{loading ? '-' : value}</p>
      <p className={`mt-2 flex items-center gap-1.5 text-xs ${TONE[tone]}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${DOT[tone]}`} />
        {note}
      </p>
    </div>
  );
}
