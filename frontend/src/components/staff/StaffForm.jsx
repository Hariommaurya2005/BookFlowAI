import { useForm } from 'react-hook-form';
import { useState } from 'react';
import api from '../../services/api';
import Alert from '../ui/Alert';

const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

export default function StaffForm({ staff, onSuccess, onClose }) {
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: staff || {
      workingHours: { start: '09:00', end: '18:00', days: ['Monday','Tuesday','Wednesday','Thursday','Friday'] },
    },
  });

  const onSubmit = async (data) => {
    try {
      setError('');
      const payload = {
        name: data.name,
        phone: data.phone,
        email: data.email,
        specialization: data.specialization,
        workingHours: {
          start: data.start,
          end: data.end,
          days: Array.isArray(data.days) ? data.days : [data.days].filter(Boolean),
        },
      };
      if (staff) await api.put(`/staff/${staff._id}`, payload);
      else await api.post('/staff', payload);
      onSuccess();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save staff');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Alert type="error" message={error} onClose={() => setError('')} />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Name *</label>
          <input className="input" {...register('name', { required: true })} />
        </div>
        <div>
          <label className="label">Specialization</label>
          <input className="input" {...register('specialization')} />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" {...register('phone')} />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" className="input" {...register('email')} />
        </div>
        <div>
          <label className="label">Start Time</label>
          <input type="time" className="input" defaultValue={staff?.workingHours?.start || '09:00'} {...register('start')} />
        </div>
        <div>
          <label className="label">End Time</label>
          <input type="time" className="input" defaultValue={staff?.workingHours?.end || '18:00'} {...register('end')} />
        </div>
      </div>
      <div>
        <label className="label">Working Days</label>
        <div className="grid grid-cols-4 gap-2">
          {days.map((d) => (
            <label key={d} className="flex items-center gap-1.5 text-sm text-slate-600">
              <input type="checkbox" value={d} defaultChecked={staff?.workingHours?.days?.includes(d) ?? ['Monday','Tuesday','Wednesday','Thursday','Friday'].includes(d)} {...register('days')} className="rounded border-slate-300" />
              {d.slice(0, 3)}
            </label>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-60">
          {isSubmitting ? 'Saving...' : staff ? 'Update' : 'Add Staff'}
        </button>
      </div>
    </form>
  );
}
