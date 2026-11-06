import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../services/api';

export default function Login() {
  const { login, startDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const change = (e) => setValues((v) => ({ ...v, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!values.email || !values.password) return setError('Enter your email and password');
    setBusy(true);
    setError('');
    try {
      await login(values);
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const tryDemo = async () => {
    setBusy(true);
    setError('');
    try {
      await startDemo();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <Link to="/"><Logo /></Link>
        <h1>Welcome back</h1>
        <p className="muted">Log in to continue managing your money.</p>
        {error && <div className="alert alert--danger">{error}</div>}
        <form className="form" onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" value={values.email} onChange={change} placeholder="you@example.com" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" value={values.password} onChange={change} placeholder="Your password" />
          </div>
          <div className="auth-forgot"><Link to="/forgot-password">Forgot password?</Link></div>
          <button className="btn btn--primary btn--block" disabled={busy}>{busy ? 'Please wait...' : 'Log in'}</button>
        </form>
        <div className="auth-or"><span>or</span></div>
        <button type="button" className="btn btn--ghost btn--block" onClick={tryDemo} disabled={busy}>Try the live demo (no sign-up)</button>
        <p className="auth-switch">New to SpendWise? <Link to="/register">Create an account</Link></p>
        <p className="demo-note">
          <strong>Demo mode:</strong> the demo gives you a private account filled with clearly labelled sample data. It is deleted after 24 hours.
        </p>
      </div>
    </div>
  );
}
