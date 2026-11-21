import { useEffect, useMemo, useState } from 'react';
import { Percent, CalendarDays, Check, CircleOff, Copy, Edit3, Gift, Plus, RefreshCw, Tag, Users, X, Sparkles } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import { formatINR } from '../utils/currency';
import { useAuth } from '../context/AuthContext';

const localDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const makeDefaultForm = () => {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 30);
  return {
    name: '', code: '', description: '', discountType: 'percentage', discountValue: '10',
    maxDiscountAmount: '', minimumBookingAmount: '0', validFrom: localDate(), validUntil: localDate(expiry),
    usageLimit: '', maxRedemptionsPerCustomer: '1', firstVisitOnly: false,
    showOnPublicPage: true, serviceIds: [],
  };
};

const dateValue = (value) => value ? new Date(value).toISOString().slice(0, 10) : '';
const offerStatus = (offer) => {
  const now = Date.now();
  if (!offer.isActive) return { label: 'Paused', className: 'bg-slate-100 text-slate-600' };
  if (new Date(offer.validFrom).getTime() > now) return { label: 'Scheduled', className: 'bg-blue-50 text-blue-700' };
  if (new Date(offer.validUntil).getTime() < now) return { label: 'Expired', className: 'bg-rose-50 text-rose-700' };
  if (offer.usageLimit && offer.redemptionCount >= offer.usageLimit) return { label: 'Limit reached', className: 'bg-amber-50 text-amber-700' };
  return { label: 'Active', className: 'bg-emerald-50 text-emerald-700' };
};

