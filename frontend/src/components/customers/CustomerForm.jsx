import { useForm } from 'react-hook-form';
import { useState } from 'react';
import api from '../../services/api';
import Alert from '../ui/Alert';

export default function CustomerForm({ customer, onSuccess, onClose }) {
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({ defaultValues: customer || {} });

  const onSubmit = async (data) => {
    try {
      setError('');
      if (customer) await api.put(`/customers/${customer._id}`, data);
      else await api.post('/customers', data);
      onSuccess();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save customer');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Alert type="error" message={error} onClose={() => setError('')} />
      <div>
        <label className="label">Name *</label>
        <input className="input" {...register('name', { required: true })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Email</label>
          <input type="email" className="input" {...register('email')} />
        </div>
        <div>
          <label className="label">Phone *</label>
          <input className="input" {...register('phone', { required: true })} />
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea className="input" rows={3} {...register('notes')} />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-60">
          {isSubmitting ? 'Saving...' : customer ? 'Update' : 'Add Customer'}
        </button>
      </div>
    </form>
  );
}
