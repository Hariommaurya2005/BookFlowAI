import { useCallback, useEffect, useState } from 'react';
import {
  Activity, AlertTriangle, Ban, Building2, CheckCircle, ChevronLeft,
  ChevronRight, ClipboardList, RefreshCw, Search, Shield, Users, CreditCard, Save,
} from 'lucide-react';
import api from '../services/api';
import Modal from '../components/ui/Modal';
import Alert from '../components/ui/Alert';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};
const statusClass = (active) => active ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/15' : 'bg-rose-50 text-rose-700 ring-rose-600/15';
const prettyBusinessType = (value) => String(value || 'other').replace(/_/g, ' ').replace(/^./, (letter) => letter.toUpperCase());

function MetricCard({ label, value, helper, icon: Icon, tone = 'violet' }) {
  const tones = {
    violet: 'bg-violet-50 text-violet-700 ring-violet-100',
    teal: 'bg-teal-50 text-teal-700 ring-teal-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
  };
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">{value ?? '—'}</p>
          <p className="mt-1 text-xs text-slate-400">{helper}</p>
        </div>
        <div className={`grid h-11 w-11 place-items-center rounded-xl ring-1 ${tones[tone] || tones.violet}`}><Icon size={20} /></div>
      </div>
    </div>
  );
}

