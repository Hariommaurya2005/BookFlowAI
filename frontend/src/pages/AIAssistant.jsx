import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Send, CalendarCheck, UserRound, Clock3, AlertCircle, CheckCircle2, Bot, RefreshCw, Users, HeartHandshake, BarChart3, UserCheck, Gift, ChevronRight } from 'lucide-react';
import api from '../services/api';
import Alert from '../components/ui/Alert';
import { formatINR } from '../utils/currency';

export default function AIAssistant() {
  const [query, setQuery] = useState('');
  const [staffId, setStaffId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [staffList, setStaffList] = useState([]);
  const [services, setServices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bookingSlot, setBookingSlot] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loadError, setLoadError] = useState('');
  const [retention, setRetention] = useState(null);
  const [retentionLoading, setRetentionLoading] = useState(false);
  const [retentionError, setRetentionError] = useState('');
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Hello! Tell me when you would like to visit. I will check the selected staff member and service against real availability.' },
  ]);

  useEffect(() => {
    let active = true;
    Promise.all([api.get('/staff'), api.get('/services'), api.get('/customers?limit=100')])
      .then(([staffResponse, serviceResponse, customerResponse]) => {
        if (!active) return;
        setStaffList(staffResponse.data.data || []);
        setServices(serviceResponse.data.data || []);
        setCustomers(customerResponse.data.data || []);
      })
      .catch(() => { if (active) setLoadError('Could not load your workspace lists. Please check the backend connection and refresh this page.'); });
    return () => { active = false; };
  }, []);

  const fetchRetention = async () => {
    setRetentionLoading(true);
    setRetentionError('');
    try {
      const { data } = await api.get('/ai/retention');
      setRetention(data.data);
    } catch (requestError) {
      setRetentionError(requestError.response?.data?.message || 'Customer retention analysis could not be loaded. Please retry.');
    } finally { setRetentionLoading(false); }
  };

  const handleAsk = async (event) => {
    event?.preventDefault?.();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) { setError('Describe the date or time you prefer.'); return; }
    if (!staffId || !serviceId) { setError('Select a staff member and service first.'); return; }
    setError('');
    setSuccess('');
    setResult(null);
    setMessages((current) => [...current, { role: 'user', text: trimmedQuery }]);
    setLoading(true);
    setQuery('');
    try {
      const { data } = await api.post('/ai/suggest', { query: trimmedQuery, staffId, serviceId });
      const payload = data.data;
      setResult(payload);
      setMessages((current) => [...current, { role: 'ai', text: payload.message || 'Here are the available times I found.' }]);
    } catch (requestError) {
      const message = requestError.response?.data?.message || 'I could not check availability. Please try again.';
      setMessages((current) => [...current, { role: 'ai', text: message }]);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const bookSlot = async (slot) => {
    if (!customerId) { setError('Select a customer before booking a suggested time.'); return; }
    if (!result?.date || !staffId || !serviceId) { setError('Run a new availability search before booking.'); return; }
    setError('');
    setSuccess('');
    setBookingSlot(slot);
    try {
      await api.post('/appointments', {
        customerId,
        serviceId,
        staffId,
        appointmentDate: result.date,
        appointmentTime: slot,
        notes: 'Created from BookFlow AI appointment assistant.',
      });
      const customerName = customers.find((customer) => customer._id === customerId)?.name || 'Customer';
      const serviceName = services.find((service) => service._id === serviceId)?.name || 'Service';
      setSuccess(`${serviceName} booked for ${customerName} on ${result.date} at ${slot}.`);
      setMessages((current) => [...current, { role: 'ai', text: `Booking confirmed for ${customerName} at ${slot}. The appointment was saved and the usual notification flow was triggered.` }]);
      setResult(null);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'This slot could not be booked. Availability may have changed; run the search again.');
    } finally {
      setBookingSlot('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="rounded-2xl overflow-hidden border border-primary-100 bg-gradient-to-br from-primary-50 via-white to-teal-50/70 p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="grid place-items-center w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-600 to-violet-500 text-white shadow-lg shadow-primary-500/20 shrink-0"><Sparkles size={21} /></div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h2 className="text-base sm:text-lg font-extrabold text-slate-800 tracking-tight">Smart appointment assistant</h2><span className="badge-blue">AI-assisted</span></div>
            <p className="text-sm text-slate-500 leading-relaxed mt-1">Describe your preferred time in everyday language. The backend checks the selected staff member’s working schedule and overlapping appointments before showing slots.</p>
          </div>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="AI tools">
        <Link to="/dashboard" className="group card flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-700"><BarChart3 size={18} /></span><span className="min-w-0 flex-1"><strong className="block text-sm text-slate-900">Business Insights</strong><span className="mt-0.5 block text-xs text-slate-500">Revenue and booking trends</span></span><ChevronRight size={16} className="text-slate-400 transition group-hover:translate-x-0.5" /></Link>
        <Link to="/staff" className="group card flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"><span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-700"><UserCheck size={18} /></span><span className="min-w-0 flex-1"><strong className="block text-sm text-slate-900">Staff Summary</strong><span className="mt-0.5 block text-xs text-slate-500">Workload and scheduling</span></span><ChevronRight size={16} className="text-slate-400 transition group-hover:translate-x-0.5" /></Link>
        <Link to="/offers" className="group card flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700"><Gift size={18} /></span><span className="min-w-0 flex-1"><strong className="block text-sm text-slate-900">Offer Recommendations</strong><span className="mt-0.5 block text-xs text-slate-500">Create reviewed discount drafts</span></span><ChevronRight size={16} className="text-slate-400 transition group-hover:translate-x-0.5" /></Link>
        <Link to="/customers" className="group card flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"><span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-rose-700"><Users size={18} /></span><span className="min-w-0 flex-1"><strong className="block text-sm text-slate-900">Customer Summary</strong><span className="mt-0.5 block text-xs text-slate-500">Visit history and follow-up</span></span><ChevronRight size={16} className="text-slate-400 transition group-hover:translate-x-0.5" /></Link>
      </section>

      {loadError && <Alert type="error" message={loadError} onClose={() => setLoadError('')} />}
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      <section className="card overflow-hidden border border-rose-100">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-100 bg-gradient-to-r from-rose-50/70 via-white to-violet-50/60 px-5 py-4">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-violet-600 text-white"><HeartHandshake size={18} /></span><div><h3 className="font-extrabold text-slate-900">AI Customer Retention Assistant</h3><p className="mt-0.5 text-xs text-slate-500">Identify customer segments and plan consent-based follow-ups</p></div></div>
          <button type="button" onClick={fetchRetention} disabled={retentionLoading} className="btn-primary">{retentionLoading ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />} {retentionLoading ? 'Analysing…' : retention ? 'Refresh retention brief' : 'Generate retention brief'}</button>
        </div>
        <div className="p-5">
          {retentionError && <div role="alert" className="mb-4 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">{retentionError}</div>}
          {!retention && !retentionLoading && <p className="text-sm leading-6 text-slate-600">Generate a business-level view of returning, loyal, new and at-risk customers. The analysis does not automatically send marketing messages.</p>}
          {retentionLoading && <div className="flex items-center gap-2 py-5 text-sm text-slate-500"><RefreshCw size={16} className="animate-spin text-primary-600" />Reviewing completed visit history…</div>}
          {retention && !retentionLoading && <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className={retention.aiPowered ? 'badge-green' : 'badge-gray'}>{retention.aiPowered ? `Groq AI · ${retention.aiModel || ''}` : 'Calculated segments'}</span><span className="text-xs text-slate-500">{retention.totalCustomers} active customer records</span></div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[['At risk', retention.atRiskCustomers], ['Loyal', retention.loyalCustomers], ['Returning', retention.returningCustomers], ['New / no completed visit', retention.newOrNoCompletedVisitCustomers]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p></div>)}</div>
            <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-4"><p className="text-sm leading-6 text-slate-700">{retention.summary}</p></div>
            <div className="grid gap-3 md:grid-cols-3">{(retention.actions || []).map((action) => <article key={`${action.segment}-${action.title}`} className="rounded-xl border border-slate-200 p-4"><p className="text-[10px] font-extrabold uppercase tracking-wide text-violet-600">{String(action.segment).replace('_', ' ')}</p><h4 className="mt-1 font-bold text-slate-900">{action.title}</h4><p className="mt-2 text-xs leading-5 text-slate-600">{action.reason}</p><p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-5 text-teal-800"><strong>Action:</strong> {action.action}</p></article>)}</div>
            {(retention.atRiskCustomers || []).length > 0 && <div><h4 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-slate-900"><Users size={16} /> Customers to review</h4><div className="overflow-x-auto rounded-xl border border-slate-100"><table className="w-full min-w-[520px] text-sm"><thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-3 py-2">Customer</th><th className="px-3 py-2">Completed visits</th><th className="px-3 py-2">Days since visit</th><th className="px-3 py-2">Recorded spend</th></tr></thead><tbody className="divide-y divide-slate-100">{retention.atRiskCustomers.map((customer) => <tr key={customer.id}><td className="px-3 py-2 font-semibold text-slate-800">{customer.name}</td><td className="px-3 py-2 text-slate-600">{customer.completedVisits}</td><td className="px-3 py-2 text-slate-600">{customer.daysSinceLastVisit}</td><td className="px-3 py-2 text-slate-600">{formatINR(customer.totalSpent)}</td></tr>)}</tbody></table></div></div>}
            <p className="text-xs leading-5 text-slate-400">{retention.notice || 'No marketing messages are sent by this report. Confirm consent before any outreach.'}</p>
          </div>}
        </div>
      </section>

      <div className="card p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label" htmlFor="assistant-customer"><UserRound size={14} className="inline mr-1.5 text-primary-600" />Customer to book</label>
            <select id="assistant-customer" className="input" value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
              <option value="">Select customer</option>
              {customers.map((customer) => <option key={customer._id} value={customer._id}>{customer.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="assistant-staff">Staff member</label>
            <select id="assistant-staff" className="input" value={staffId} onChange={(event) => { setStaffId(event.target.value); setResult(null); }}>
              <option value="">Select staff</option>
              {staffList.filter((staff) => staff.isActive !== false).map((staff) => <option key={staff._id} value={staff._id}>{staff.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="assistant-service">Service</label>
            <select id="assistant-service" className="input" value={serviceId} onChange={(event) => { setServiceId(event.target.value); setResult(null); }}>
              <option value="">Select service</option>
              {services.filter((service) => service.isActive !== false).map((service) => <option key={service._id} value={service._id}>{service.name} · {service.duration} min</option>)}
            </select>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-3">The assistant never creates a booking just from a chat message. You choose a customer and confirm an available slot.</p>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2"><span className="grid place-items-center w-8 h-8 rounded-xl bg-primary-50 text-primary-600"><Bot size={17} /></span><div><p className="text-sm font-extrabold text-slate-800">BookFlow conversation</p><p className="text-[10px] text-slate-400">Suggestions are validated by the booking engine</p></div></div>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Backend connected</span>
        </div>

        <div className="p-4 sm:p-5">
          <div className="space-y-3 mb-4 max-h-[360px] overflow-y-auto pr-1" aria-live="polite">
            {messages.map((message, index) => (
              <div key={`${index}-${message.role}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-up`}>
                <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.role === 'user' ? 'bg-primary-600 text-white rounded-br-md shadow-sm shadow-primary-600/15' : 'bg-slate-50 border border-slate-100 text-slate-700 rounded-bl-md'}`}>
                  {message.role === 'ai' && <Sparkles size={13} className="inline mr-1.5 -mt-0.5 text-primary-600" />}
                  {message.text}
                </div>
              </div>
            ))}
            {loading && <div className="flex justify-start"><div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-slate-50 border border-slate-100 px-4 py-3 text-sm text-slate-500"><span className="typing-dots"><i /><i /><i /></span>Checking availability…</div></div>}
          </div>

          {result && (
            <div className="mt-4 rounded-2xl border border-primary-100 bg-primary-50/45 p-4 animate-fade-up">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div><h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2"><CalendarCheck size={16} className="text-primary-600" />Available slots</h3><p className="text-xs text-slate-500 mt-1">{result.date} · {result.service?.name} · {result.staff?.name}</p></div>
                <span className={result.aiPowered ? 'badge-green' : 'badge-gray'}>{result.aiPowered ? 'Groq intent parsing' : 'Built-in parser'}</span>
              </div>
              {result.notice && <p className="text-xs text-slate-500 mb-3 flex gap-1.5 items-start"><AlertCircle size={14} className="shrink-0 mt-0.5" />{result.notice}</p>}
              {result.slots?.length ? <>
                <p className="text-xs text-slate-500 mb-2">Choose a slot to create the appointment for the selected customer.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {result.slots.map((slot) => <button key={slot} type="button" disabled={Boolean(bookingSlot)} onClick={() => bookSlot(slot)} className="flex items-center justify-center gap-1.5 rounded-xl border border-primary-200 bg-white px-3 py-2.5 text-xs font-extrabold text-primary-700 hover:border-primary-500 hover:bg-primary-600 hover:text-white disabled:opacity-60 transition-all"><Clock3 size={13} />{bookingSlot === slot ? 'Booking…' : slot}</button>)}
                </div>
              </> : <p className="text-sm text-slate-500 flex items-center gap-2"><AlertCircle size={15} />No available times matched. Try a different date or time.</p>}
            </div>
          )}

          <form onSubmit={handleAsk} className="mt-5 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm focus-within:border-primary-300 focus-within:shadow-[0_0_0_4px_rgba(98,88,232,.08)] transition-all">
            <input className="flex-1 min-w-0 border-0 outline-none px-2 py-2 text-sm text-slate-700 placeholder:text-slate-400 bg-transparent" placeholder='Try “tomorrow after 5 PM” or “around 3 PM on 2026-11-12”' value={query} onChange={(event) => setQuery(event.target.value)} disabled={loading} />
            <button type="submit" disabled={loading || !query.trim()} className="btn-primary h-10 w-11 shrink-0 p-0 rounded-xl" aria-label="Check availability"><Send size={16} /></button>
          </form>
          <p className="text-[10px] text-slate-400 mt-2 px-1">AI can interpret the request, but dates, availability and bookings are always checked by BookFlow’s backend.</p>
        </div>
      </div>
    </div>
  );
}
