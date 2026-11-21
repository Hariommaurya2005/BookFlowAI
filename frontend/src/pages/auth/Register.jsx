import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Zap, Eye, EyeOff, ArrowRight, Building2, Mail, UserRound, Phone, LockKeyhole, Sparkles, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Alert from '../../components/ui/Alert';
import { isAllowedEmail, EMAIL_POLICY_MESSAGE, requiresBusinessEmail } from '../../utils/businessEmail';

export default function Register() {
  const { register: authRegister } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { orgName: '', orgEmail: '', orgPhone: '', businessType: '', name: '', email: '', password: '' },
  });

  const onSubmit = async (data) => {
    try {
      setError('');
      await authRegister(data);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'We could not create your workspace. Please review your details.');
    }
  };

  const emailRules = {
    required: 'Email address is required.',
    validate: (value) => isAllowedEmail(value) || EMAIL_POLICY_MESSAGE,
  };

  return (
    <div className="auth-page auth-register-page">
      <div className="auth-orb auth-orb-one" aria-hidden="true" />
      <div className="auth-orb auth-orb-two" aria-hidden="true" />
      <div className="auth-register-shell">
        <div className="register-topbar">
          <Link to="/login" className="auth-brand register-brand">
            <div className="auth-brand-mark"><Zap size={20} fill="currentColor" /></div>
            <div><span className="auth-brand-name">BookFlow <span>AI</span></span><span className="auth-brand-caption">BUSINESS OPERATIONS</span></div>
          </Link>
          <p>Already have an account? <Link to="/login" className="auth-inline-link">Sign in</Link></p>
        </div>

        <div className="register-card">
          <div className="register-heading">
            <div className="auth-form-kicker"><Sparkles size={14} /> Start with a better flow</div>
            <h1>Create your workspace<span>.</span></h1>
            <p>Bring bookings, customers and your team together in one place.</p>
          </div>
          <Alert type="error" message={error} onClose={() => setError('')} />

          <form onSubmit={handleSubmit(onSubmit)} className="auth-form register-form">
            <div className="register-section-label"><Building2 size={15} /> Business details</div>
            <div className="register-fields-grid">
              <div className="auth-field">
                <label htmlFor="org-name" className="auth-label">Business / organization name <span>*</span></label>
                <div className={`auth-input-wrap ${errors.orgName ? 'has-error' : ''}`}><Building2 size={16} className="auth-input-icon" /><input id="org-name" className="auth-input" placeholder="e.g. Northstar Clinic" autoComplete="organization" {...register('orgName', { required: 'Organization name is required.', minLength: { value: 2, message: 'Enter at least 2 characters.' } })} /></div>
                {errors.orgName && <p className="auth-field-error">{errors.orgName.message}</p>}
              </div>
              <div className="auth-field">
                <label htmlFor="business-type" className="auth-label">Business type <span>*</span></label>
                <div className={`auth-input-wrap auth-select-wrap ${errors.businessType ? 'has-error' : ''}`}><select id="business-type" className="auth-input" {...register('businessType', { required: 'Select a business type.' })}><option value="">Choose a category</option><option value="clinic">Clinic / healthcare</option><option value="salon">Salon / personal care</option><option value="consultant">Consulting</option><option value="repair">Repair center</option><option value="coaching">Coaching / education</option><option value="other">Other</option></select></div>
                {errors.businessType && <p className="auth-field-error">{errors.businessType.message}</p>}
              </div>
              <div className="auth-field">
                <label htmlFor="org-email" className="auth-label">Workspace contact email <span>*</span></label>
                <div className={`auth-input-wrap ${errors.orgEmail ? 'has-error' : ''}`}><Mail size={16} className="auth-input-icon" /><input id="org-email" type="email" className="auth-input" placeholder={requiresBusinessEmail() ? "hello@yourbusiness.com" : "hello@example.com"} autoComplete="email" {...register('orgEmail', emailRules)} /></div>
                {errors.orgEmail ? <p className="auth-field-error">{errors.orgEmail.message}</p> : <p className="auth-field-help">Use an inbox you can access for workspace communication.</p>}
              </div>
              <div className="auth-field">
                <label htmlFor="org-phone" className="auth-label">Business phone <span className="auth-optional">Optional</span></label>
                <div className="auth-input-wrap"><Phone size={16} className="auth-input-icon" /><input id="org-phone" type="tel" className="auth-input" placeholder="+91 98765 43210" autoComplete="tel" {...register('orgPhone')} /></div>
              </div>
            </div>

            <div className="register-section-label register-section-owner"><UserRound size={15} /> Workspace owner</div>
            <div className="register-fields-grid">
              <div className="auth-field">
                <label htmlFor="owner-name" className="auth-label">Your full name <span>*</span></label>
                <div className={`auth-input-wrap ${errors.name ? 'has-error' : ''}`}><UserRound size={16} className="auth-input-icon" /><input id="owner-name" className="auth-input" placeholder="Your name" autoComplete="name" {...register('name', { required: 'Your name is required.', minLength: { value: 2, message: 'Enter at least 2 characters.' } })} /></div>
                {errors.name && <p className="auth-field-error">{errors.name.message}</p>}
              </div>
              <div className="auth-field">
                <label htmlFor="owner-email" className="auth-label">Your email address <span>*</span></label>
                <div className={`auth-input-wrap ${errors.email ? 'has-error' : ''}`}><Mail size={16} className="auth-input-icon" /><input id="owner-email" type="email" className="auth-input" placeholder={requiresBusinessEmail() ? "name@yourbusiness.com" : "you@example.com"} autoComplete="email" {...register('email', emailRules)} /></div>
                {errors.email && <p className="auth-field-error">{errors.email.message}</p>}
              </div>
              <div className="auth-field register-password-field">
                <label htmlFor="owner-password" className="auth-label">Create password <span>*</span></label>
                <div className={`auth-input-wrap ${errors.password ? 'has-error' : ''}`}><LockKeyhole size={16} className="auth-input-icon" /><input id="owner-password" type={showPassword ? 'text' : 'password'} className="auth-input auth-input-password" placeholder="At least 8 characters" autoComplete="new-password" {...register('password', { required: 'Password is required.', minLength: { value: 8, message: 'Use at least 8 characters.' } })} /><button type="button" className="auth-password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
                {errors.password ? <p className="auth-field-error">{errors.password.message}</p> : <p className="auth-field-help">Use a unique password you do not use elsewhere.</p>}
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="auth-submit register-submit"><span>{isSubmitting ? 'Creating your workspace…' : 'Create business workspace'}</span>{isSubmitting ? <span className="auth-button-spinner" /> : <ArrowRight size={18} />}</button>
            <p className="register-secure-note"><ShieldCheck size={15} /> Your credentials are sent securely to your BookFlow backend.</p>
          </form>
        </div>
        <p className="auth-legal register-legal">BookFlow AI · Appointment management built around your business.</p>
      </div>
    </div>
  );
}