export default function Offers() {
  const { user } = useAuth();
  const canManage = ['business_owner', 'super_admin'].includes(user?.role);
  const [offers, setOffers] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(makeDefaultForm);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [offerResponse, serviceResponse] = await Promise.all([api.get('/offers'), api.get('/services')]);
      setOffers(offerResponse.data.data || []);
      setServices(serviceResponse.data.data || []);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load offers. Please check the backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredOffers = useMemo(() => offers.filter((offer) => {
    const haystack = `${offer.name} ${offer.code} ${offer.description}`.toLowerCase();
    return haystack.includes(search.toLowerCase().trim());
  }), [offers, search]);

  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const openCreate = () => {
    setEditing(null);
    setForm(makeDefaultForm());
    setError(''); setMessage(''); setShowModal(true);
  };

  const openEdit = (offer) => {
    setEditing(offer);
    setForm({
      name: offer.name || '', code: offer.code || '', description: offer.description || '',
      discountType: offer.discountType || 'percentage', discountValue: String(offer.discountValue ?? 10),
      maxDiscountAmount: offer.maxDiscountAmount == null ? '' : String(offer.maxDiscountAmount),
      minimumBookingAmount: String(offer.minimumBookingAmount ?? 0),
      validFrom: dateValue(offer.validFrom), validUntil: dateValue(offer.validUntil),
      usageLimit: offer.usageLimit == null ? '' : String(offer.usageLimit),
      maxRedemptionsPerCustomer: String(offer.maxRedemptionsPerCustomer || 1),
      firstVisitOnly: Boolean(offer.firstVisitOnly), showOnPublicPage: offer.showOnPublicPage !== false,
      serviceIds: (offer.serviceIds || []).map((item) => String(item?._id || item)),
    });
    setError(''); setMessage(''); setShowModal(true);
  };

  const submitOffer = async (event) => {
    event.preventDefault();
    setSaving(true); setError(''); setMessage('');
    const payload = {
      ...form,
      code: form.code.trim().toUpperCase(),
      discountValue: Number(form.discountValue),
      maxDiscountAmount: form.maxDiscountAmount === '' ? null : Number(form.maxDiscountAmount),
      minimumBookingAmount: Number(form.minimumBookingAmount),
      usageLimit: form.usageLimit === '' ? null : Number(form.usageLimit),
      maxRedemptionsPerCustomer: Number(form.maxRedemptionsPerCustomer),
    };
    try {
      if (editing) await api.put(`/offers/${editing._id}`, payload);
      else await api.post('/offers', payload);
      setShowModal(false);
      setMessage(editing ? 'Offer updated successfully.' : 'Offer created successfully.');
      await fetchData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Offer could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const fetchAiRecommendations = async () => {
    setAiLoading(true);
    setAiError('');
    try {
      const { data } = await api.get('/ai/offer-recommendations');
      setAiRecommendations(data.data);
    } catch (requestError) {
      setAiError(requestError.response?.data?.message || 'AI offer recommendations could not be loaded. Please retry.');
    } finally { setAiLoading(false); }
  };

  const useRecommendation = (recommendation) => {
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + 30);
    const compactCode = String(recommendation.title || 'OFFER').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16) || 'AIOFFER';
    setEditing(null);
    setForm({
      ...makeDefaultForm(),
      name: recommendation.title || 'AI suggested offer',
      code: `${compactCode.slice(0, 22)}${recommendation.discountType === 'percentage' ? Math.round(recommendation.discountValue) : 'FIX'}`.slice(0, 30),
      description: `${recommendation.rationale || 'AI-generated offer idea.'} ${recommendation.guardrail || ''}`.trim().slice(0, 500),
      discountType: recommendation.discountType === 'fixed' ? 'fixed' : 'percentage',
      discountValue: String(recommendation.discountValue ?? 10),
      maxDiscountAmount: recommendation.maxDiscountAmount == null ? '' : String(recommendation.maxDiscountAmount),
      minimumBookingAmount: String(recommendation.minimumBookingAmount ?? 0),
      validFrom: localDate(), validUntil: localDate(newExpiry),
      firstVisitOnly: /new|first/i.test(recommendation.audience || ''),
      showOnPublicPage: true, serviceIds: [], usageLimit: '', maxRedemptionsPerCustomer: '1',
    });
    setError(''); setMessage('Review the AI suggestion, edit its coupon code and rules, then save it when ready.');
    setShowModal(true);
  };

  const toggleOffer = async (offer) => {
    setError(''); setMessage('');
    try {
      await api.patch(`/offers/${offer._id}/status`, { isActive: !offer.isActive });
      setMessage(offer.isActive ? 'Offer paused.' : 'Offer activated.');
      await fetchData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not update offer status.');
    }
  };

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setMessage(`Coupon code ${code} copied.`);
    } catch {
      window.prompt('Copy coupon code:', code);
    }
  };

  const activeCount = offers.filter((offer) => offerStatus(offer).label === 'Active').length;
  const publicCount = offers.filter((offer) => offer.isActive && offer.showOnPublicPage !== false).length;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#211d4f] via-[#37316f] to-[#5145a4] p-6 text-white shadow-xl shadow-violet-950/10 sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -bottom-20 right-1/4 h-40 w-40 rounded-full bg-teal-300/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            <p className="mb-2 text-xs font-extrabold uppercase tracking-[.18em] text-violet-200">Customer growth</p>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Offers & coupons</h2>
            <p className="mt-2 text-sm leading-6 text-indigo-100/85">Create clear promotions, reward first visits, and bring customers back—with discount rules validated by the backend.</p>
          </div>
          <div className="flex flex-wrap gap-2">{canManage && <button type="button" onClick={fetchAiRecommendations} disabled={aiLoading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-white/15 disabled:opacity-60"><Sparkles size={16} className={aiLoading ? 'animate-pulse' : ''} /> {aiLoading ? 'Thinking…' : 'AI offer ideas'}</button>}{canManage && <button type="button" onClick={openCreate} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-violet-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-violet-50"><Plus size={17} /> Create offer</button>}</div>
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {message && <div role="status" className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}

      {aiError && <div role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">{aiError}</div>}
      {aiRecommendations && <section className="card overflow-hidden border border-violet-100">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-violet-100 bg-gradient-to-r from-violet-50 to-teal-50/60 px-5 py-4">
          <div><h3 className="flex items-center gap-2 font-extrabold text-slate-900"><Sparkles size={17} className="text-violet-600" />AI offer recommendations</h3><p className="mt-1 text-xs text-slate-500">Suggestions are drafts based on this workspace’s aggregate booking and service data.</p></div>
          <span className={aiRecommendations.aiPowered ? 'badge-green' : 'badge-gray'}>{aiRecommendations.aiPowered ? `Groq AI · ${aiRecommendations.aiModel || ''}` : 'Rule-based ideas'}</span>
        </div>
        <div className="p-5">
          {aiRecommendations.notice && <p className="mb-4 text-xs text-slate-500">{aiRecommendations.notice}</p>}
          <div className="grid gap-3 lg:grid-cols-3">{(aiRecommendations.recommendations || []).map((idea) => <article key={idea.id || idea.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-violet-600">{idea.audience}</p>
            <h4 className="mt-1 font-extrabold text-slate-900">{idea.title}</h4>
            <p className="mt-3 text-sm font-bold text-violet-700">{idea.discountType === 'percentage' ? `${idea.discountValue}% off` : `${formatINR(idea.discountValue)} off`}</p>
            <p className="mt-3 text-sm leading-5 text-slate-600">{idea.rationale}</p>
            <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900"><strong>Guardrail:</strong> {idea.guardrail}</div>
            <p className="mt-3 text-xs text-slate-500">Minimum booking: {formatINR(idea.minimumBookingAmount || 0)}{idea.maxDiscountAmount != null ? ` · Cap: ${formatINR(idea.maxDiscountAmount)}` : ''}</p>
            {canManage && <button type="button" onClick={() => useRecommendation(idea)} className="btn-secondary mt-4 w-full justify-center"><Plus size={14} /> Review as draft</button>}
          </article>)}</div>
          <p className="mt-4 text-xs leading-5 text-slate-400">Nothing is created or sent automatically. Review the draft and save it yourself. Backend offer rules remain authoritative.</p>
        </div>
      </section>}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card flex items-center gap-3 p-4"><div className="grid h-11 w-11 place-items-center rounded-xl bg-violet-50 text-violet-700"><Tag size={20} /></div><div><p className="text-xs font-semibold text-slate-500">Total offers</p><p className="mt-1 text-2xl font-extrabold text-slate-900">{offers.length}</p></div></div>
        <div className="card flex items-center gap-3 p-4"><div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Percent size={20} /></div><div><p className="text-xs font-semibold text-slate-500">Currently active</p><p className="mt-1 text-2xl font-extrabold text-slate-900">{activeCount}</p></div></div>
        <div className="card flex items-center gap-3 p-4"><div className="grid h-11 w-11 place-items-center rounded-xl bg-teal-50 text-teal-700"><Gift size={20} /></div><div><p className="text-xs font-semibold text-slate-500">Publicly displayed</p><p className="mt-1 text-2xl font-extrabold text-slate-900">{publicCount}</p></div></div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h3 className="text-lg font-extrabold text-slate-900">Promotion library</h3><p className="mt-1 text-sm text-slate-500">Coupon rules and redemptions for this workspace.</p></div>
        <div className="flex gap-2"><input className="input min-w-0 sm:w-64" placeholder="Search offers or codes…" value={search} onChange={(event) => setSearch(event.target.value)} /><button type="button" className="btn-secondary" onClick={fetchData} aria-label="Refresh offers"><RefreshCw size={15} /></button></div>
      </div>

      {loading ? <LoadingSpinner /> : filteredOffers.length === 0 ? (
        <EmptyState icon={Tag} title={search ? 'No offers match your search' : 'No offers yet'} description={canManage ? 'Create your first coupon to make it available for eligible public bookings.' : 'Your business has not created any offers yet.'} />
      ) : <div className="grid gap-4 xl:grid-cols-2">
        {filteredOffers.map((offer) => {
          const status = offerStatus(offer);
          const serviceNames = (offer.serviceIds || []).map((item) => item?.name).filter(Boolean);
          const discountText = offer.discountType === 'percentage' ? `${offer.discountValue}% off` : `${formatINR(offer.discountValue)} off`;
          return <article key={offer._id} className="card overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-950/5">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-violet-50/70 to-teal-50/50 p-5">
              <div className="flex min-w-0 items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-violet-700 shadow-sm"><Gift size={20} /></div><div className="min-w-0"><h4 className="truncate font-extrabold text-slate-900">{offer.name}</h4><p className="mt-1 text-sm font-semibold text-violet-700">{discountText}</p></div></div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${status.className}`}>{status.label}</span>
            </div>
            <div className="space-y-4 p-5">
              {offer.description && <p className="text-sm leading-5 text-slate-600">{offer.description}</p>}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-violet-200 bg-violet-50/50 p-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-slate-500">Coupon code</p><p className="mt-1 font-mono text-lg font-extrabold tracking-wider text-violet-900">{offer.code}</p></div><button type="button" onClick={() => copyCode(offer.code)} className="btn-secondary"><Copy size={14} /> Copy code</button></div>
              <div className="grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Minimum booking</p><p className="mt-1 font-bold text-slate-800">{formatINR(offer.minimumBookingAmount || 0)}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Redemptions</p><p className="mt-1 font-bold text-slate-800">{offer.redemptionCount || 0}{offer.usageLimit ? ` / ${offer.usageLimit}` : ' / Unlimited'}</p></div></div>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500"><span className="inline-flex items-center gap-1.5"><CalendarDays size={14} /> Until {new Date(offer.validUntil).toLocaleDateString('en-IN')}</span><span className="inline-flex items-center gap-1.5"><Users size={14} /> {offer.firstVisitOnly ? 'First visit only' : `${offer.maxRedemptionsPerCustomer || 1} use(s) per customer`}</span></div>
              <p className="text-xs text-slate-500">{serviceNames.length ? `Eligible: ${serviceNames.join(', ')}` : 'Eligible: all active services'} · {offer.showOnPublicPage === false ? 'Hidden from public page' : 'Shown on public page'}</p>
              {canManage && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" onClick={() => toggleOffer(offer)} className="btn-secondary">{offer.isActive ? <><CircleOff size={14} /> Pause offer</> : <><Check size={14} /> Activate</>}</button><button type="button" onClick={() => openEdit(offer)} className="btn-primary"><Edit3 size={14} /> Edit offer</button></div>}
            </div>
          </article>;
        })}
      </div>}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit offer' : 'Create offer'} size="xl">
        <form onSubmit={submitOffer} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="offer-name">Offer name *</label><input id="offer-name" className="input" value={form.name} onChange={(event) => setField('name', event.target.value)} maxLength={100} placeholder="First visit special" required /></div>
            <div><label className="label" htmlFor="offer-code">Coupon code *</label><input id="offer-code" className="input font-mono uppercase" value={form.code} onChange={(event) => setField('code', event.target.value.toUpperCase())} minLength={3} maxLength={30} pattern="[A-Za-z0-9][A-Za-z0-9_-]{2,29}" placeholder="FIRST15" required /><p className="mt-1 text-xs text-slate-500">3–30 letters, numbers, hyphens or underscores.</p></div>
          </div>
          <div><label className="label" htmlFor="offer-description">Description</label><textarea id="offer-description" className="input resize-y" rows={2} maxLength={500} value={form.description} onChange={(event) => setField('description', event.target.value)} placeholder="A short message customers will understand" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="offer-discount-type">Discount type *</label><select id="offer-discount-type" className="input" value={form.discountType} onChange={(event) => setField('discountType', event.target.value)}><option value="percentage">Percentage (%)</option><option value="fixed">Fixed amount (₹)</option></select></div>
            <div><label className="label" htmlFor="offer-discount-value">Discount value *</label><input id="offer-discount-value" type="number" className="input" min="0.01" max={form.discountType === 'percentage' ? 100 : undefined} step="0.01" value={form.discountValue} onChange={(event) => setField('discountValue', event.target.value)} required /></div>
            <div><label className="label" htmlFor="offer-max-discount">Maximum discount cap (₹)</label><input id="offer-max-discount" type="number" className="input" min="0" step="0.01" value={form.maxDiscountAmount} onChange={(event) => setField('maxDiscountAmount', event.target.value)} placeholder="Optional" /><p className="mt-1 text-xs text-slate-500">Usually applied to percentage offers.</p></div>
            <div><label className="label" htmlFor="offer-minimum">Minimum booking value (₹)</label><input id="offer-minimum" type="number" className="input" min="0" step="0.01" value={form.minimumBookingAmount} onChange={(event) => setField('minimumBookingAmount', event.target.value)} required /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="offer-valid-from">Valid from *</label><input id="offer-valid-from" type="date" className="input" value={form.validFrom} onChange={(event) => setField('validFrom', event.target.value)} required /></div>
            <div><label className="label" htmlFor="offer-valid-until">Valid until * (inclusive)</label><input id="offer-valid-until" type="date" min={form.validFrom} className="input" value={form.validUntil} onChange={(event) => setField('validUntil', event.target.value)} required /></div>
            <div><label className="label" htmlFor="offer-usage-limit">Total redemption limit</label><input id="offer-usage-limit" type="number" className="input" min="1" step="1" value={form.usageLimit} onChange={(event) => setField('usageLimit', event.target.value)} placeholder="Leave empty for unlimited" /></div>
            <div><label className="label" htmlFor="offer-per-customer">Uses per customer *</label><input id="offer-per-customer" type="number" className="input" min="1" max="100" step="1" value={form.maxRedemptionsPerCustomer} onChange={(event) => setField('maxRedemptionsPerCustomer', event.target.value)} required /></div>
          </div>
          {services.length > 0 && <fieldset className="rounded-2xl border border-slate-200 p-4"><legend className="px-1 text-sm font-bold text-slate-800">Eligible services</legend><p className="mb-3 text-xs text-slate-500">Choose specific services, or leave all unchecked to allow every active service.</p><div className="grid gap-2 sm:grid-cols-2">{services.map((service) => <label key={service._id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-100 p-3 text-sm text-slate-700 hover:border-violet-200"><input type="checkbox" checked={form.serviceIds.includes(service._id)} onChange={(event) => setField('serviceIds', event.target.checked ? [...form.serviceIds, service._id] : form.serviceIds.filter((id) => id !== service._id))} className="h-4 w-4 accent-violet-600"/><span className="flex-1">{service.name}</span><span className="text-xs text-slate-500">{formatINR(service.price)}</span></label>)}</div></fieldset>}
          <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-violet-600" checked={form.firstVisitOnly} onChange={(event) => setField('firstVisitOnly', event.target.checked)} /><span><strong className="text-slate-800">First visit only</strong><span className="mt-0.5 block text-xs leading-5 text-slate-500">Reject this coupon if the customer already has a non-cancelled appointment with this business.</span></span></label>
            <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-violet-600" checked={form.showOnPublicPage} onChange={(event) => setField('showOnPublicPage', event.target.checked)} /><span><strong className="text-slate-800">Show on public booking page</strong><span className="mt-0.5 block text-xs leading-5 text-slate-500">Customers can discover this code before applying it.</span></span></label>
          </div>
          {error && <div role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setShowModal(false)} className="btn-secondary"><X size={15} /> Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : editing ? 'Save changes' : 'Create offer'}</button></div>
        </form>
      </Modal>
    </div>
  );
}
