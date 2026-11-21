import { useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import api from '../services/api';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function Notifications() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    setLoading(true);
    api.get('/notifications').then(({ data }) => setData(data.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const markRead = async (id) => {
    await api.put(`/notifications/${id}/read`);
    fetchData();
  };

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    fetchData();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={markAllRead} className="btn-secondary text-sm">
          <CheckCheck size={16} /> Mark all as read
        </button>
      </div>

      <div className="card overflow-hidden">
        {!data || data.notifications.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications" description="You're all caught up!" />
        ) : (
          <div className="divide-y divide-slate-100">
            {data.notifications.map((n) => (
              <div
                key={n._id}
                onClick={() => !n.read && markRead(n._id)}
                className={`p-4 cursor-pointer hover:bg-slate-50 ${!n.read ? 'bg-primary-50/50' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <p className="font-medium text-sm text-slate-800">{n.title}</p>
                  {!n.read && <span className="w-2 h-2 bg-primary-600 rounded-full mt-1 shrink-0" />}
                </div>
                <p className="text-sm text-slate-500 mt-0.5">{n.message}</p>
                <p className="text-xs text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
