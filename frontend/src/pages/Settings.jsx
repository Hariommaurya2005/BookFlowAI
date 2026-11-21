import { useEffect, useState } from 'react';
import { Copy, ExternalLink, Globe2, CheckCircle2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import Alert from '../components/ui/Alert';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function Settings() {
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [publicBooking, setPublicBooking] = useState(null);
  const [publicBookingLoading, setPublicBookingLoading] = useState(true);
  const [publicBookingSaving, setPublicBookingSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [cancellationWindowHours, setCancellationWindowHours] = useState(24);
  const [cancellationPolicyLoading, setCancellationPolicyLoading] = useState(true);
  const [cancellationPolicySaving, setCancellationPolicySaving] = useState(false);
  const { register, handleSubmit, reset } = useForm();
  const pwForm = useForm();

  useEffect(() => {
    api.get('/settings').then(({ data }) => { setOrg(data.data); reset(data.data); }).finally(() => setLoading(false));
    api.get('/settings/public-booking')
      .then(({ data }) => setPublicBooking(data.data))
      .catch((error) => setErr(error.response?.data?.message || 'Could not load public booking settings.'))
      .finally(() => setPublicBookingLoading(false));
    api.get('/settings/cancellation-policy')
      .then(({ data }) => setCancellationWindowHours(Number(data.data.windowHours) || 24))
      .catch((error) => setErr(error.response?.data?.message || 'Could not load cancellation policy.'))
      .finally(() => setCancellationPolicyLoading(false));
  }, []);

  const onSubmit = async (data) => {
    try {
      setErr(''); setMsg('');
      await api.put('/settings', data);
      setMsg('Settings updated successfully.');
    } catch (e) { setErr(e.response?.data?.message || 'Update failed'); }
  };


  const togglePublicBooking = async () => {
    if (!publicBooking || publicBookingSaving) return;
    setPublicBookingSaving(true);
    setErr(''); setMsg('');
    try {
      const { data } = await api.put('/settings/public-booking', { enabled: !publicBooking.enabled });
      setPublicBooking(data.data);
      setMsg(data.message || (data.data.enabled ? 'Public booking enabled.' : 'Public booking disabled.'));
    } catch (error) {
      setErr(error.response?.data?.message || 'Could not update public booking settings.');
    } finally {
      setPublicBookingSaving(false);
    }
  };

  const copyPublicBookingLink = async () => {
    if (!publicBooking?.url) return;
    try {
      await navigator.clipboard.writeText(publicBooking.url);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      setErr('Clipboard access was blocked. Select and copy the booking URL manually.');
    }
  };

  const saveCancellationPolicy = async (event) => {
    event.preventDefault();
    const hours = Number(cancellationWindowHours);
    if (!Number.isInteger(hours) || hours < 1 || hours > 720) {
      setErr('Cancellation window must be a whole number between 1 and 720 hours.');
      return;
    }
    setCancellationPolicySaving(true);
    setErr(''); setMsg('');
    try {
      const { data } = await api.put('/settings/cancellation-policy', { windowHours: hours });
      setCancellationWindowHours(data.data.windowHours);
      setMsg('Cancellation policy saved successfully.');
    } catch (error) {
      setErr(error.response?.data?.message || 'Could not save cancellation policy.');
    } finally {
      setCancellationPolicySaving(false);
    }
  };

  const onChangePw = async (data) => {
    try {
      setErr(''); setMsg('');
      await api.put('/settings/change-password', data);
      setMsg('Password changed successfully.');
      pwForm.reset();
    } catch (e) { setErr(e.response?.data?.message || 'Change failed'); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-2xl space-y-6">
      <Alert type="success" message={msg} onClose={() => setMsg('')} />
      <Alert type="error" message={err} onClose={() => setErr('')} />

      <div className="card p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Business Profile</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Company Name</label>
            <input className="input" {...register('name')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" {...register('email')} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" {...register('phone')} />
            </div>
          </div>
          <button type="submit" className="btn-primary">Save Changes</button>
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 bg-gradient-to-r from-violet-50/80 to-teal-50/70 p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-violet-700 shadow-sm"><Globe2 size={21} /></div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">Public booking page</h3>
              <p className="mt-1 text-sm leading-5 text-slate-600">Let customers choose a service and available time without you creating each appointment manually.</p>
            </div>
            {publicBooking && <span className={publicBooking.enabled ? 'badge-green' : 'badge-gray'}>{publicBooking.enabled ? 'Enabled' : 'Disabled'}</span>}
          </div>
        </div>
        <div className="space-y-4 p-6">
          {publicBookingLoading ? <p className="text-sm text-slate-500">Loading booking link…</p> : publicBooking ? <>
            <div>
              <label className="label" htmlFor="public-booking-url">Shareable booking URL</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input id="public-booking-url" className="input min-w-0 flex-1" value={publicBooking.url || ''} readOnly onFocus={(event) => event.target.select()} />
                <button type="button" onClick={copyPublicBookingLink} className="btn-secondary shrink-0"><Copy size={15} />{copiedLink ? 'Copied' : 'Copy link'}</button>
                <a href={publicBooking.url} target="_blank" rel="noreferrer" className="btn-secondary shrink-0"><ExternalLink size={15} />Open</a>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">Share this link on your website or social profile. Customers can book using the services and staff available in your workspace.</p>
            </div>
            <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/80 p-4 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3"><div className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${publicBooking.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}><CheckCircle2 size={17} /></div><div><p className="text-sm font-semibold text-slate-800">Accept online bookings</p><p className="mt-1 max-w-md text-xs leading-5 text-slate-500">{publicBooking.enabled ? 'Your page is public. The backend validates the selected slot again before creating an appointment.' : 'Customers cannot open this booking page while it is disabled.'}</p></div></div>
              <button type="button" onClick={togglePublicBooking} disabled={publicBookingSaving} className={publicBooking.enabled ? 'btn-secondary shrink-0' : 'btn-primary shrink-0'}>{publicBookingSaving ? 'Saving…' : publicBooking.enabled ? 'Disable page' : 'Enable page'}</button>
            </div>
          </> : <p className="text-sm text-rose-600">Public booking settings could not be loaded. Refresh the page or check the backend response.</p>}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 bg-gradient-to-r from-violet-50/80 to-amber-50/70 p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-violet-700 shadow-sm"><CheckCircle2 size={21} /></div>
            <div>
              <h3 className="font-semibold text-slate-900">Cancellation policy</h3>
              <p className="mt-1 text-sm leading-5 text-slate-600">Choose how much notice customers must give for automatic cancellation. Requests closer to the appointment need your review.</p>
            </div>
          </div>
        </div>
        <form onSubmit={saveCancellationPolicy} className="space-y-4 p-6">
          {cancellationPolicyLoading ? <p className="text-sm text-slate-500">Loading cancellation policy…</p> : <>
            <div className="max-w-xs">
              <label className="label" htmlFor="cancellation-window-hours">Automatic cancellation notice (hours)</label>
              <input id="cancellation-window-hours" type="number" min="1" max="720" step="1" className="input" value={cancellationWindowHours} onChange={(event) => setCancellationWindowHours(event.target.value)} required />
              <p className="mt-2 text-xs leading-5 text-slate-500">More than this many hours before the appointment: cancellation is automatic. Inside this window: the customer submits a request for business approval. Range: 1–720 hours.</p>
            </div>
            <button type="submit" className="btn-primary" disabled={cancellationPolicySaving}>{cancellationPolicySaving ? 'Saving policy…' : 'Save cancellation policy'}</button>
          </>}
        </form>
      </div>

      <div className="card p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Change Password</h3>
        <form onSubmit={pwForm.handleSubmit(onChangePw)} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input type="password" className="input" {...pwForm.register('currentPassword', { required: true })} />
          </div>
          <div>
            <label className="label">New Password</label>
            <input type="password" className="input" {...pwForm.register('newPassword', { required: true, minLength: 6 })} />
          </div>
          <button type="submit" className="btn-primary">Update Password</button>
        </form>
      </div>
    </div>
  );
}
