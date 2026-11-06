import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../services/api';
import { CURRENCIES } from '../utils/format';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: '', email: '', password: '', confirm: '', currency: 'INR' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  const change = (e) => {
    setValues((v) => ({ ...v, [e.target.name]: e.target.value }));
    setErrors((er) => ({ ...er, [e.target.name]: undefined }));
  };

  const validate = () => {
    const er = {};
    if (values.name.trim().length < 2) er.name = 'Name must be at least 2 characters';
    if (!/^\S+@\S+\.\S+$/.test(values.email)) er.email = 'Enter a valid email address';
    if (values.password.length < 6) er.password = 'Password must be at least 6 characters';
    if (values.confirm !== values.password) er.confirm = 'Passwords do not match';
    return er;
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    setServerError('');
    try {
      await register({ name: values.name, email: values.email, password: values.password, currency: values.currency });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <Link to="/"><Logo /></Link>
        <h1>Create your account</h1>
        <p className="muted">Start understanding your spending in minutes.</p>
        {serverError && <div className="alert alert--danger">{serverError}</div>}
        <form className="form" onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input id="name" name="name" value={values.name} onChange={change} placeholder="Your name" />
            {errors.name && <span className="field__error">{errors.name}</span>}
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" value={values.email} onChange={change} placeholder="you@example.com" />
            {errors.email && <span className="field__error">{errors.email}</span>}
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" value={values.password} onChange={change} placeholder="Min. 6 characters" />
              {errors.password && <span className="field__error">{errors.password}</span>}
            </div>
            <div className="field">
              <label htmlFor="confirm">Confirm password</label>
              <input id="confirm" name="confirm" type="password" value={values.confirm} onChange={change} placeholder="Repeat password" />
              {errors.confirm && <span className="field__error">{errors.confirm}</span>}
            </div>
          </div>
          <div className="field">
            <label htmlFor="currency">Currency</label>
            <select id="currency" name="currency" value={values.currency} onChange={change}>
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </div>
          <button className="btn btn--primary btn--block" disabled={busy}>{busy ? 'Creating account...' : 'Create account'}</button>
        </form>
        <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
      </div>
    </div>
  );
}
