import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, CreditCard, Sparkles, Tag, Users, Wrench, AlertTriangle, RefreshCw } from 'lucide-react';
import api from '../services/api';
import Alert from '../components/ui/Alert';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const dateLabel = (value) => {
  if (!value) return 'No expiry';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const statusStyles = {
  trial: 'bg-violet-50 text-violet-700 ring-violet-200',
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  grace_period: 'bg-amber-50 text-amber-800 ring-amber-200',
  expired: 'bg-rose-50 text-rose-700 ring-rose-200',
  suspended: 'bg-slate-100 text-slate-700 ring-slate-200',
};
const statusLabel = (value) => ({ trial: 'Trial', active: 'Active demo', grace_period: 'Grace period', expired: 'Expired', suspended: 'Suspended' }[value] || value || 'Active demo');
const limitLabel = (value) => Number(value).toLocaleString('en-IN');

function UsageBar({ label, used, limit, icon: Icon }) {
  const current = Math.max(0, Number(used || 0));
  const percentage = Number.isFinite(limit) && limit > 0 ? Math.min(100, (current / limit) * 100) : 0;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-slate-500"><Icon size={16} /><span className="text-xs font-bold">{label}</span></div>
      <div className="mt-2 flex items-end justify-between gap-2"><strong className="text-xl font-extrabold text-slate-900">{limitLabel(current)}</strong><span className="text-xs text-slate-500">of {limitLabel(limit)}</span></div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-teal-400 transition-all" style={{ width: `${percentage}%` }} /></div>
    </div>
  );
}

