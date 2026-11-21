import { useForm } from 'react-hook-form';
import { useState } from 'react';
import api from '../../services/api';
import Alert from '../ui/Alert';

export default function ServiceForm({ service, onSuccess, onClose }) {
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({ defaultValues: service || {} });

  const onSubmit = async (data) => {
    try {
      setError('');
      const payload = { ...data, duration: Number(data.duration), price: Number(data.price) };
      if (service) await api.put(`/services/${service._id}`, payload);
      else await api.post('/services', payload);
      onSuccess();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save service');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Alert type="error" message={error} onClose={() => setError('')} />
      <div>
        <label className="label">Service Name *</label>
        <input className="input" {...register('name', { required: true })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Duration (minutes) *</label>
          <input type="number" className="input" {...register('duration', { required: true, min: 5 })} />
        </div>
        <div>
          <label className="label">Price (₹) *</label>
          <input type="number" className="input" {...register('price', { required: true, min: 0 })} />
        </div>
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input" rows={3} {...register('description')} />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-60">
          {isSubmitting ? 'Saving...' : service ? 'Update' : 'Add Service'}
        </button>
      </div>
    </form>
  );
}
