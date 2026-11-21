import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award, Gift, Search, Users, TrendingUp, ArrowDownLeft,
  ArrowUpRight, CalendarDays, Wallet, RefreshCw, Sparkles,
} from 'lucide-react';
import api from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import StatCard from '../components/ui/StatCard';
import { formatINR } from '../utils/currency';

const number = (value) => Number(value || 0).toLocaleString('en-IN');
const dateLabel = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function Loyalty() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [appointmentId, setAppointmentId] = useState('');
  const [points, setPoints] = useState('100');
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState('');
  const [notice, setNotice] = useState('');

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setPageError('');
    try {
      const response = await api.get('/loyalty/overview');
      setData(response.data.data);
    } catch (error) {
      setPageError(error.response?.data?.message || 'Could not load the loyalty overview.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  const visibleCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.customers || []).filter((customer) => !term ||
      customer.name?.toLowerCase().includes(term) || customer.phone?.toLowerCase().includes(term));
  }, [data, search]);

  const selectedAppointment = useMemo(() =>
    customerData?.appointments?.find((appointment) => appointment._id === appointmentId) || null,
  [customerData, appointmentId]);
  const maxRedeemable = selectedAppointment
    ? Math.min(Number(customerData?.customer?.loyaltyPoints || 0), Math.floor(Number(selectedAppointment.price || 0) * 0.2))
    : 0;
  const discountPreview = Math.min(Math.max(0, Number.parseInt(points, 10) || 0), maxRedeemable);

  const openCustomer = async (customer) => {
    setSelectedCustomer(customer);
    setCustomerData(null);
    setAppointmentId('');
    setPoints('100');
    setRedeemError('');
    setCustomerLoading(true);
    try {
      const response = await api.get(`/loyalty/customers/${customer._id}`);
      setCustomerData(response.data.data);
    } catch (error) {
      setRedeemError(error.response?.data?.message || 'Could not load customer loyalty details.');
    } finally {
      setCustomerLoading(false);
    }
  };

  const closeCustomer = () => {
    if (redeeming) return;
    setSelectedCustomer(null);
    setCustomerData(null);
    setRedeemError('');
  };

  const applyRedemption = async (event) => {
    event.preventDefault();
    setRedeemError('');
    const requestedPoints = Number(points);
    if (!appointmentId) return setRedeemError('Choose an upcoming appointment first.');
    if (!Number.isInteger(requestedPoints) || requestedPoints < (data?.rules?.minRedeemPoints || 100)) {
      return setRedeemError(`Enter at least ${data?.rules?.minRedeemPoints || 100} whole points.`);
    }
    if (requestedPoints > maxRedeemable) return setRedeemError(`You can redeem up to ${number(maxRedeemable)} points for this appointment.`);

    setRedeeming(true);
    try {
      const response = await api.post('/loyalty/redeem', {
        customerId: customerData.customer._id,
        appointmentId,
        points: requestedPoints,
      });
      setNotice(response.data.message || 'Loyalty points applied successfully.');
      setSelectedCustomer(null);
      setCustomerData(null);
      await fetchOverview();
    } catch (error) {
      setRedeemError(error.response?.data?.message || 'Could not redeem points. Refresh and try again.');
    } finally {
      setRedeeming(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const stats = data?.stats || {};
  const rules = data?.rules || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
            <Gift size={14} /> Customer retention
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Loyalty & Rewards</h1>
          <p className="mt-1 text-sm text-slate-500">Reward completed visits and let customers use points on their next booking.</p>
        </div>
        <button type="button" onClick={fetchOverview} className="btn-secondary inline-flex items-center justify-center gap-2 self-start sm:self-auto">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {notice && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} className="font-semibold">Dismiss</button>
        </div>
      )}
      {pageError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{pageError}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Outstanding points" value={number(stats.outstandingPoints)} icon={Wallet} color="purple" subtitle="Current customer balances" />
        <StatCard title="Customers with points" value={number(stats.customersWithPoints)} icon={Users} color="blue" subtitle="Active loyalty members" />
        <StatCard title="Points earned this month" value={number(stats.earnedThisMonth)} icon={TrendingUp} color="green" subtitle="From completed appointments" />
        <StatCard title="Points redeemed this month" value={number(stats.redeemedThisMonth)} icon={Gift} color="orange" subtitle="Applied as booking discounts" />
      </div>

      <section className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">Customer points balance</h2>
            <p className="mt-1 text-xs text-slate-500">Select a customer to review activity or redeem points on an upcoming appointment.</p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Search name or phone..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
        </div>
        {(visibleCustomers.length === 0) ? (
          <div className="p-6"><EmptyState icon={Award} title="No loyalty balances yet" description="When an appointment is marked completed, eligible customers start earning points automatically." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3 text-right">Available points</th>
                  <th className="px-5 py-3 text-right">Lifetime earned</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleCustomers.map((customer) => (
                  <tr key={customer._id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-sm font-bold text-violet-700">{(customer.name || 'C').slice(0, 1).toUpperCase()}</div>
                        <div><p className="font-semibold text-slate-800">{customer.name}</p><p className="text-xs text-slate-400">Last visit: {dateLabel(customer.lastVisit)}</p></div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{customer.phone || '—'}</td>
                    <td className="px-5 py-4 text-right font-bold tabular-nums text-violet-700">{number(customer.loyaltyPoints)}</td>
                    <td className="px-5 py-4 text-right tabular-nums text-slate-600">{number(customer.lifetimeLoyaltyPoints)}</td>
                    <td className="px-5 py-4 text-right"><button type="button" onClick={() => openCustomer(customer)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700">Manage points</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <section className="card p-5">
          <div className="mb-4 flex items-center gap-2"><div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-700"><Sparkles size={17} /></div><div><h2 className="font-bold text-slate-900">How rewards work</h2><p className="text-xs text-slate-500">Current workspace loyalty rules</p></div></div>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span className="text-sm text-slate-600">Earn on completed spend</span><strong className="text-sm text-slate-900">{rules.earnPointsPer100 || 5} pts / ₹100</strong></div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span className="text-sm text-slate-600">Redemption value</span><strong className="text-sm text-slate-900">{formatINR(rules.rupeesPerPoint || 1)} / point</strong></div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span className="text-sm text-slate-600">Minimum redemption</span><strong className="text-sm text-slate-900">{number(rules.minRedeemPoints || 100)} points</strong></div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span className="text-sm text-slate-600">Maximum booking discount</span><strong className="text-sm text-slate-900">{rules.maxRedemptionPercent || 20}%</strong></div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">Points are credited once when staff marks an appointment completed. Redeemed points are returned automatically when an appointment is cancelled.</p>
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 p-5"><h2 className="font-bold text-slate-900">Recent points activity</h2><p className="mt-1 text-xs text-slate-500">Latest earned, redeemed and refunded transactions.</p></div>
          {!data?.transactions?.length ? (
            <div className="p-6"><EmptyState icon={CalendarDays} title="No activity yet" description="Loyalty transactions will appear here." /></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.transactions.slice(0, 8).map((transaction) => {
                const positive = transaction.points > 0;
                const Icon = positive ? ArrowDownLeft : ArrowUpRight;
                return (
                  <div key={transaction._id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${positive ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}><Icon size={17} /></div>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{transaction.customerId?.name || 'Customer'}</p><p className="truncate text-xs text-slate-500">{transaction.description}</p><p className="mt-0.5 text-[11px] text-slate-400">{dateLabel(transaction.createdAt)}</p></div>
                    <span className={`shrink-0 text-sm font-extrabold tabular-nums ${positive ? 'text-emerald-700' : 'text-orange-700'}`}>{positive ? '+' : ''}{number(transaction.points)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <Modal isOpen={Boolean(selectedCustomer)} onClose={closeCustomer} title={selectedCustomer ? `Loyalty · ${selectedCustomer.name}` : 'Customer loyalty'} size="lg">
        {customerLoading ? <LoadingSpinner /> : customerData && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-violet-100 bg-violet-50 p-4"><p className="text-xs font-semibold text-violet-700">Available points</p><p className="mt-1 text-2xl font-extrabold text-violet-900">{number(customerData.customer.loyaltyPoints)}</p></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">Lifetime earned</p><p className="mt-1 text-2xl font-extrabold text-slate-900">{number(customerData.customer.lifetimeLoyaltyPoints)}</p></div>
            </div>

            <form onSubmit={applyRedemption} className="space-y-3 rounded-xl border border-slate-200 p-4">
              <div><h3 className="font-bold text-slate-900">Redeem points</h3><p className="mt-1 text-xs text-slate-500">Apply points to a pending or confirmed appointment for this customer.</p></div>
              <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Upcoming appointment</span>
                <select className="input" value={appointmentId} onChange={(event) => setAppointmentId(event.target.value)} required>
                  <option value="">Select appointment</option>
                  {customerData.appointments.map((appointment) => <option key={appointment._id} value={appointment._id}>{dateLabel(appointment.appointmentDate)} · {appointment.appointmentTime} · {appointment.serviceId?.name || 'Service'} · {formatINR(appointment.price)}</option>)}
                </select>
              </label>
              {customerData.appointments.length === 0 && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">No eligible upcoming appointments. Points can be redeemed when this customer has a pending or confirmed booking.</p>}
              <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-600">Points to redeem</span>
                <input className="input" type="number" min={rules.minRedeemPoints || 100} max={maxRedeemable || undefined} step="1" value={points} onChange={(event) => setPoints(event.target.value)} disabled={!appointmentId || maxRedeemable < (rules.minRedeemPoints || 100)} />
              </label>
              {appointmentId && <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2.5 text-sm"><span className="text-emerald-800">Estimated discount</span><strong className="text-emerald-900">{formatINR(discountPreview)}</strong></div>}
              {appointmentId && <p className="text-xs text-slate-500">Maximum {number(maxRedeemable)} points can be used (20% of this appointment's current payable amount).</p>}
              {redeemError && <p role="alert" className="text-xs text-rose-600">{redeemError}</p>}
              <div className="flex justify-end gap-2 pt-1"><button type="button" onClick={closeCustomer} className="btn-secondary" disabled={redeeming}>Close</button><button type="submit" className="btn-primary" disabled={redeeming || customerData.appointments.length === 0 || maxRedeemable < (rules.minRedeemPoints || 100)}>{redeeming ? 'Applying…' : 'Apply points'}</button></div>
            </form>

            <div><h3 className="mb-2 font-bold text-slate-900">Customer points history</h3>{customerData.transactions.length === 0 ? <p className="rounded-lg bg-slate-50 p-4 text-center text-xs text-slate-500">No loyalty transactions for this customer.</p> : <div className="max-h-48 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-100">{customerData.transactions.map((transaction) => <div key={transaction._id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs"><div className="min-w-0"><p className="truncate font-semibold text-slate-700">{transaction.description}</p><p className="text-slate-400">{dateLabel(transaction.createdAt)}</p></div><strong className={transaction.points > 0 ? 'text-emerald-700' : 'text-orange-700'}>{transaction.points > 0 ? '+' : ''}{number(transaction.points)}</strong></div>)}</div>}</div>
          </div>
        )}
        {!customerLoading && selectedCustomer && !customerData && <p className="text-sm text-slate-500">{redeemError || 'Customer loyalty information is unavailable.'}</p>}
      </Modal>
    </div>
  );
}
