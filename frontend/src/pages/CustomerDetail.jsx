import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Gift, ArrowUpRight } from 'lucide-react';
import api from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import StatusBadge from '../components/ui/StatusBadge';
import { formatINR } from '../utils/currency';

export default function CustomerDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const autoSummaryRequested = useRef(false);
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    api.get(`/customers/${id}`).then(({ data }) => setData(data.data)).finally(() => setLoading(false));
  }, [id]);

  const generateSummary = async () => {
    setAiLoading(true);
    setAiError('');
    try {
      const { data } = await api.get(`/ai/customer-summary/${id}`);
      setSummary(data.data);
    } catch (error) {
      setAiError(error.response?.data?.message || 'Could not generate the customer summary. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (!location.state?.openCustomerSummary || loading || !data || autoSummaryRequested.current) return;
    autoSummaryRequested.current = true;
    // Remove the one-time navigation state so browser refresh does not trigger repeated AI calls.
    navigate(location.pathname, { replace: true, state: null });
    generateSummary();
  }, [location.state, location.pathname, loading, data, navigate]);

  useEffect(() => {
    autoSummaryRequested.current = false;
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!data) return null;

  const { customer, appointments } = data;

  return (
    <div className="space-y-6">
      <Link to="/customers" className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800">
        <ArrowLeft size={16} /> Back to Customers
      </Link>

      <div className="card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{customer.name}</h2>
            <p className="text-slate-500 text-sm mt-1">{customer.phone} {customer.email && `· ${customer.email}`}</p>
          </div>
          <button type="button" onClick={generateSummary} disabled={aiLoading} className="btn-primary w-full sm:w-auto">
            <Sparkles size={16} /> {aiLoading ? 'Generating summary…' : 'Generate AI Summary'}
          </button>
        </div>
        {customer.notes && <p className="text-sm text-slate-600 mt-4 bg-slate-50 p-3 rounded-lg">{customer.notes}</p>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-100 bg-violet-50/70 p-4">
        <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-violet-700"><Gift size={19} /></div><div><p className="text-xs font-semibold text-violet-700">Loyalty balance</p><p className="text-lg font-extrabold text-violet-950">{Number(customer.loyaltyPoints || 0).toLocaleString('en-IN')} points <span className="text-xs font-medium text-violet-700">· Lifetime {Number(customer.lifetimeLoyaltyPoints || 0).toLocaleString('en-IN')}</span></p></div></div>
        <Link to="/loyalty" className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-100">Manage rewards <ArrowUpRight size={14} /></Link>
      </div>
        {aiError && <p role="alert" className="text-sm text-rose-600 mt-3">{aiError}</p>}
      </div>

      {summary && (
        <div className="card p-6 bg-primary-50/50 border-primary-200">
          <div className="flex items-center justify-between gap-3 mb-3"><h3 className="font-semibold text-slate-800 flex items-center gap-2">✨ Customer visit summary</h3><span className={summary.aiPowered ? 'badge-green' : 'badge-gray'}>{summary.aiPowered ? 'Groq AI' : 'Calculated summary'}</span></div>
          {summary.notice && <p className="text-xs text-slate-500 mb-2">{summary.notice}</p>}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-primary-200 bg-white px-3 py-1 text-xs font-semibold capitalize text-primary-700">{(summary.relationshipStage || 'customer').replace('_', ' ')}</span>
            {summary.daysSinceLastVisit !== null && summary.daysSinceLastVisit !== undefined && <span className="text-xs text-slate-500">{summary.daysSinceLastVisit} day(s) since last visit</span>}
          </div>
          <p className="text-sm text-slate-700 mb-4 leading-relaxed">{summary.aiInsight}</p>
          {summary.recommendedAction && <div className="mb-4 rounded-xl border border-teal-200 bg-teal-50/70 p-4"><p className="text-xs font-bold uppercase tracking-wide text-teal-800 mb-1">Suggested follow-up</p><p className="text-sm leading-relaxed text-teal-900">{summary.recommendedAction}</p></div>}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div><p className="text-2xl font-bold text-primary-700">{summary.totalVisits}</p><p className="text-xs text-slate-500">Total Visits</p></div>
            <div><p className="text-2xl font-bold text-primary-700">{formatINR(summary.totalSpent)}</p><p className="text-xs text-slate-500">Total Spent</p></div>
            <div><p className="text-lg font-bold text-primary-700">{summary.favouriteService}</p><p className="text-xs text-slate-500">Favourite Service</p></div>
            <div><p className="text-2xl font-bold text-primary-700">{summary.noShows}</p><p className="text-xs text-slate-500">No Shows</p></div>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Appointment History</h3>
        </div>
        {appointments.length === 0 ? (
          <p className="text-sm text-slate-400 p-6 text-center">No appointment history.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
            <caption className="sr-only">Customer appointment history</caption>
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium">Staff</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {appointments.map((a) => (
                <tr key={a._id}>
                  <td className="px-4 py-3 font-medium text-slate-800">{a.serviceId?.name}</td>
                  <td className="px-4 py-3 text-slate-600">{a.staffId?.name}</td>
                  <td className="px-4 py-3 text-slate-600">{new Date(a.appointmentDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
