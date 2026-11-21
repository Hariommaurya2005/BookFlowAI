import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Zap } from 'lucide-react';
import api from '../../services/api';
import Alert from '../../components/ui/Alert';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [err, setErr] = useState('');
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();
  const password = watch('password', '');

  const onSubmit = async (data) => {
    try {
      setErr('');
      await api.put(`/auth/reset-password/${token}`, { password: data.password });
      navigate('/login');
    } catch (e) {
      setErr(e.response?.data?.message || 'Reset failed. Link may be expired.');
    }
  };

  return (
    <div className="auth-page"><div className="auth-orb auth-orb-one" aria-hidden="true" />
      <div className="auth-simple-card">
        <div className="auth-simple-brand"><span className="auth-brand-mark"><Zap size={20} fill="currentColor" /></span><span className="auth-brand-name">BookFlow <span>AI</span></span></div>
        <div className="w-full">
          <h1 className="text-xl font-bold text-slate-800 mb-1">Reset password</h1>
          <p className="text-slate-500 mb-6 text-sm">Choose a new password.</p>
          <Alert type="error" message={err} onClose={() => setErr('')} />
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">New password</label>
              <input type="password" className="input" autoComplete="new-password" placeholder="At least 8 characters" {...register('password', { required: 'Password is required.', minLength: { value: 8, message: 'Use at least 8 characters.' } })} />
              {errors.password && <p className="auth-field-error">{errors.password.message}</p>}
            </div>
            <div>
              <label className="label">Confirm password</label>
              <input type="password" className="input" autoComplete="new-password" placeholder="Re-enter your password" {...register('confirmPassword', { required: 'Confirm your password.', validate: (value) => value === password || 'Passwords do not match.' })} />
              {errors.confirmPassword && <p className="auth-field-error">{errors.confirmPassword.message}</p>}
            </div>
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center py-2.5">
              {isSubmitting ? 'Resetting...' : 'Reset password'}
            </button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-4">
            <Link to="/login" className="text-primary-600 hover:underline">Back to login</Link>
          </p>
        </div>
      </div></div>
  );
}
