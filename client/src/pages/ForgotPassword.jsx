import { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { authApi, getErrorMessage } from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address');
    setBusy(true);
    setError('');
    try {
      setDone(await authApi.forgotPassword({ email }));
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
        <h1>Reset your password</h1>
        {done ? (
          <>
            <div className="alert alert--success" role="status">{done.message}</div>
            {done.devResetLink && (
              <p className="demo-note">
                <strong>Development mode:</strong> no email server is configured, so here is the link:{' '}
                <a href={done.devResetLink}>Open reset link</a>
              </p>
            )}
            <p className="auth-switch"><Link to="/login">Back to log in</Link></p>
          </>
        ) : (
          <>
            <p className="muted">Enter your email and we will send you a link that works for 30 minutes.</p>
            {error && <div className="alert alert--danger" role="alert">{error}</div>}
            <form className="form" onSubmit={submit} noValidate>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoFocus />
              </div>
              <button className="btn btn--primary btn--block" disabled={busy}>{busy ? 'Sending...' : 'Send reset link'}</button>
            </form>
            <p className="auth-switch"><Link to="/login">Back to log in</Link></p>
          </>
        )}
      </div>
    </div>
  );
}
