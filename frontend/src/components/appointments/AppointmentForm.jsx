import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import Alert from '../ui/Alert';
import { formatINR } from '../../utils/currency';

export default function AppointmentForm({ onSuccess, onClose }) {
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [slots, setSlots] = useState([]);
  const [error, setError] = useState('');
  const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm();

  const staffId = watch('staffId');
  const serviceId = watch('serviceId');
  const appointmentDate = watch('appointmentDate');

  useEffect(() => {
    Promise.all([api.get('/customers?limit=100'), api.get('/services'), api.get('/staff')])
      .then(([c, s, st]) => {
        setCustomers(c.data.data);
        setServices(s.data.data);
        setStaffList(st.data.data);
      });
  }, []);

  useEffect(() => {
    if (staffId && serviceId && appointmentDate) {
      api.get('/appointments/slots', { params: { staffId, serviceId, date: appointmentDate } })
        .then(({ data }) => setSlots(data.data.slots))
        .catch(() => setSlots([]));
    }
  }, [staffId, serviceId, appointmentDate]);

  const onSubmit = async (data) => {
    try {
      setError('');
      await api.post('/appointments', data);
      onSuccess();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create appointment');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Alert type="error" message={error} onClose={() => setError('')} />

      <div>
        <label className="label">Customer *</label>
        <select className="input" {...register('customerId', { required: true })}>
          <option value="">Select customer</option>
          {customers.map((c) => <option key={c._id} value={c._id}>{c.name} ({c.phone})</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Service *</label>
          <select className="input" {...register('serviceId', { required: true })}>
            <option value="">Select service</option>
            {services.map((s) => <option key={s._id} value={s._id}>{s.name} ({s.duration}m, {formatINR(s.price)})</option>)}
          </select>
        </div>
        <div>
          <label className="label">Staff *</label>
          <select className="input" {...register('staffId', { required: true })}>
            <option value="">Select staff</option>
            {staffList.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Date *</label>
        <input type="date" className="input" {...register('appointmentDate', { required: true })} />
      </div>

      <div>
        <label className="label">Available Slots *</label>
        <div className="grid grid-cols-4 gap-2 mt-1">
          {slots.length === 0 && <p className="text-sm text-slate-400 col-span-4">Select staff, service & date to see slots.</p>}
          {slots.map((slot) => (
            <label key={slot} className="cursor-pointer">
              <input type="radio" value={slot} {...register('appointmentTime', { required: true })} className="hidden peer" />
              <div className="peer-checked:bg-primary-600 peer-checked:text-white text-center text-sm py-1.5 rounded-lg border border-slate-200 hover:border-primary-400 transition-colors">
                {slot}
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Notes</label>
        <textarea className="input" rows={2} {...register('notes')} />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-60">
          {isSubmitting ? 'Booking...' : 'Book Appointment'}
        </button>
      </div>
    </form>
  );
}
