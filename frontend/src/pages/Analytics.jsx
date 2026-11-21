import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatINR, formatINRCompact } from '../utils/currency';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/dashboard/analytics', { params: { period } })
      .then(({ data }) => setData(data.data))
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) return <LoadingSpinner />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <select className="input w-44" value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Daily Revenue</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.dailyRevenue}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="_id" fontSize={11} stroke="#64748b" />
            <YAxis fontSize={11} stroke="#64748b" tickFormatter={formatINRCompact} />
            <Tooltip formatter={(value) => formatINR(value)} />
            <Line type="monotone" dataKey="revenue" name="Revenue (₹)" stroke="#6258e8" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Daily Appointments</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.dailyAppointments}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="_id" fontSize={11} stroke="#64748b" />
            <YAxis fontSize={11} stroke="#64748b" />
            <Tooltip />
            <Bar dataKey="count" fill="#17b89a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
