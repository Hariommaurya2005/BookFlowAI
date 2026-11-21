import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Alert from '../../components/ui/Alert';
import { isAllowedEmail, EMAIL_POLICY_MESSAGE, requiresBusinessEmail } from '../../utils/businessEmail';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { email: '', password: '', remember: true },
  });

  const onSubmit = async (values) => {
    try {
      setError('');
      await login(values);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Sign-in failed. Check your email and password, then try again.');
    }
  };

  return (
    <main className="auth-page auth-login-page">
      <div className="auth-orb auth-orb-one" aria-hidden="true" />
      <div className="auth-orb auth-orb-two" aria-hidden="true" />
      <div className="auth-grid-glow" aria-hidden="true" />

      <div className="auth-single-shell">
        <Link to="/login" className="auth-single-brand" aria-label="BookFlow AI sign in">
          <span className="auth-brand-mark"><Zap size={21} fill="currentColor" /></span>
          <span className="auth-brand-name">BookFlow <span>AI</span></span>
        </Link>

        <section className="auth-single-card" aria-labelledby="login-title">
          <div className="auth-motion-mark" aria-hidden="true">
            <span className="auth-motion-ring auth-motion-ring-one" />
            <span className="auth-motion-ring auth-motion-ring-two" />
            <span className="auth-motion-node auth-motion-node-one" />
            <span className="auth-motion-node auth-motion-node-two" />
            <span className="auth-motion-core"><Zap size={22} fill="currentColor" /></span>
          </div>

          <p className="auth-single-eyebrow"><span className="auth-live-dot" /> YOUR WORKSPACE, IN FLOW</p>
          <h1 id="login-title">Welcome back<span>.</span></h1>
          <p className="auth-single-subtitle">Sign in to manage your appointments and team.</p>

          <Alert type="error" message={error} onClose={() => setError('')} />

          <form onSubmit={handleSubmit(onSubmit)} className="auth-form auth-single-form">
            <div className="auth-field">
              <label htmlFor="login-email" className="auth-label">Email address</label>
              <div className={`auth-input-wrap ${errors.email ? 'has-error' : ''}`}>
                <Mail size={17} className="auth-input-icon" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck="false"
                  className="auth-input"
                  placeholder={requiresBusinessEmail() ? 'you@yourbusiness.com' : 'you@example.com'}
                  {...register('email', {
                    required: 'Email address is required.',
                    validate: (value) => isAllowedEmail(value) || EMAIL_POLICY_MESSAGE,
                  })}
                />
              </div>
              {errors.email ? <p className="auth-field-error">{errors.email.message}</p> : <p className="auth-field-help">{requiresBusinessEmail() ? 'Use your organization email address.' : 'Use the email address you registered with.'}</p>}
            </div>

            <div className="auth-field">
              <div className="auth-label-row">
                <label htmlFor="login-password" className="auth-label">Password</label>
                <Link to="/forgot-password" className="auth-inline-link">Forgot password?</Link>
              </div>
              <div className={`auth-input-wrap ${errors.password ? 'has-error' : ''}`}>
                <LockKeyhole size={17} className="auth-input-icon" />
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="auth-input auth-input-password"
                  placeholder="Enter your password"
                  {...register('password', { required: 'Password is required.' })}
                />
                <button type="button" aria-label={showPw ? 'Hide password' : 'Show password'} onClick={() => setShowPw(!showPw)} className="auth-password-toggle">
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.password && <p className="auth-field-error">{errors.password.message}</p>}
            </div>

            <label className="auth-remember">
              <input type="checkbox" {...register('remember')} />
              <span className="auth-checkbox-custom" />
              <span>Keep me signed in</span>
            </label>

            <button type="submit" disabled={isSubmitting} className="auth-submit auth-single-submit">
              <span>{isSubmitting ? 'Signing in…' : 'Sign in'}</span>
              {isSubmitting ? <span className="auth-button-spinner" /> : <ArrowRight size={18} />}
            </button>
          </form>

          <div className="auth-single-signup">
            <span>New to BookFlow?</span>
            <Link to="/register">Create an account <ArrowRight size={15} /></Link>
          </div>
        </section>

        <footer className="auth-single-footer">
          <span className="auth-footer-shield"><LockKeyhole size={12} /></span>
          <span>Secure sign-in</span>
          <span className="auth-footer-separator" />
          <span>Built for smoother workdays</span>
        </footer>
      </div>
    </main>
  );
}
