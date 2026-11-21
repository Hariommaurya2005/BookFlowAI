import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Clock3, Loader2, Phone, Sparkles, UserRound, ArrowRight, ShieldCheck, Send, MessageCircle } from 'lucide-react';
import api from '../services/api';
import { formatINR } from '../utils/currency';

const dateInTimeZone = (timeZone, dayOffset = 0) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone || 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const date = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day) + dayOffset));
  return date.toISOString().slice(0, 10);
};

const formatPrice = (amount) => formatINR(amount);

const formatTime = (time) => {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return time;
  const [hour, minute] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
};

const businessTypeLabel = (type) => ({
  salon: 'Salon & Wellness', clinic: 'Clinic & Healthcare', consultant: 'Consulting',
  repair: 'Repair Services', coaching: 'Coaching & Classes', other: 'Appointments made simple',
}[type] || 'Appointments made simple');

export default function PublicBooking() {
  const { slug } = useParams();
  const [pageData, setPageData] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotError, setSlotError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' });
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState(null);
  const [couponMessage, setCouponMessage] = useState('');
  const [couponChecking, setCouponChecking] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [aiQuery, setAiQuery] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [aiPrefill, setAiPrefill] = useState(null);

  useEffect(() => {
    let active = true;
    setPageLoading(true);
    setPageError('');
    api.get(`/public/booking/${encodeURIComponent(slug)}`)
      .then(({ data }) => {
        if (!active) return;
        const result = data.data;
        setPageData(result);
        setDate(dateInTimeZone(result.organization.timezone));
        setServiceId(result.services?.[0]?._id || '');
      })
      .catch((error) => {
        if (active) setPageError(error.response?.data?.message || 'This booking page is not available right now.');
      })
      .finally(() => { if (active) setPageLoading(false); });
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    if (!pageData || !serviceId || !date) {
      setSlots([]);
      setSelectedSlot(null);
      return undefined;
    }
    let active = true;
    setSlotsLoading(true);
    setSlotError('');
    setSelectedSlot(null);
    const params = { serviceId, date };
    if (staffId) params.staffId = staffId;
    api.get(`/public/booking/${encodeURIComponent(slug)}/slots`, { params })
      .then(({ data }) => {
        if (!active) return;
        const nextSlots = data.data.slots || [];
        setSlots(nextSlots);
        if (aiPrefill && aiPrefill.date === date && String(aiPrefill.staffId) === String(staffId || aiPrefill.staffId)) {
          const match = nextSlots.find((slot) => String(slot.staffId) === String(aiPrefill.staffId) && slot.time === aiPrefill.time);
          if (match) { setSelectedSlot(match); setSubmitError(''); }
          setAiPrefill(null);
        }
      })
      .catch((error) => {
        if (active) {
          setSlots([]);
          setSlotError(error.response?.data?.message || 'Could not load available time slots. Please try again.');
        }
      })
      .finally(() => { if (active) setSlotsLoading(false); });
    return () => { active = false; };
  }, [pageData, slug, serviceId, staffId, date]);

  const selectedService = useMemo(
    () => pageData?.services?.find((service) => service._id === serviceId) || null,
    [pageData, serviceId]
  );
  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (['email', 'phone'].includes(field) && couponResult) {
      setCouponResult(null);
      setCouponMessage('Contact details changed. Apply the coupon again to re-check eligibility.');
    }
  };

  const applyCoupon = async () => {
    if (!selectedService) { setCouponMessage('Choose a service before applying a coupon.'); return; }
    if (!couponCode.trim()) { setCouponMessage('Enter a coupon code.'); return; }
    if (!form.email.trim() && !form.phone.trim()) { setCouponMessage('Enter your email or phone number before applying a coupon.'); return; }
    setCouponChecking(true);
    setCouponResult(null);
    setCouponMessage('Checking coupon eligibility…');
    try {
      const { data } = await api.post(`/public/booking/${encodeURIComponent(slug)}/coupons/validate`, {
        serviceId, code: couponCode.trim(), email: form.email.trim(), phone: form.phone.trim(),
      });
      setCouponResult(data.data);
      setCouponCode(data.data.coupon.code);
      setCouponMessage(`${data.data.coupon.name} applied successfully.`);
    } catch (error) {
      setCouponMessage(error.response?.data?.message || 'Could not apply this coupon.');
    } finally { setCouponChecking(false); }
  };

  const askPublicBookingAI = async (event) => {
    event.preventDefault();
    if (!aiQuery.trim()) return setAiError('Describe the day or time you prefer.');
    if (!serviceId) return setAiError('Choose a service first.');
    setAiBusy(true);
    setAiError('');
    setAiResult(null);
    try {
      const { data } = await api.post(`/public/booking/${encodeURIComponent(slug)}/ai-suggest`, {
        query: aiQuery.trim(), serviceId, staffId: staffId || undefined,
      });
      setAiResult(data.data);
    } catch (error) {
      setAiError(error.response?.data?.message || 'The AI booking assistant could not find slots. Please try again.');
    } finally { setAiBusy(false); }
  };

  const chooseAiSuggestion = (slot) => {
    const suggestion = { date: aiResult.date, staffId: slot.staffId, time: slot.time };
    if (date === suggestion.date && String(staffId || '') === String(suggestion.staffId || '')) {
      const match = slots.find((candidate) => String(candidate.staffId) === String(slot.staffId) && candidate.time === slot.time);
      if (match) setSelectedSlot(match);
      else {
        setAiPrefill(suggestion);
        setDate(suggestion.date);
        setStaffId(suggestion.staffId);
      }
    } else {
      setAiPrefill(suggestion);
      setDate(suggestion.date);
      setStaffId(suggestion.staffId);
      setSelectedSlot(null);
    }
    setSubmitError('');
    setAiResult(null);
  };

  const submitBooking = async (event) => {
    event.preventDefault();
    if (!selectedService) return setSubmitError('Please choose a service.');
    if (!selectedSlot) return setSubmitError('Please choose an available time slot.');
    if (!form.name.trim()) return setSubmitError('Please enter your name.');
    if (!form.email.trim() && !form.phone.trim()) return setSubmitError('Please enter an email address or phone number.');

    setSubmitting(true);
    setSubmitError('');
    try {
      const { data } = await api.post(`/public/booking/${encodeURIComponent(slug)}/appointments`, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        notes: form.notes.trim(),
        serviceId,
        staffId: selectedSlot.staffId,
        appointmentDate: date,
        appointmentTime: selectedSlot.time,
        couponCode: couponResult?.coupon?.code || '',
      });
      setConfirmation(data.data.booking);
      setSlots([]);
    } catch (error) {
      setSubmitError(error.response?.data?.message || 'Booking could not be completed. Please select a new slot and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (pageLoading) {
    return <main className="min-h-screen grid place-items-center bg-[#f6f7fc]"><div className="flex items-center gap-3 text-sm font-semibold text-slate-600"><Loader2 className="animate-spin text-violet-600" size={20} /> Loading booking page…</div></main>;
  }

  if (pageError || !pageData) {
    return <main className="min-h-screen grid place-items-center bg-[#f6f7fc] px-5"><div className="w-full max-w-md rounded-3xl border border-white bg-white p-8 text-center shadow-xl shadow-violet-950/5"><div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-600"><CalendarDays size={25} /></div><h1 className="text-xl font-extrabold text-slate-900">Booking page unavailable</h1><p className="mt-2 text-sm leading-6 text-slate-500">{pageError || 'This business is not accepting online bookings right now.'}</p></div></main>;
  }

  const { organization, services, staff, offers = [] } = pageData;

  if (confirmation) {
    return (
      <main className="min-h-screen bg-[radial-gradient(ellipse_at_20%_0%,rgba(126,109,255,.13),transparent_35%),#f6f7fc] px-4 py-10 sm:py-16">
        <div className="mx-auto max-w-xl rounded-[28px] border border-white bg-white p-6 text-center shadow-[0_28px_90px_rgba(36,40,90,.10)] sm:p-10">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><CheckCircle2 size={32} /></div>
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[.18em] text-emerald-700">Booking confirmed</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">You're all set.</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">Your appointment at {confirmation.businessName} has been booked. Keep the details below for reference.</p>
          <div className="mt-7 rounded-2xl border border-slate-100 bg-slate-50 p-5 text-left">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Service</p><p className="mt-1 font-bold text-slate-900">{confirmation.serviceName}</p>{confirmation.couponCode && <p className="mt-1 text-xs font-semibold text-emerald-700">Coupon {confirmation.couponCode} applied</p>}</div><div className="text-right">{Number(confirmation.discountAmount || 0) > 0 && <p className="text-xs text-slate-400 line-through">{formatPrice(confirmation.basePrice, confirmation.currency)}</p>}<p className="font-extrabold text-violet-700">{formatPrice(confirmation.price, confirmation.currency)}</p></div></div>{Number(confirmation.discountAmount || 0) > 0 && <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-sm"><span className="text-slate-500">Coupon discount</span><span className="font-bold text-emerald-700">−{formatPrice(confirmation.discountAmount, confirmation.currency)}</span></div>}
            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-200 pt-4 text-sm"><div><p className="text-xs text-slate-500">Date</p><p className="mt-1 font-semibold text-slate-800">{new Date(`${confirmation.date}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div><div><p className="text-xs text-slate-500">Time</p><p className="mt-1 font-semibold text-slate-800">{formatTime(confirmation.time)} – {formatTime(confirmation.endTime)}</p></div><div><p className="text-xs text-slate-500">Staff</p><p className="mt-1 font-semibold text-slate-800">{confirmation.staffName}</p></div><div><p className="text-xs text-slate-500">Reference</p><p className="mt-1 break-all font-semibold text-slate-800">{String(confirmation.id).slice(-8).toUpperCase()}</p></div></div>
          </div>
          {confirmation.managementUrl && <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50/70 p-4 text-left"><p className="font-bold text-violet-950">Save your private booking link</p><p className="mt-1 text-xs leading-5 text-violet-900/80">Use this link later to view your booking or request cancellation. Anyone with the link can manage this appointment, so keep it private.</p><a href={confirmation.managementUrl} className="btn-secondary mt-3 w-full justify-center">View / manage booking <ArrowRight size={15} /></a><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(confirmation.managementUrl); } catch { window.prompt('Copy your private booking link:', confirmation.managementUrl); } }} className="mt-2 w-full rounded-xl px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100">Copy private link</button></div>}
          <button className="btn-primary mt-6 w-full" onClick={() => { setConfirmation(null); setSelectedSlot(null); setForm({ name: '', email: '', phone: '', notes: '' }); setCouponCode(''); setCouponResult(null); setCouponMessage(''); setDate(dateInTimeZone(organization.timezone)); }}>Book another appointment <ArrowRight size={16} /></button>
          <p className="mt-5 text-xs text-slate-400">Powered by BookFlow AI</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_12%_0%,rgba(126,109,255,.13),transparent_35%),radial-gradient(ellipse_at_100%_30%,rgba(23,184,154,.08),transparent_30%),#f6f7fc] px-4 py-7 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-700 text-white shadow-lg shadow-violet-500/25"><Sparkles size={20} /></div><div><p className="text-sm font-extrabold tracking-tight text-slate-900">BookFlow <span className="text-violet-600">AI</span></p><p className="text-xs text-slate-500">Simple, thoughtful booking</p></div></div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/85 px-3 py-2 text-xs font-semibold text-emerald-700 shadow-sm"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Online booking</div>
        </header>

        <section className="overflow-hidden rounded-[30px] border border-white/90 bg-white shadow-[0_28px_90px_rgba(36,40,90,.09)]">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#201d4d] via-[#373071] to-[#5146a6] px-6 py-8 text-white sm:px-10 sm:py-10">
            <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border border-white/10" /><div className="pointer-events-none absolute -right-5 -top-12 h-52 w-52 rounded-full border border-white/10" /><div className="pointer-events-none absolute bottom-[-100px] left-[46%] h-48 w-48 rounded-full bg-teal-300/10 blur-3xl" />
            <div className="relative flex flex-wrap items-end justify-between gap-6"><div className="max-w-xl"><p className="mb-3 text-xs font-bold uppercase tracking-[.2em] text-violet-200">{businessTypeLabel(organization.businessType)}</p><h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Book your next visit at <span className="text-teal-200">{organization.name}</span></h1><p className="mt-3 max-w-lg text-sm leading-6 text-indigo-100/85">Choose a service, find a time that works for you, and confirm your appointment in a few simple steps.</p></div>{organization.phone && <div className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white/90"><Phone size={15} />{organization.phone}</div>}</div>
          </div>

          <div className="flex items-start gap-3 border-b border-slate-100 bg-violet-50/60 px-5 py-4 sm:px-8">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-violet-700" />
            <p className="text-xs leading-5 text-violet-950">Cancellation policy: requests more than {organization.cancellationPolicy?.windowHours || 24} hours before the appointment are cancelled automatically. Later requests need business approval.</p>
          </div>

          {offers.length > 0 && <section className="border-b border-slate-100 bg-gradient-to-r from-emerald-50/70 to-violet-50/50 px-5 py-4 sm:px-8"><div className="mb-3 flex items-center gap-2"><Sparkles size={16} className="text-emerald-700" /><h2 className="text-sm font-extrabold text-slate-900">Available promotions</h2></div><div className="grid gap-2 sm:grid-cols-2">{offers.filter((offer) => !offer.serviceIds?.length || offer.serviceIds.some((id) => String(id) === String(serviceId))).map((offer) => <button type="button" key={offer._id} onClick={() => { setCouponCode(offer.code); setCouponResult(null); setCouponMessage('Enter your contact details, then apply this code.'); }} className="flex items-start justify-between gap-3 rounded-xl border border-emerald-100 bg-white/90 p-3 text-left transition hover:border-emerald-300 hover:shadow-sm"><span className="min-w-0"><span className="block text-sm font-bold text-slate-900">{offer.name}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{offer.description || (offer.firstVisitOnly ? 'For first-time customers' : 'Available on eligible bookings')}</span><span className="mt-2 inline-flex rounded-md bg-emerald-50 px-2 py-1 font-mono text-xs font-extrabold text-emerald-800">{offer.code}</span><span className="mt-1 block text-[11px] text-slate-500">Minimum booking: {formatPrice(offer.minimumBookingAmount || 0)}{offer.firstVisitOnly ? ' · First visit only' : ''}</span></span><span className="shrink-0 text-sm font-extrabold text-emerald-700">{offer.discountType === 'percentage' ? `${offer.discountValue}% off` : `${formatPrice(offer.discountValue)} off`}</span></button>)}</div></section>}

          <div className="grid gap-0 lg:grid-cols-[1.08fr_.92fr]">
            <form onSubmit={submitBooking} className="space-y-8 p-5 sm:p-8 lg:p-10">
              <section>
                <div className="mb-4 flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-xl bg-violet-50 text-sm font-extrabold text-violet-700">01</span><div><h2 className="font-bold text-slate-900">Choose a service</h2><p className="text-xs text-slate-500">What would you like to book?</p></div></div>
                {services.length === 0 ? <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">This business has no services available for online booking yet.</p> : <div className="grid gap-3 sm:grid-cols-2">{services.map((service) => {
                  const selected = service._id === serviceId;
                  return <button type="button" key={service._id} onClick={() => { setServiceId(service._id); setSelectedSlot(null); setCouponResult(null); setCouponMessage(couponCode ? 'Service changed. Apply the coupon again for this service.' : ''); }} className={`rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${selected ? 'border-violet-400 bg-violet-50/70 shadow-sm ring-2 ring-violet-100' : 'border-slate-200 bg-white hover:border-violet-200'}`} aria-pressed={selected}>
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-bold text-slate-900">{service.name}</p>{service.category && <p className="mt-1 text-xs text-slate-500">{service.category}</p>}</div><span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${selected ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-300'}`}>{selected && <CheckCircle2 size={15} />}</span></div>
                    <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">{service.description || 'A service provided by this business.'}</p><div className="mt-4 flex items-center justify-between gap-2"><span className="inline-flex items-center gap-1 text-xs text-slate-500"><Clock3 size={13} />{service.duration} min</span><span className="font-extrabold text-violet-700">{formatPrice(service.price, service.currency)}</span></div>
                  </button>;
                })}</div>}
              </section>

              <section>
                <div className="mb-4 flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-xl bg-violet-50 text-sm font-extrabold text-violet-700">02</span><div><h2 className="font-bold text-slate-900">Find a time</h2><p className="text-xs text-slate-500">Select a date and preferred team member.</p></div></div>
                <div className="grid gap-4 sm:grid-cols-2"><div><label className="label" htmlFor="booking-date">Appointment date</label><div className="relative"><CalendarDays size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input id="booking-date" type="date" min={dateInTimeZone(organization.timezone)} value={date} onChange={(event) => setDate(event.target.value)} className="input pl-9" required /></div></div><div><label className="label" htmlFor="booking-staff">Team member</label><div className="relative"><UserRound size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><select id="booking-staff" value={staffId} onChange={(event) => setStaffId(event.target.value)} className="input pl-9"><option value="">Any available team member</option>{staff.map((person) => <option key={person._id} value={person._id}>{person.name}{person.specialization ? ` · ${person.specialization}` : ''}</option>)}</select></div></div></div>
                <div className="mt-5 rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50/80 via-white to-teal-50/60 p-4 sm:p-5">
                  <div className="mb-3 flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white"><Sparkles size={17} /></span><div><h3 className="text-sm font-extrabold text-slate-900">Need help finding a time?</h3><p className="mt-1 text-xs leading-5 text-slate-500">Tell BookFlow AI when you would like to visit. It checks real slots for this service; it will not book until you confirm.</p></div></div>
                  <form onSubmit={askPublicBookingAI} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 focus-within:border-violet-300"><input value={aiQuery} onChange={(event) => setAiQuery(event.target.value)} maxLength={500} disabled={aiBusy} className="min-w-0 flex-1 border-0 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-400" placeholder="e.g. Tomorrow after 5 PM or around 3 PM on Friday" aria-label="Describe your preferred appointment time" /><button type="submit" disabled={aiBusy || !aiQuery.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-violet-600 text-white transition hover:bg-violet-700 disabled:opacity-60" aria-label="Ask AI for booking times">{aiBusy ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}</button></form>
                  {aiError && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{aiError}</p>}
                  {aiBusy && <p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><MessageCircle size={14} /> Understanding your request and checking availability…</p>}
                  {aiResult && <div className="mt-4 rounded-xl border border-violet-100 bg-white p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-slate-900">{aiResult.message}</p><span className={aiResult.aiPowered ? 'badge-green' : 'badge-gray'}>{aiResult.aiPowered ? 'Groq AI' : 'Built-in parser'}</span></div>{aiResult.notice && <p className="mt-2 text-xs text-slate-500">{aiResult.notice}</p>}{aiResult.slots?.length > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2">{aiResult.slots.map((slot) => <button key={`${slot.staffId}-${slot.time}`} type="button" onClick={() => chooseAiSuggestion(slot)} className="flex items-center justify-between gap-3 rounded-xl border border-violet-100 bg-violet-50/50 p-3 text-left transition hover:border-violet-300 hover:bg-violet-50"><span><span className="block text-sm font-extrabold text-slate-900">{formatTime(slot.time)}</span><span className="mt-1 block text-xs text-slate-500">{slot.staffName}</span></span><span className="text-xs font-bold text-violet-700">Choose <ArrowRight size={12} className="inline" /></span></button>)}</div>}</div>}
                </div>
                <div className="mt-4"><div className="mb-2 flex items-center justify-between gap-3"><label className="label mb-0">Available times</label>{slotsLoading && <span className="inline-flex items-center gap-1.5 text-xs text-violet-700"><Loader2 size={13} className="animate-spin" />Checking availability</span>}</div>
                  {slotError && <p role="alert" className="mb-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{slotError}</p>}
                  {!slotsLoading && !slotError && slots.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No available times for this selection. Try another date or team member.</p>}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{slots.map((slot) => {
                    const key = `${slot.staffId}-${slot.time}`;
                    const selected = selectedSlot?.staffId === slot.staffId && selectedSlot?.time === slot.time;
                    return <button type="button" key={key} onClick={() => { setSelectedSlot(slot); setSubmitError(''); }} className={`rounded-xl border px-3 py-3 text-left transition-colors ${selected ? 'border-violet-500 bg-violet-600 text-white shadow-md shadow-violet-500/15' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50/60'}`} aria-pressed={selected}><p className="text-sm font-bold">{formatTime(slot.time)}</p><p className={`mt-1 truncate text-[11px] ${selected ? 'text-violet-100' : 'text-slate-500'}`}>{slot.staffName}</p></button>;
                  })}</div>
                </div>
              </section>

              <section>
                <div className="mb-4 flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-xl bg-violet-50 text-sm font-extrabold text-violet-700">03</span><div><h2 className="font-bold text-slate-900">Your details</h2><p className="text-xs text-slate-500">No account required. Add at least one contact method.</p></div></div>
                <div className="space-y-4"><div><label className="label" htmlFor="booking-name">Full name *</label><input id="booking-name" className="input" autoComplete="name" value={form.name} onChange={(event) => updateForm('name', event.target.value)} maxLength={100} placeholder="Your name" required /></div><div className="grid gap-4 sm:grid-cols-2"><div><label className="label" htmlFor="booking-email">Email address</label><input id="booking-email" type="email" className="input" autoComplete="email" value={form.email} onChange={(event) => updateForm('email', event.target.value)} maxLength={254} placeholder="you@example.com" /></div><div><label className="label" htmlFor="booking-phone">Phone number</label><input id="booking-phone" type="tel" className="input" autoComplete="tel" value={form.phone} onChange={(event) => updateForm('phone', event.target.value)} maxLength={25} placeholder="Your phone number" /></div></div><div><label className="label" htmlFor="booking-notes">Notes <span className="font-normal text-slate-400">(optional)</span></label><textarea id="booking-notes" className="input resize-y" rows={2} value={form.notes} onChange={(event) => updateForm('notes', event.target.value)} maxLength={500} placeholder="Anything the team should know?" /></div></div>
              </section>

              <section>
                <div className="mb-4 flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-xl bg-teal-50 text-sm font-extrabold text-teal-700">04</span><div><h2 className="font-bold text-slate-900">Apply a coupon</h2><p className="text-xs text-slate-500">Optional · eligible discounts are calculated by the business server.</p></div></div>
                <div className="flex flex-col gap-2 sm:flex-row"><input aria-label="Coupon code" className="input min-w-0 flex-1 font-mono uppercase" value={couponCode} onChange={(event) => { setCouponCode(event.target.value.toUpperCase()); setCouponResult(null); setCouponMessage(''); }} maxLength={30} placeholder="Enter coupon code"/><button type="button" onClick={applyCoupon} disabled={couponChecking || !couponCode.trim()} className="btn-secondary shrink-0 justify-center disabled:cursor-not-allowed disabled:opacity-60">{couponChecking ? <><Loader2 size={15} className="animate-spin"/> Checking…</> : 'Apply coupon'}</button></div>
                {couponMessage && <p role="status" className={`mt-2 text-xs leading-5 ${couponResult ? 'text-emerald-700' : couponChecking ? 'text-slate-500' : 'text-amber-700'}`}>{couponMessage}</p>}
                {couponResult && <div className="mt-3 flex items-start justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3"><div><p className="text-sm font-bold text-emerald-900">{couponResult.coupon.name}</p><p className="mt-1 text-xs text-emerald-800">Code {couponResult.coupon.code} · discount applied</p></div><p className="shrink-0 text-sm font-extrabold text-emerald-700">−{formatPrice(couponResult.discountAmount, couponResult.currency)}</p></div>}
              </section>
              {submitError && <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">{submitError}</p>}
              <button type="submit" disabled={submitting || !services.length || !staff.length} className="btn-primary min-h-12 w-full rounded-2xl px-5 py-3 text-sm">{submitting ? <><Loader2 size={17} className="animate-spin" /> Confirming your booking…</> : <>Confirm appointment <ArrowRight size={17} /></>}</button>
              <p className="flex items-center justify-center gap-2 text-center text-[11px] leading-5 text-slate-400"><ShieldCheck size={14} />Your details are shared with this business only to manage your booking.</p>
            </form>

            <aside className="border-t border-slate-100 bg-slate-50/80 p-5 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
              <div className="sticky top-6"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-violet-700">Your appointment</p><h2 className="mt-2 text-xl font-extrabold tracking-tight text-slate-900">Booking summary</h2><p className="mt-1 text-sm text-slate-500">Review your selection before confirming.</p>
                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-700"><CalendarDays size={19} /></div><div className="min-w-0"><p className="font-bold text-slate-900">{organization.name}</p><p className="mt-1 text-xs text-slate-500">{businessTypeLabel(organization.businessType)}</p></div></div><div className="space-y-3 border-t border-slate-100 pt-4 text-sm"><div className="flex items-start justify-between gap-4"><span className="text-slate-500">Service</span><span className="text-right font-semibold text-slate-800">{selectedService?.name || 'Select a service'}</span></div><div className="flex items-start justify-between gap-4"><span className="text-slate-500">Date</span><span className="text-right font-semibold text-slate-800">{date ? new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Choose a date'}</span></div><div className="flex items-start justify-between gap-4"><span className="text-slate-500">Time</span><span className="text-right font-semibold text-slate-800">{selectedSlot ? `${formatTime(selectedSlot.time)} · ${selectedSlot.staffName}` : 'Choose an available time'}</span></div><div className="flex items-start justify-between gap-4"><span className="text-slate-500">Duration</span><span className="text-right font-semibold text-slate-800">{selectedService ? `${selectedService.duration} minutes` : '—'}</span></div></div>{couponResult && <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm"><span className="text-slate-500">Original price</span><span className="font-semibold text-slate-400 line-through">{formatPrice(couponResult.basePrice, couponResult.currency)}</span></div>}{couponResult && <div className="mt-2 flex items-center justify-between text-sm"><span className="text-emerald-700">Coupon discount</span><span className="font-bold text-emerald-700">−{formatPrice(couponResult.discountAmount, couponResult.currency)}</span></div>}<div className={`${couponResult ? 'mt-2' : 'mt-5 border-t border-slate-100 pt-4'} flex items-center justify-between gap-3`}><span className="text-sm font-semibold text-slate-600">Estimated total</span><span className="text-xl font-extrabold tracking-tight text-violet-700">{selectedService ? formatPrice(couponResult?.finalPrice ?? selectedService.price, selectedService.currency) : '—'}</span></div><p className="mt-2 text-[11px] leading-5 text-slate-400">No payment is collected on this demo booking page. The coupon is revalidated when you confirm.</p></div>
                <div className="mt-4 rounded-2xl border border-teal-100 bg-teal-50/70 p-4"><div className="flex gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-teal-700"><ShieldCheck size={18} /></div><div><p className="text-sm font-bold text-teal-950">Easy online booking</p><p className="mt-1 text-xs leading-5 text-teal-900/75">Available times are checked against the team’s schedule before your appointment is confirmed.</p></div></div></div>
              </div>
            </aside>
          </div>
        </section>
        <footer className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-slate-400"><span>Powered by BookFlow AI</span><span>·</span><span>Appointment management made simple</span></footer>
      </div>
    </main>
  );
}
