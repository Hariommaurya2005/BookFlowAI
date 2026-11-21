const statusMap = {
  pending:   { label: 'Pending',   cls: 'badge-yellow' },
  confirmed: { label: 'Confirmed', cls: 'badge-blue' },
  completed: { label: 'Completed', cls: 'badge-green' },
  cancelled: { label: 'Cancelled', cls: 'badge-red' },
  no_show:   { label: 'No Show',   cls: 'badge-gray' },
};

export default function StatusBadge({ status }) {
  const s = statusMap[status] || { label: status, cls: 'badge-gray' };
  return <span className={s.cls}>{s.label}</span>;
}
