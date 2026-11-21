import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Zap } from 'lucide-react';
import api from '../../services/api';
import Alert from '../../components/ui/Alert';
import { isAllowedEmail, EMAIL_POLICY_MESSAGE, requiresBusinessEmail } from '../../utils/businessEmail';

export default function ForgotPassword() {
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (data) => {
    try {
      setErr(''); setMsg('');
      const { data: res } = await api.post('/auth/forgot-password', data);
      setMsg(res.message);
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed. Try again.');
    }
  };

  return (
    <div className="auth-page"><div className="auth-orb auth-orb-one" aria-hidden="true" />
      <div className="auth-simple-card">
        <div className="auth-simple-brand"><span className="auth-brand-mark"><Zap size={20} fill="currentColor" /></span><span className="auth-brand-name">BookFlow <span>AI</span></span></div>
        <div className="w-full">
          <h1 className="text-xl font-bold text-slate-800 mb-1">Forgot password?</h1>
          <p className="text-slate-500 mb-6 text-sm">Enter your email, get reset link.</p>
          <Alert type="success" message={msg} onClose={() => setMsg('')} />
          <Alert type="error" message={err} onClose={() => setErr('')} />
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder={requiresBusinessEmail() ? 'you@yourbusiness.com' : 'you@example.com'} {...register('email', { required: 'Email address is required.', validate: (value) => isAllowedEmail(value) || EMAIL_POLICY_MESSAGE })} />
              {errors.email && <p className="auth-field-error">{errors.email.message}</p>}
            </div>
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center py-2.5">
              {isSubmitting ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-4">
            <Link to="/login" className="text-primary-600 hover:underline">Back to login</Link>
          </p>
        </div>
      </div></div>
  );
}
