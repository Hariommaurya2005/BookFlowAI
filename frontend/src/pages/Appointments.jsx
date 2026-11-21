import { useEffect, useState } from 'react';
import { Plus, Calendar as CalIcon, Filter, Check, X, Clock3 } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import AppointmentForm from '../components/appointments/AppointmentForm';
import { useSocket } from '../context/SocketContext';

const allowedNextStatuses = {
  pending: ['pending', 'confirmed', 'cancelled'],
  confirmed: ['confirmed', 'completed', 'cancelled', 'no_show'],
  completed: ['completed'],
  cancelled: ['cancelled'],
  no_show: ['no_show'],
};
const statusLabels = { pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No Show' };

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [actionError, setActionError] = useState('');
  const [reviewingCancellationId, setReviewingCancellationId] = useState('');
  const { socket } = useSocket();

  const fetchData = () => {
    setLoading(true);
    const params = statusFilter ? { status: statusFilter } : {};
    api.get('/appointments', { params })
      .then(({ data }) => setAppointments(data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [statusFilter]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchData();
    socket.on('appointment:created', refresh);
    socket.on('appointment:updated', refresh);
    return () => {
      socket.off('appointment:created', refresh);
      socket.off('appointment:updated', refresh);
    };
  }, [socket]);

  const reviewCancellation = async (id, action) => {
    setActionError('');
    setReviewingCancellationId(id);
    try {
      await api.put(`/appointments/${id}/cancellation-request`, { action });
      fetchData();
    } catch (error) {
      setActionError(error.response?.data?.message || 'Could not review cancellation request.');
    } finally {
      setReviewingCancellationId('');
    }
  };

  const updateStatus = async (id, status) => {
    setActionError('');
    try {
      await api.put(`/appointments/${id}/status`, { status });
      fetchData();
    } catch (error) {
      setActionError(error.response?.data?.message || 'Could not update appointment status. Please try again.');
      fetchData();
    }
  };

  return (
    <div className="space-y-4">
      {actionError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{actionError}</div>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          <select aria-label="Filter appointments by status" className="input w-full max-w-xs sm:w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>
        </div>
        <button type="button" onClick={() => setShowModal(true)} className="btn-primary w-full sm:w-auto">
          <Plus size={16} /> New Appointment
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? <LoadingSpinner /> : appointments.length === 0 ? (
          <EmptyState
            icon={CalIcon}
            title="No appointments yet"
            description="Book your first appointment to get started."
            action={<button type="button" onClick={() => setShowModal(true)} className="btn-primary w-full sm:w-auto">Book Appointment</button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
            <caption className="sr-only">Appointments and their current status</caption>
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium">Staff</th>
                <th className="px-4 py-3 font-medium">Date & Time</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {appointments.map((a) => (
                <tr key={a._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{a.customerId?.name}</td>
                  <td className="px-4 py-3 text-slate-600">{a.serviceId?.name}</td>
                  <td className="px-4 py-3 text-slate-600">{a.staffId?.name}</td>
                  <td className="px-4 py-3 text-slate-600">{new Date(a.appointmentDate).toLocaleDateString()} · {a.appointmentTime}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.status} />
                    {a.cancellationRequestStatus === 'pending' && <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800"><Clock3 size={12} /> Cancellation requested</p>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-36 flex-col items-start gap-2">
                    <select
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1"
                      value={a.status}
                      disabled={(allowedNextStatuses[a.status] || [a.status]).length === 1}
                      onChange={(e) => updateStatus(a._id, e.target.value)}
                      aria-label={`Update status for ${a.customerId?.name || 'appointment'}`}
                    >
                      {(allowedNextStatuses[a.status] || [a.status]).map((status) => <option key={status} value={status}>{statusLabels[status] || status}</option>)}
                    </select>
                    {a.cancellationRequestStatus === 'pending' && <div className="flex gap-1">
                      <button type="button" onClick={() => reviewCancellation(a._id, 'approve')} disabled={reviewingCancellationId === a._id} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"><Check size={13} />Approve</button>
                      <button type="button" onClick={() => reviewCancellation(a._id, 'reject')} disabled={reviewingCancellationId === a._id} className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"><X size={13} />Reject</button>
                    </div>}
                    {a.cancellationRequestReason && a.cancellationRequestStatus === 'pending' && <p className="max-w-48 text-xs text-slate-500" title={a.cancellationRequestReason}>Reason: {a.cancellationRequestReason}</p>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Appointment" size="lg">
        <AppointmentForm onSuccess={() => { setShowModal(false); fetchData(); }} onClose={() => setShowModal(false)} />
      </Modal>
    </div>
  );
}
