import { useState } from 'react';
import { Download, FileSpreadsheet, LogOut, Moon, Sun } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { authApi, backupApi, getErrorMessage } from '../services/api';
import { CURRENCIES } from '../utils/format';

export default function Settings() {
  const { user, updateProfile, logout } = useAuth();
  const { theme, setTheme, toast, notifyChange } = useApp();
  const [currency, setCurrency] = useState(user.currency);
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [exporting, setExporting] = useState('');

  const exportData = async (kind) => {
    setExporting(kind);
    try {
      await backupApi[kind]();
      toast('Download started');
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setExporting('');
    }
  };

  const saveCurrency = async () => {
    setSavingCurrency(true);
    try {
      await updateProfile({ currency });
      notifyChange();
      toast('Currency updated');
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setSavingCurrency(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (!pw.currentPassword) return setPwError('Enter your current password');
    if (pw.newPassword.length < 6) return setPwError('New password must be at least 6 characters');
    if (pw.newPassword !== pw.confirm) return setPwError('New passwords do not match');
    setSavingPw(true);
    setPwError('');
    try {
      await authApi.changePassword({ currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      toast('Password changed');
    } catch (err) {
      setPwError(getErrorMessage(err));
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Personalise SpendWise and manage your account." />
      <div className="grid grid--2">
        <section className="card settings-block">
          <h3>Appearance</h3>
          <p className="muted small">Choose how SpendWise looks on this device.</p>
          <div className="theme-options">
            <button type="button" className={`theme-option ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}><Moon size={18} /> Dark</button>
            <button type="button" className={`theme-option ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}><Sun size={18} /> Light</button>
          </div>
        </section>

        <section className="card settings-block">
          <h3>Currency</h3>
          <p className="muted small">Used to display all amounts. Existing records are not converted.</p>
          <div className="field">
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} aria-label="Currency">
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </div>
          <button type="button" className="btn btn--primary" onClick={saveCurrency} disabled={savingCurrency || currency === user.currency}>
            {savingCurrency ? 'Saving...' : 'Save currency'}
          </button>
        </section>

        <section className="card settings-block">
          <h3>Change password</h3>
          {pwError && <div className="alert alert--danger">{pwError}</div>}
          <form className="form" onSubmit={changePassword} noValidate>
            <div className="field">
              <label htmlFor="cur">Current password</label>
              <input id="cur" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="field">
                <label htmlFor="new">New password</label>
                <input id="new" type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="conf">Confirm</label>
                <input id="conf" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
              </div>
            </div>
            <button className="btn btn--primary" disabled={savingPw}>{savingPw ? 'Updating...' : 'Update password'}</button>
          </form>
        </section>

        <section className="card settings-block">
          <h3>Backup &amp; export</h3>
          <p className="muted small">Download your data any time. The full backup includes transactions, budgets, categories, savings goals, recurring rules and debts.</p>
          <div className="theme-options">
            <button type="button" className="btn btn--ghost" onClick={() => exportData('json')} disabled={Boolean(exporting)}>
              <Download size={16} /> {exporting === 'json' ? 'Preparing...' : 'Full backup (JSON)'}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => exportData('csv')} disabled={Boolean(exporting)}>
              <FileSpreadsheet size={16} /> {exporting === 'csv' ? 'Preparing...' : 'Transactions (CSV)'}
            </button>
          </div>
        </section>

        <section className="card settings-block">
          <h3>Session</h3>
          <p className="muted small">Signed in as {user.email}.</p>
          <button type="button" className="btn btn--danger-outline" onClick={logout}><LogOut size={16} /> Log out</button>
        </section>
      </div>
    </>
  );
}
