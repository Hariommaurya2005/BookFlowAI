export default function StatCard({ title, value, icon: Icon, color = 'blue', subtitle }) {
  const colors = {
    blue:   { bg: 'bg-primary-50', icon: 'text-primary-600', val: 'text-primary-700' },
    green:  { bg: 'bg-teal-50',    icon: 'text-teal-600',    val: 'text-teal-700' },
    purple: { bg: 'bg-violet-50',  icon: 'text-violet-600',  val: 'text-violet-700' },
    orange: { bg: 'bg-amber-50',   icon: 'text-amber-600',   val: 'text-amber-700' },
    red:    { bg: 'bg-rose-50',    icon: 'text-rose-600',   val: 'text-rose-700' },
  };
  const c = colors[color] || colors.blue;

  return (
    <div className="card p-6 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
        <Icon size={22} className={c.icon} />
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <p className={`text-2xl font-bold ${c.val}`}>{value ?? '—'}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