export default function Subscription() {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [changingPlan, setChangingPlan] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/subscription/me');
      setSnapshot(response.data?.data || null);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Subscription details could not be loaded.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectDemoPlan = async (plan) => {
    setChangingPlan(plan);
    setError('');
    setMessage('');
    try {
      const response = await api.post('/subscription/demo/select-plan', { plan });
      setSnapshot(response.data?.data || null);
      setMessage(response.data?.message || 'Demo plan updated. No payment was processed.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not change the demo plan.');
    } finally { setChangingPlan(''); }
  };

  if (loading && !snapshot) return <LoadingSpinner fullScreen />;

  const subscription = snapshot?.subscription;
  const planConfig = snapshot?.plan;
  const usage = snapshot?.usage || {};
  const currentPlan = subscription?.plan;
  const plans = snapshot?.plans || [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#171633] via-[#302b68] to-[#4b4297] p-6 text-white shadow-xl shadow-violet-950/10 sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-16 h-60 w-60 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -bottom-16 right-1/4 h-44 w-44 rounded-full bg-teal-300/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-violet-100"><CreditCard size={14} /> Workspace plan</div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Subscription & usage</h1>
            <p className="mt-2 text-sm leading-6 text-indigo-100/85">Review your current demo plan, monthly usage and plan limits. No real payment is collected in this version.</p>
          </div>
          <button type="button" onClick={load} disabled={loading || Boolean(changingPlan)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/15 disabled:opacity-60"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh</button>
        </div>
      </section>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {message && <Alert type="success" message={message} onClose={() => setMessage('')} />}
      {snapshot?.billing?.notice && <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-900"><AlertTriangle size={19} className="mt-0.5 shrink-0" /><div><p className="text-sm font-extrabold">Demo billing only</p><p className="mt-1 text-sm leading-5">{snapshot.billing.notice} Plan changes here are simulated for portfolio testing.</p></div></div>}

      {subscription && <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-slate-400">Current plan</p><h2 className="mt-2 text-2xl font-extrabold capitalize text-slate-900">{subscription.planLabel}</h2><p className="mt-1 text-sm text-slate-500">{planConfig?.description}</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ring-1 ${statusStyles[subscription.status] || statusStyles.active}`}>{statusLabel(subscription.status)}</span></div>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Started</p><p className="mt-1 text-sm font-bold text-slate-800">{dateLabel(subscription.startedAt)}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Period / trial ends</p><p className="mt-1 text-sm font-bold text-slate-800">{dateLabel(subscription.effectiveEnd || subscription.trialEndsAt || subscription.periodEndsAt)}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Time remaining</p><p className="mt-1 text-sm font-bold text-slate-800">{subscription.daysRemaining == null ? 'No expiry' : `${subscription.daysRemaining} day(s)`}</p></div></div>
          {subscription.status === 'grace_period' && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Your subscription is in its grace period. Choose a demo plan to simulate renewal.</p>}
          {subscription.isReadOnly && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">This demo subscription is read-only for plan-limited actions. Existing records remain available for viewing/export.</p>}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-700"><Sparkles size={18} /></div><div><h3 className="text-sm font-extrabold text-slate-900">Included features</h3><p className="text-xs text-slate-500">For your current plan</p></div></div><ul className="mt-4 space-y-3 text-sm text-slate-600"><li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600" /> Public booking {planConfig?.features?.publicBooking ? 'included' : 'locked'}</li><li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600" /> Coupons {planConfig?.features?.coupons ? 'included' : 'locked'}</li><li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600" /> Basic AI assistant {planConfig?.features?.aiAssistant ? 'included' : 'locked'}</li><li className={`flex items-center gap-2 ${planConfig?.features?.advancedAI ? 'text-slate-600' : 'text-slate-400'}`}><CheckCircle2 size={16} className={planConfig?.features?.advancedAI ? 'text-emerald-600' : 'text-slate-300'} /> Advanced AI summaries {planConfig?.features?.advancedAI ? 'included' : 'Starter/Pro demo plan'}</li></ul></div>
      </section>}

      {snapshot?.plan?.limits && <section><div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="text-lg font-extrabold text-slate-900">Monthly usage</h2><p className="mt-1 text-sm text-slate-500">Usage resets at the start of each UTC calendar month.</p></div><span className="text-xs text-slate-400">{usage.monthKey || ''}</span></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"><UsageBar label="Active staff" used={usage.staff} limit={planConfig.limits.staff} icon={Users} /><UsageBar label="Active services" used={usage.services} limit={planConfig.limits.services} icon={Wrench} /><UsageBar label="Bookings created this month" used={usage.monthlyBookings} limit={planConfig.limits.monthlyBookings} icon={CalendarDays} /><UsageBar label="AI requests this month" used={usage.monthlyAiRequests} limit={planConfig.limits.monthlyAiRequests} icon={Sparkles} /></div><div className="mt-3 rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-2 text-sm font-bold text-slate-700"><Tag size={16} /> Active offers: {usage.activeOffers || 0} of {planConfig.limits.activeOffers}</div></div></section>}

      <section><div className="mb-4"><h2 className="text-lg font-extrabold text-slate-900">Choose a demo plan</h2><p className="mt-1 text-sm text-slate-500">Switching plans only changes simulated access. No payment gateway or real billing is connected.</p></div><div className="grid grid-cols-1 gap-4 lg:grid-cols-3">{plans.map((plan) => {
        const isCurrent = plan.key === currentPlan;
        const isCurrentAndUsable = isCurrent && ['active', 'trial'].includes(subscription?.status) && !subscription?.isReadOnly;
        const featured = plan.key === 'starter';
        return <article key={plan.key} className={`relative rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${isCurrent ? 'border-violet-400 ring-2 ring-violet-100' : 'border-slate-200'}`}>
          {featured && <span className="absolute -top-3 right-4 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">Balanced</span>}
          <div className="flex items-start justify-between gap-2"><div><h3 className="text-lg font-extrabold text-slate-900">{plan.label}</h3><p className="mt-1 text-sm text-slate-500">{plan.description}</p></div>{isCurrent && <span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-extrabold text-violet-700">Current</span>}</div>
          <div className="mt-5 rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Demo limits</p><p className="mt-1 text-sm font-bold text-slate-800">{plan.limits.staff} staff · {plan.limits.services} services</p><p className="mt-1 text-xs text-slate-500">{limitLabel(plan.limits.monthlyBookings)} bookings and {limitLabel(plan.limits.monthlyAiRequests)} AI requests / month</p><p className="mt-1 text-xs text-slate-500">Up to {plan.limits.activeOffers} active offers</p></div>
          <ul className="mt-4 space-y-2 text-sm text-slate-600"><li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-600" /> Public booking</li><li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-600" /> Coupons and booking rules</li><li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-600" /> {plan.features.advancedAI ? 'Advanced AI summaries' : 'Basic AI assistant'}</li></ul>
          <button type="button" onClick={() => selectDemoPlan(plan.key)} disabled={Boolean(changingPlan) || isCurrentAndUsable} className={`mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50 ${isCurrent ? 'border border-violet-200 bg-violet-50 text-violet-700' : featured ? 'bg-violet-600 text-white hover:bg-violet-700' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>{changingPlan === plan.key ? <RefreshCw size={15} className="animate-spin" /> : <ArrowRight size={15} />}{isCurrentAndUsable ? 'Current plan' : changingPlan === plan.key ? 'Activating…' : isCurrent ? `Reactivate ${plan.label} demo plan` : `Simulate ${plan.label} plan`}</button>
        </article>;
      })}</div></section>
    </div>
  );
}
