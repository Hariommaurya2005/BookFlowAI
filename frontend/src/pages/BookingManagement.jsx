import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, Loader2, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import { formatINR } from '../utils/currency';

const formatDate = (date) => {
  if (!date) return 'Date unavailable';
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
};

const statusLabel = (status) => ({
  pending: 'Pending confirmation',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
}[status] || status || 'Unknown');

export default function BookingManagement() {
  const location = useLocation();
  const token = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const fetchBooking = async () => {
    if (!token || token.length < 40) {
      setError('This booking-management link is incomplete. Open the full private link from your confirmation email or booking screen.');
      setLoading(false);
      return;
    }
    try {
      const response = await api.get('/public/booking/manage', {
        headers: { 'X-Booking-Management-Token': token },
      });
      setData(response.data.data);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load this booking. Please open the complete management link.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBooking(); }, [token]);

  const requestCancellation = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const response = await api.post('/public/booking/manage/cancellation-request', { reason: reason.trim() }, {
        headers: { 'X-Booking-Management-Token': token },
      });
      setMessage(response.data.message || 'Your cancellation request was processed.');
      setReason('');
      await fetchBooking();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not submit your cancellation request.');
    } finally {
      setSubmitting(false);
    }
  };

  const booking = data?.booking;
  const policy = data?.cancellationPolicy;
  const requestPending = booking?.cancellationRequestStatus === 'pending';
  const cancelled = booking?.status === 'cancelled';

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_15%_0%,rgba(126,109,255,.14),transparent_35%),radial-gradient(ellipse_at_100%_35%,rgba(23,184,154,.08),transparent_30%),#f6f7fc] px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <a href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-violet-700"><ArrowLeft size={16} /> BookFlow AI</a>
        <section className="overflow-hidden rounded-[28px] border border-white/90 bg-white shadow-[0_28px_90px_rgba(36,40,90,.10)]">
          <div className="bg-gradient-to-br from-[#201d4d] via-[#373071] to-[#5146a6] px-6 py-8 text-white sm:px-9">
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10"><CalendarDays size={21} /></div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-violet-200">Booking management</p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">View or cancel your appointment</h1>
            <p className="mt-2 max-w-lg text-sm leading-6 text-indigo-100/85">Use the private link from your booking confirmation to manage this appointment without creating an account.</p>
          </div>
          <div className="space-y-5 p-5 sm:p-8">
            {loading && <div className="flex items-center justify-center gap-2 py-10 text-sm font-medium text-slate-500"><Loader2 size={18} className="animate-spin text-violet-600" /> Loading your booking…</div>}
            {!loading && error && <div role="alert" className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm leading-6 text-rose-800">{error}</div>}
            {message && <div role="status" className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">{message}</div>}
            {!loading && booking && (
              <>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{booking.businessName}</p>
                      <h2 className="mt-1 text-xl font-extrabold text-slate-900">{booking.serviceName}</h2>
                      <p className="mt-1 text-sm text-slate-500">For {booking.customerName} · with {booking.staffName}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${cancelled ? 'bg-rose-100 text-rose-700' : requestPending ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>
                      {requestPending ? 'Cancellation requested' : statusLabel(booking.status)}
                    </span>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs text-slate-500">Date</p><p className="mt-1 font-semibold text-slate-900">{formatDate(booking.date)}</p></div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs text-slate-500">Time</p><p className="mt-1 font-semibold text-slate-900">{booking.time}{booking.endTime ? ` – ${booking.endTime}` : ''}</p></div>
                  </div>
                  {Number(booking.discountAmount || 0) > 0 && <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4"><span className="text-sm text-slate-500">Original price</span><span className="font-semibold text-slate-400 line-through">{formatINR(booking.basePrice ?? booking.price)}</span></div>}
                  {Number(booking.discountAmount || 0) > 0 && <div className="mt-2 flex items-center justify-between"><span className="text-sm text-emerald-700">Coupon {booking.couponCode || ''}</span><span className="font-bold text-emerald-700">−{formatINR(booking.discountAmount)}</span></div>}
                  <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-4"><span className="text-sm text-slate-500">Final service price</span><span className="text-lg font-extrabold text-violet-700">{formatINR(booking.price)}</span></div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-violet-100 bg-violet-50/70 p-4">
                  <ShieldCheck size={19} className="mt-0.5 shrink-0 text-violet-700" />
                  <div className="text-sm leading-6 text-violet-950">
                    <p className="font-bold">Cancellation policy</p>
                    <p className="mt-1">Request cancellation more than {policy?.windowHours || 24} hours before the appointment for automatic cancellation. Requests inside this window need business approval, and your appointment stays scheduled until approved.</p>
                  </div>
                </div>

                {requestPending && <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><p className="font-bold">Your request is awaiting review.</p><p className="mt-1">The business has not cancelled the appointment yet. You will be notified when it is reviewed.</p>{booking.cancellationRequestReason && <p className="mt-2">Reason: {booking.cancellationRequestReason}</p>}</div>}
                {cancelled && <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={19} className="mt-0.5 shrink-0" /><p>Your appointment has been cancelled.</p></div>}

                {policy?.canRequestCancellation && !requestPending && !cancelled && (
                  <form onSubmit={requestCancellation} className="space-y-3 rounded-2xl border border-slate-200 p-5">
                    <div><h3 className="font-bold text-slate-900">Need to cancel?</h3><p className="mt-1 text-sm leading-5 text-slate-500">Your cancellation will follow the business policy shown above.</p></div>
                    <label className="label" htmlFor="cancellation-reason">Reason <span className="font-normal text-slate-400">(optional)</span></label>
                    <textarea id="cancellation-reason" className="input min-h-24 resize-y" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} placeholder="Add a short reason, if you would like…" />
                    <button type="submit" disabled={submitting} className="btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-60">{submitting ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : 'Request cancellation'}</button>
                  </form>
                )}
                {!policy?.canRequestCancellation && !cancelled && !requestPending && <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600"><Clock3 size={16} className="mr-2 inline-block" />This appointment can no longer be cancelled through this link. Please contact the business for assistance.</p>}
              </>
            )}
          </div>
        </section>
        <p className="mt-5 text-center text-xs text-slate-400">Keep this private management link safe. Anyone with the link can view and manage this booking.</p>
      </div>
    </main>
  );
}
