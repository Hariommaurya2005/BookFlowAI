import { useEffect, useState } from 'react';
import { Plus, UserCheck, Trash2, Edit, CalendarOff, Sparkles, RefreshCw } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import StaffForm from '../components/staff/StaffForm';

export default function Staff() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editStaff, setEditStaff] = useState(null);
  const [leaveModal, setLeaveModal] = useState(null);
  const [leaveDate, setLeaveDate] = useState('');
  const [summaryStaff, setSummaryStaff] = useState(null);
  const [staffSummary, setStaffSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  const fetchData = () => {
    setLoading(true);
    api.get('/staff').then(({ data }) => setStaffList(data.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Remove this staff member?')) return;
    await api.delete(`/staff/${id}`);
    fetchData();
  };

  const generateStaffSummary = async (staffMember) => {
    setSummaryStaff(staffMember);
    setStaffSummary(null);
    setSummaryError('');
    setSummaryLoading(true);
    try {
      const { data } = await api.get(`/ai/staff-summary/${staffMember._id}`);
      setStaffSummary(data.data);
    } catch (error) {
      setSummaryError(error.response?.data?.message || 'Could not generate the staff summary. Please try again.');
    } finally { setSummaryLoading(false); }
  };

  const addLeave = async () => {
    if (!leaveDate) return;
    await api.post(`/staff/${leaveModal._id}/leave`, { dates: [leaveDate] });
    setLeaveModal(null);
    setLeaveDate('');
    fetchData();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setEditStaff(null); setShowModal(true); }} className="btn-primary">
          <Plus size={16} /> Add Staff
        </button>
      </div>

      {loading ? <LoadingSpinner /> : staffList.length === 0 ? (
        <EmptyState icon={UserCheck} title="No staff added" description="Add your team members to start booking appointments." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffList.map((s) => (
            <div key={s._id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold">
                    {s.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.specialization || 'General'}</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                {s.workingHours.start} - {s.workingHours.end} · {s.workingHours.days.length} days/week
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => generateStaffSummary(s)} className="flex-1 btn-primary justify-center text-xs py-1.5"><Sparkles size={13} /> AI Summary</button>
                <button onClick={() => { setEditStaff(s); setShowModal(true); }} className="flex-1 btn-secondary justify-center text-xs py-1.5"><Edit size={13} /> Edit</button>
                <button onClick={() => setLeaveModal(s)} className="flex-1 btn-secondary justify-center text-xs py-1.5"><CalendarOff size={13} /> Leave</button>
                <button onClick={() => handleDelete(s._id)} className="btn-secondary text-xs py-1.5 px-2 text-red-500 hover:bg-red-50"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={Boolean(summaryStaff)} onClose={() => { setSummaryStaff(null); setStaffSummary(null); setSummaryError(''); }} title={`AI Staff Summary${summaryStaff?.name ? ` · ${summaryStaff.name}` : ''}`} size="lg">
        {summaryLoading ? <div className="flex items-center gap-3 py-10 text-sm text-slate-500"><RefreshCw size={18} className="animate-spin text-primary-600" />Analysing staff workload and appointment history…</div>
          : summaryError ? <div role="alert" className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">{summaryError}<button type="button" onClick={() => summaryStaff && generateStaffSummary(summaryStaff)} className="ml-3 underline">Retry</button></div>
            : staffSummary ? <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className={staffSummary.aiPowered ? 'badge-green' : 'badge-gray'}>{staffSummary.aiPowered ? `Groq AI · ${staffSummary.aiModel || ''}` : 'Calculated summary'}</span>{staffSummary.notice && <span className="text-xs text-slate-500">{staffSummary.notice}</span>}</div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {[['Completed', staffSummary.metrics?.completedAppointments ?? 0], ['Upcoming', staffSummary.metrics?.upcomingAppointments ?? 0], ['This month', staffSummary.metrics?.bookingsThisMonth ?? 0], ['Booked hours', `${staffSummary.metrics?.bookedHoursThisMonth ?? 0} h`], ['Revenue this month', new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(staffSummary.metrics?.completedRevenueThisMonth ?? 0)], ['No-shows', staffSummary.metrics?.noShows ?? 0]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-lg font-extrabold text-slate-900">{value}</p></div>)}
              </div>
              {staffSummary.metrics?.topCompletedServiceThisMonth && <p className="rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-900">Most completed service this month: <strong>{staffSummary.metrics.topCompletedServiceThisMonth}</strong></p>}
              <div className="rounded-xl border border-violet-100 bg-gradient-to-r from-violet-50/70 to-teal-50/50 p-4"><h4 className="mb-2 font-bold text-slate-900">Workload summary</h4><p className="text-sm leading-6 text-slate-700">{staffSummary.summary}</p></div>
              <div className="rounded-xl border border-teal-100 bg-teal-50/70 p-4"><h4 className="mb-1 text-xs font-extrabold uppercase tracking-wide text-teal-800">Suggested action</h4><p className="text-sm leading-6 text-teal-950">{staffSummary.recommendedAction}</p></div>
              <p className="text-xs leading-5 text-slate-400">This is an operational workload summary, not an employee performance ranking. Revenue is based on recorded completed appointments.</p>
            </div> : null}
      </Modal>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editStaff ? 'Edit Staff' : 'Add Staff'}>
        <StaffForm staff={editStaff} onSuccess={() => { setShowModal(false); fetchData(); }} onClose={() => setShowModal(false)} />
      </Modal>

      <Modal isOpen={!!leaveModal} onClose={() => setLeaveModal(null)} title={`Add Leave - ${leaveModal?.name}`} size="sm">
        <div className="space-y-4">
          <input type="date" className="input" value={leaveDate} onChange={(e) => setLeaveDate(e.target.value)} />
          <div className="flex justify-end gap-3">
            <button onClick={() => setLeaveModal(null)} className="btn-secondary">Cancel</button>
            <button onClick={addLeave} className="btn-primary">Add Leave</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
