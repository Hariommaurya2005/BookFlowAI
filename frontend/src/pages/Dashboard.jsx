import { useEffect, useState } from 'react';
import { Calendar, Users, IndianRupee, UserCheck, CalendarCheck, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../services/api';
import StatCard from '../components/ui/StatCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import StatusBadge from '../components/ui/StatusBadge';
import { formatINR, formatINRCompact } from '../utils/currency';

const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const COLORS = ['#6258e8', '#17b89a', '#f0ad4e', '#ef5e77', '#9288fa'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [insights, setInsights] = useState([]);
  const [insightsPowered, setInsightsPowered] = useState(false);
  const [insightLoading, setInsightLoading] = useState(true);
  const [insightError, setInsightError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchInsights = async () => {
    setInsightLoading(true);
    setInsightError('');
    try {
      const { data: response } = await api.get('/ai/insights');
      setInsights(response.data?.insights || []);
      setInsightsPowered(Boolean(response.data?.aiPowered));
    } catch (error) {
      setInsights([]);
      setInsightsPowered(false);
      setInsightError(error.response?.data?.message || 'Business insights could not be loaded. Check the backend and Groq configuration, then retry.');
    } finally { setInsightLoading(false); }
  };

  useEffect(() => {
    api.get('/dashboard')
      .then(({ data: response }) => setData(response.data))
      .finally(() => setLoading(false));
    fetchInsights();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!data) return null;

  const { stats, monthlyTrend, topServices, todayList, statusBreakdown } = data;

  const trendData = monthlyTrend.map((m) => ({
    name: `${monthNames[m._id.month - 1]}`,
    appointments: m.count,
    revenue: m.revenue,
  }));

  const pieData = statusBreakdown.map((s) => ({ name: s._id, value: s.count }));

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Appointments" value={stats.totalAppointments} icon={Calendar} color="blue" />
        <StatCard title="Today's Appointments" value={stats.todayAppointments} icon={CalendarCheck} color="purple" />
        <StatCard title="Revenue" value={formatINR(stats.totalRevenue)} icon={IndianRupee} color="green" />
        <StatCard title="Active Customers" value={stats.activeCustomers} icon={Users} color="orange" />
        <StatCard title="Active Staff" value={stats.activeStaff} icon={UserCheck} color="red" />
      </div>

      {/* AI Insights: always visible so an endpoint failure is not mistaken for a missing feature. */}
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-violet-50/70 via-white to-teal-50/60 px-5 py-4">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary-600 to-violet-500 text-white shadow-sm"><Sparkles size={18} /></span><div><h3 className="font-extrabold text-slate-900">AI Business Insights</h3><p className="mt-0.5 text-xs text-slate-500">Business-level trends, evidence and suggested actions</p></div></div>
          <div className="flex items-center gap-2"><span className={insightsPowered ? 'badge-green' : 'badge-gray'}>{insightsPowered ? 'Groq AI' : 'Calculated fallback'}</span><button type="button" onClick={fetchInsights} disabled={insightLoading} className="btn-secondary" aria-label="Refresh AI business insights"><RefreshCw size={14} className={insightLoading ? 'animate-spin' : ''} /> Refresh</button></div>
        </div>
        <div className="p-5">
          {insightError && <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle size={16} className="mt-0.5 shrink-0" />{insightError}</div>}
          {insightLoading ? <div className="flex items-center gap-2 py-5 text-sm text-slate-500"><RefreshCw size={16} className="animate-spin text-primary-600" />Generating business insights…</div>
            : insights.length > 0 ? <div className="grid grid-cols-1 gap-3 md:grid-cols-3">{insights.map((ins, i) => (
              <article key={`${ins.category || 'insight'}-${i}`} className="rounded-xl border border-slate-200/80 bg-white p-4 text-sm text-slate-700 shadow-sm">
                <div className="mb-2 flex items-start gap-2"><span className="text-lg" aria-hidden="true">{ins.icon || '✨'}</span><h4 className="font-semibold text-slate-900">{ins.title || 'Business insight'}</h4></div>
                <p className="leading-relaxed">{ins.text}</p>
                {ins.action && <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-relaxed text-primary-700"><span className="font-semibold">Suggested action:</span> {ins.action}</p>}
              </article>
            ))}</div>
            : !insightError && <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">No insights available yet. Add appointment activity, then refresh to generate an evidence-based business brief.</div>}
          {insights.length > 0 && !insightsPowered && <p className="mt-3 text-xs text-slate-400">These are calculated fallback insights. Configure a valid GROQ_API_KEY to enable Groq-generated explanations.</p>}
        </div>
      </section>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-semibold text-slate-800 mb-4">Appointment & Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
              <YAxis yAxisId="appointments" stroke="#64748b" fontSize={12} allowDecimals={false} />
              <YAxis yAxisId="revenue" orientation="right" stroke="#64748b" fontSize={12} tickFormatter={formatINRCompact} />
              <Tooltip formatter={(value, name) => name === 'Revenue (₹)' ? formatINR(value) : value} />
              <Line yAxisId="appointments" type="monotone" dataKey="appointments" stroke="#6258e8" strokeWidth={2} name="Appointments" />
              <Line yAxisId="revenue" type="monotone" dataKey="revenue" stroke="#17b89a" strokeWidth={2} name="Revenue (₹)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-semibold text-slate-800 mb-4">Today's Schedule</h3>
          {todayList.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No appointments today.</p>
          ) : (
            <div className="space-y-2">
              {todayList.map((a) => (
                <div key={a._id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm text-slate-800">{a.customerId?.name}</p>
                    <p className="text-xs text-slate-500">{a.serviceId?.name} · {a.staffId?.name} · {a.appointmentTime}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Top Services</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topServices} layout="vertical">
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={90} fontSize={11} stroke="#64748b" />
              <Tooltip />
              <Bar dataKey="count" fill="#6258e8" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
