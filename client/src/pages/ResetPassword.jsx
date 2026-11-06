import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Logo from '../components/Logo';
import { authApi, getErrorMessage } from '../services/api';
import { useApp } from '../context/AppContext';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const { toast } = useApp();
  const [values, setValues] = useState({ password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (values.password.length < 6) return setError('Password must be at least 6 characters');
    if (values.password !== values.confirm) return setError('Passwords do not match');
    setBusy(true);
    setError('');
    try {
      await authApi.resetPassword({ token, password: values.password });
      toast('Password updated. Log in with your new password.');
      navigate('/login', { replace: true });
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
        <h1>Choose a new password</h1>
        {!token ? (
          <>
            <div className="alert alert--danger" role="alert">This reset link is incomplete. Request a new one.</div>
            <p className="auth-switch"><Link to="/forgot-password">Request a new link</Link></p>
          </>
        ) : (
          <>
            {error && <div className="alert alert--danger" role="alert">{error}</div>}
            <form className="form" onSubmit={submit} noValidate>
              <div className="field">
                <label htmlFor="password">New password</label>
                <input id="password" type="password" autoComplete="new-password" value={values.password} onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))} autoFocus />
              </div>
              <div className="field">
                <label htmlFor="confirm">Confirm password</label>
                <input id="confirm" type="password" autoComplete="new-password" value={values.confirm} onChange={(e) => setValues((v) => ({ ...v, confirm: e.target.value }))} />
              </div>
              <button className="btn btn--primary btn--block" disabled={busy}>{busy ? 'Saving...' : 'Update password'}</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