export default function PlatformAdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('organizations');
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPagination, setAuditPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [selectedSubscriptionOrganization, setSelectedSubscriptionOrganization] = useState(null);
  const [subscriptionForm, setSubscriptionForm] = useState({ plan: 'free', status: 'active', periodDays: '30', gracePeriodDays: '3', reason: '' });
  const [subscriptionSaving, setSubscriptionSaving] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchOverview = useCallback(async () => {
    const response = await api.get('/platform-admin/overview');
    setOverview(response.data?.data || null);
  }, []);

  const fetchOrganizations = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const response = await api.get('/platform-admin/organizations', {
        params: { page, limit: 10, search, status: statusFilter },
      });
      const data = response.data?.data || {};
      setOrganizations(data.organizations || []);
      setPagination(data.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 });
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load organizations. Check the platform admin account and backend connection.');
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  const fetchAuditLogs = useCallback(async (page = 1) => {
    try {
      const response = await api.get('/platform-admin/audit-logs', { params: { page, limit: 20 } });
      const data = response.data?.data || {};
      setAuditLogs(data.logs || []);
      setAuditPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load platform audit logs.');
      setAuditLogs([]);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setMessage('');
    try {
      await fetchOverview();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load platform overview.');
    }
    await fetchOrganizations(pagination.page || 1);
    if (activeTab === 'audit') await fetchAuditLogs(auditPagination.page || 1);
  }, [fetchOverview, fetchOrganizations, fetchAuditLogs, pagination.page, activeTab, auditPagination.page]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.allSettled([fetchOverview(), fetchOrganizations(1)]).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [fetchOverview, fetchOrganizations]);

  useEffect(() => {
    if (activeTab === 'audit') fetchAuditLogs(1);
  }, [activeTab, fetchAuditLogs]);

  const openStatusModal = (organization) => {
    setSelectedOrganization(organization);
    setReason('');
    setError('');
    setMessage('');
  };

  const submitStatusChange = async (event) => {
    event.preventDefault();
    if (!selectedOrganization) return;
    setActionLoading(true);
    setError('');
    setMessage('');
    try {
      const nextActive = !selectedOrganization.active;
      const response = await api.patch(`/platform-admin/organizations/${selectedOrganization._id}/status`, {
        active: nextActive,
        reason: reason.trim(),
      });
      setMessage(response.data?.message || `Organization ${nextActive ? 'reactivated' : 'suspended'}.`);
      setSelectedOrganization(null);
      setReason('');
      await fetchOverview();
      await fetchOrganizations(pagination.page || 1);
      if (activeTab === 'audit') await fetchAuditLogs(auditPagination.page || 1);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not update organization status.');
    } finally {
      setActionLoading(false);
    }
  };

  const openSubscriptionModal = (organization) => {
    const current = organization.subscription || {};
    setSelectedSubscriptionOrganization(organization);
    setSubscriptionForm({
      plan: current.plan || organization.subscriptionPlan || 'free',
      status: current.status || 'active',
      periodDays: '30',
      gracePeriodDays: '3',
      reason: '',
    });
    setError('');
    setMessage('');
  };

  const submitSubscriptionChange = async (event) => {
    event.preventDefault();
    if (!selectedSubscriptionOrganization) return;
    setSubscriptionSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await api.patch(`/platform-admin/organizations/${selectedSubscriptionOrganization._id}/subscription`, {
        ...subscriptionForm,
        periodDays: Number(subscriptionForm.periodDays),
        gracePeriodDays: Number(subscriptionForm.gracePeriodDays),
        reason: subscriptionForm.reason.trim(),
      });
      setMessage(response.data?.message || 'Demo subscription updated.');
      setSelectedSubscriptionOrganization(null);
      await fetchOrganizations(pagination.page || 1);
      await fetchOverview();
      if (activeTab === 'audit') await fetchAuditLogs(auditPagination.page || 1);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not update demo subscription.');
    } finally { setSubscriptionSaving(false); }
  };

  const applySearch = (event) => {
    event.preventDefault();
    setSearch(searchInput.trim());
  };

  const showInitialLoading = loading && !overview && organizations.length === 0 && !error;
  if (showInitialLoading) return <LoadingSpinner fullScreen />;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#171633] via-[#302b68] to-[#4b4297] p-6 text-white shadow-xl shadow-violet-950/10 sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -bottom-20 right-1/4 h-44 w-44 rounded-full bg-teal-300/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-violet-100"><Shield size={14} /> Platform control center</div>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Super Admin Console</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-indigo-100/85">Manage business access, review platform-level activity, and keep administrative actions accountable. Tenant data remains isolated.</p>
          </div>
          <button type="button" onClick={refreshAll} disabled={loading || actionLoading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/15 disabled:opacity-60"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh data</button>
        </div>
      </section>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {message && <Alert type="success" message={message} onClose={() => setMessage('')} />}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total businesses" value={overview?.totalOrganizations ?? '—'} helper="Platform tenant organizations" icon={Building2} tone="violet" />
        <MetricCard label="Active businesses" value={overview?.activeOrganizations ?? '—'} helper="Currently allowed to use the platform" icon={CheckCircle} tone="teal" />
        <MetricCard label="Suspended businesses" value={overview?.suspendedOrganizations ?? '—'} helper="Business access disabled" icon={Ban} tone="rose" />
        <MetricCard label="Business users" value={overview?.totalUsers ?? '—'} helper={`${overview?.totalAppointments ?? 0} appointments across tenants`} icon={Users} tone="blue" />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Platform management</h3>
            <p className="mt-1 text-sm text-slate-500">Organization status changes require a reason and are recorded in the platform audit log.</p>
          </div>
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button type="button" onClick={() => setActiveTab('organizations')} className={`rounded-lg px-3 py-2 text-sm font-bold transition ${activeTab === 'organizations' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Businesses</button>
            <button type="button" onClick={() => setActiveTab('audit')} className={`rounded-lg px-3 py-2 text-sm font-bold transition ${activeTab === 'audit' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Audit log</button>
          </div>
        </div>

        {activeTab === 'organizations' ? (
          <>
            <form onSubmit={applySearch} className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:p-5">
              <div className="relative flex-1">
                <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search business, owner email, slug…" className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
              </div>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100">
                <option value="all">All statuses</option><option value="active">Active only</option><option value="suspended">Suspended only</option>
              </select>
              <button type="submit" className="min-h-11 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700">Search</button>
            </form>

            {loading ? <div className="p-10"><LoadingSpinner /></div> : organizations.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500"><Building2 size={22} /></div>
                <h4 className="mt-4 text-sm font-extrabold text-slate-800">No businesses found</h4>
                <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Try a different search or status filter. New business registrations will appear here automatically.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-[1050px] w-full border-collapse text-left">
                    <thead><tr className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500">
                      <th className="px-5 py-3.5 font-extrabold">Business</th><th className="px-5 py-3.5 font-extrabold">Owner</th><th className="px-5 py-3.5 font-extrabold">Usage</th><th className="px-5 py-3.5 font-extrabold">Plan</th><th className="px-5 py-3.5 font-extrabold">Status</th><th className="px-5 py-3.5 font-extrabold">Joined</th><th className="px-5 py-3.5 text-right font-extrabold">Action</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {organizations.map((organization) => (
                        <tr key={organization._id} className="transition hover:bg-violet-50/30">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-700"><Building2 size={18} /></div>
                              <div><p className="max-w-[230px] truncate text-sm font-extrabold text-slate-900">{organization.name}</p><p className="mt-1 max-w-[230px] truncate text-xs text-slate-500">{organization.email}</p><p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">{prettyBusinessType(organization.businessType)}</p></div>
                            </div>
                          </td>
                          <td className="px-5 py-4"><p className="text-sm font-semibold text-slate-800">{organization.owner?.name || 'No owner record'}</p><p className="mt-1 max-w-[200px] truncate text-xs text-slate-500">{organization.owner?.email || '—'}</p><p className="mt-1 text-[10px] text-slate-400">Last login: {formatDate(organization.owner?.lastLogin)}</p></td>
                          <td className="px-5 py-4"><p className="text-sm font-semibold text-slate-800">{organization.usage?.appointments ?? 0} bookings</p><p className="mt-1 text-xs text-slate-500">{organization.usage?.customers ?? 0} customers · {organization.usage?.staff ?? 0} staff</p><p className="mt-1 text-[10px] text-slate-400">{organization.usage?.users ?? 0} user accounts</p></td>
                          <td className="px-5 py-4"><span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold capitalize text-slate-700">{organization.subscription?.plan || organization.subscriptionPlan || 'free'}</span><p className="mt-1 text-[10px] capitalize text-slate-400">{String(organization.subscription?.status || 'active').replace('_', ' ')} · demo only</p><button type="button" onClick={() => openSubscriptionModal(organization)} className="mt-2 inline-flex items-center gap-1.5 text-xs font-extrabold text-violet-700 hover:text-violet-900"><CreditCard size={13} />Manage demo plan</button></td>
                          <td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-extrabold ring-1 ${statusClass(organization.active)}`}><span className={`h-1.5 w-1.5 rounded-full ${organization.active ? 'bg-emerald-500' : 'bg-rose-500'}`} />{organization.active ? 'Active' : 'Suspended'}</span></td>
                          <td className="px-5 py-4 text-sm text-slate-600">{formatDate(organization.createdAt)}</td>
                          <td className="px-5 py-4 text-right"><button type="button" onClick={() => openStatusModal(organization)} className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-extrabold transition ${organization.active ? 'border border-rose-200 bg-white text-rose-700 hover:bg-rose-50' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>{organization.active ? <><Ban size={14} /> Suspend</> : <><CheckCircle size={14} /> Reactivate</>}</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <p className="text-xs text-slate-500">{pagination.total ? `Showing ${(pagination.page - 1) * pagination.limit + 1}–${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total} businesses` : 'No businesses'}</p>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => fetchOrganizations(Math.max(1, pagination.page - 1))} disabled={pagination.page <= 1 || loading} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Previous page"><ChevronLeft size={17} /></button>
                    <span className="min-w-20 text-center text-xs font-bold text-slate-600">Page {pagination.page} of {Math.max(1, pagination.totalPages)}</span>
                    <button type="button" onClick={() => fetchOrganizations(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages || loading} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Next page"><ChevronRight size={17} /></button>
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <div className="border-b border-slate-100 bg-violet-50/40 px-5 py-4"><p className="flex items-center gap-2 text-sm font-bold text-violet-900"><ClipboardList size={17} /> Platform status history</p><p className="mt-1 text-xs text-violet-700/80">Business access changes and demo subscription assignments, including operator and reason.</p></div>
            {auditLogs.length === 0 ? <div className="px-6 py-14 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500"><Activity size={22} /></div><h4 className="mt-4 text-sm font-extrabold text-slate-800">No platform actions yet</h4><p className="mt-1 text-sm text-slate-500">Suspension, reactivation, and demo subscription changes will be recorded here.</p></div> : (
              <div className="divide-y divide-slate-100">
                {auditLogs.map((log) => <article key={log._id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:p-5">
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${log.action === 'ORGANIZATION_SUSPENDED' ? 'bg-rose-50 text-rose-600' : log.action === 'ORGANIZATION_REACTIVATED' ? 'bg-emerald-50 text-emerald-600' : 'bg-violet-50 text-violet-600'}`}>{log.action === 'ORGANIZATION_SUSPENDED' ? <Ban size={18} /> : log.action === 'ORGANIZATION_REACTIVATED' ? <CheckCircle size={18} /> : <CreditCard size={18} />}</div>
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-extrabold text-slate-900">{log.action === 'ORGANIZATION_SUSPENDED' ? 'Business suspended' : log.action === 'ORGANIZATION_REACTIVATED' ? 'Business reactivated' : `Demo subscription updated (${log.newSubscription?.plan || 'plan'} · ${String(log.newSubscription?.status || 'status').replace('_', ' ')})`}</p><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${log.action === 'SUBSCRIPTION_UPDATED' ? 'bg-violet-50 text-violet-700' : log.newActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{log.action === 'SUBSCRIPTION_UPDATED' ? `${log.newSubscription?.plan || 'demo'} · ${String(log.newSubscription?.status || '').replace('_', ' ')}` : log.newActive ? 'Active' : 'Suspended'}</span></div><p className="mt-1 text-sm text-slate-600">{log.targetOrganizationId?.name || 'Unknown business'} <span className="text-slate-400">·</span> {log.targetOrganizationId?.email || ''}</p><p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm leading-5 text-slate-700">Reason: {log.reason}</p><p className="mt-2 text-xs text-slate-500">By {log.actorUserId?.name || 'Unknown admin'} ({log.actorUserId?.email || '—'}) · {formatDateTime(log.createdAt)}</p></div>
                </article>)}
              </div>
            )}
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 p-4 sm:px-5"><p className="text-xs text-slate-500">{auditPagination.total} recorded actions</p><div className="flex items-center gap-2"><button type="button" onClick={() => fetchAuditLogs(Math.max(1, auditPagination.page - 1))} disabled={auditPagination.page <= 1} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40" aria-label="Previous audit page"><ChevronLeft size={17} /></button><span className="text-xs font-bold text-slate-600">Page {auditPagination.page} of {Math.max(1, auditPagination.totalPages)}</span><button type="button" onClick={() => fetchAuditLogs(auditPagination.page + 1)} disabled={auditPagination.page >= auditPagination.totalPages} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40" aria-label="Next audit page"><ChevronRight size={17} /></button></div></div>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 sm:p-5">
        <div className="flex items-start gap-3"><AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-700" /><div><h3 className="text-sm font-extrabold text-amber-900">Demo subscriptions only</h3><p className="mt-1 text-sm leading-6 text-amber-800">This console manages demo business access and plan entitlements. Plan changes are simulated for testing; no payment gateway is connected and no payment is processed here.</p></div></div>
      </section>

      <Modal isOpen={Boolean(selectedOrganization)} onClose={() => !actionLoading && setSelectedOrganization(null)} title={selectedOrganization?.active ? 'Suspend business access' : 'Reactivate business access'} size="md">
        {selectedOrganization && <form onSubmit={submitStatusChange} className="space-y-5">
          <div className={`rounded-xl border p-4 ${selectedOrganization.active ? 'border-rose-100 bg-rose-50' : 'border-emerald-100 bg-emerald-50'}`}>
            <p className="text-sm font-extrabold text-slate-900">{selectedOrganization.name}</p>
            <p className="mt-1 text-xs text-slate-600">{selectedOrganization.email}</p>
            <p className="mt-3 text-sm leading-5 text-slate-700">{selectedOrganization.active ? 'Suspending this organization blocks its members from authenticated API access, including sessions already issued.' : 'Reactivating restores access for active users in this organization.'}</p>
          </div>
          <div><label htmlFor="platform-status-reason" className="mb-2 block text-sm font-bold text-slate-800">Reason for this action <span className="text-rose-600">*</span></label><textarea id="platform-status-reason" value={reason} onChange={(event) => setReason(event.target.value)} minLength={8} maxLength={500} required rows={4} placeholder="Document the support ticket, policy reason, or approved operational decision…" className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100" /><p className="mt-1.5 text-xs text-slate-400">8–500 characters. This reason will be stored in the platform audit log.</p></div>
          {error && <Alert type="error" message={error} />}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setSelectedOrganization(null)} disabled={actionLoading} className="min-h-10 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">Keep as is</button><button type="submit" disabled={actionLoading || reason.trim().length < 8} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-extrabold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${selectedOrganization.active ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>{actionLoading ? <RefreshCw size={15} className="animate-spin" /> : (selectedOrganization.active ? <Ban size={15} /> : <CheckCircle size={15} />)}{actionLoading ? 'Saving…' : (selectedOrganization.active ? 'Suspend business' : 'Reactivate business')}</button></div>
        </form>}
      </Modal>

      <Modal isOpen={Boolean(selectedSubscriptionOrganization)} onClose={() => !subscriptionSaving && setSelectedSubscriptionOrganization(null)} title="Manage demo subscription" size="lg">
        {selectedSubscriptionOrganization && <form onSubmit={submitSubscriptionChange} className="space-y-5">
          <div className="rounded-xl border border-violet-100 bg-gradient-to-r from-violet-50 to-teal-50 p-4">
            <p className="text-sm font-extrabold text-slate-900">{selectedSubscriptionOrganization.name}</p>
            <p className="mt-1 text-xs text-slate-600">{selectedSubscriptionOrganization.email}</p>
            <p className="mt-2 text-xs leading-5 text-violet-800">This only simulates subscription state for development. It does not charge a customer or create a real payment record.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label htmlFor="demo-sub-plan" className="mb-2 block text-sm font-bold text-slate-800">Plan</label><select id="demo-sub-plan" value={subscriptionForm.plan} onChange={(event) => setSubscriptionForm((current) => ({ ...current, plan: event.target.value }))} className="input" required><option value="free">Free</option><option value="starter">Starter</option><option value="pro">Pro</option></select></div>
            <div><label htmlFor="demo-sub-status" className="mb-2 block text-sm font-bold text-slate-800">Subscription state</label><select id="demo-sub-status" value={subscriptionForm.status} onChange={(event) => setSubscriptionForm((current) => ({ ...current, status: event.target.value }))} className="input" required><option value="trial">Trial</option><option value="active">Active</option><option value="grace_period">Grace period</option><option value="expired">Expired</option><option value="suspended">Suspended</option></select></div>
            <div><label htmlFor="demo-sub-period" className="mb-2 block text-sm font-bold text-slate-800">Trial / period days</label><input id="demo-sub-period" type="number" min="1" max="365" value={subscriptionForm.periodDays} onChange={(event) => setSubscriptionForm((current) => ({ ...current, periodDays: event.target.value }))} className="input" required /></div>
            <div><label htmlFor="demo-sub-grace" className="mb-2 block text-sm font-bold text-slate-800">Grace period days</label><input id="demo-sub-grace" type="number" min="0" max="30" value={subscriptionForm.gracePeriodDays} onChange={(event) => setSubscriptionForm((current) => ({ ...current, gracePeriodDays: event.target.value }))} className="input" required /></div>
          </div>
          <div><label htmlFor="demo-sub-reason" className="mb-2 block text-sm font-bold text-slate-800">Reason <span className="text-rose-600">*</span></label><textarea id="demo-sub-reason" value={subscriptionForm.reason} onChange={(event) => setSubscriptionForm((current) => ({ ...current, reason: event.target.value }))} minLength={8} maxLength={500} required rows={3} placeholder="For example: approved a 14-day Pro trial for a demo business" className="input resize-y" /><p className="mt-1 text-xs text-slate-400">8–500 characters. Stored in the platform audit log.</p></div>
          {error && <Alert type="error" message={error} />}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setSelectedSubscriptionOrganization(null)} disabled={subscriptionSaving} className="min-h-10 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button><button type="submit" disabled={subscriptionSaving || subscriptionForm.reason.trim().length < 8} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-violet-700 disabled:opacity-50">{subscriptionSaving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}{subscriptionSaving ? 'Saving…' : 'Save demo subscription'}</button></div>
        </form>}
      </Modal>
    </div>
  );
}
