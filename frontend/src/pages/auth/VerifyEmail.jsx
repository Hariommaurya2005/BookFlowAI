import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Loader2, Zap } from 'lucide-react';
import api from '../../services/api';

export default function VerifyEmail() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true, success: false, message: '' });

  useEffect(() => {
    let active = true;
    api.get(`/auth/verify-email/${encodeURIComponent(token)}`)
      .then(({ data }) => { if (active) setState({ loading: false, success: true, message: data.message || 'Your email has been verified.' }); })
      .catch((error) => { if (active) setState({ loading: false, success: false, message: error.response?.data?.message || 'This verification link is invalid or has expired.' }); });
    return () => { active = false; };
  }, [token]);

  return (
    <div className="auth-page">
      <div className="auth-orb auth-orb-one" aria-hidden="true" />
      <div className="auth-simple-card">
        <div className="auth-simple-brand"><span className="auth-brand-mark"><Zap size={20} fill="currentColor" /></span><span className="auth-brand-name">BookFlow <span>AI</span></span></div>
        <div className={`auth-result-icon ${state.success ? 'success' : state.loading ? 'loading' : 'failure'}`}>
          {state.loading ? <Loader2 size={27} className="animate-spin" /> : state.success ? <CheckCircle2 size={29} /> : <AlertCircle size={29} />}
        </div>
        <h1>{state.loading ? 'Verifying your email…' : state.success ? 'Email verified' : 'Verification failed'}</h1>
        <p>{state.loading ? 'We are securely confirming your email address.' : state.message}</p>
        {!state.loading && <Link className="auth-submit auth-simple-submit" to="/login"><span>Continue to sign in</span></Link>}
      </div>
    </div>
  );
}
