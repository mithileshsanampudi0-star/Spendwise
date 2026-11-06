import { useState } from 'react';
import { Mail, Calendar, Receipt, Tags, Pencil } from 'lucide-react';
import LoadingState from '../components/LoadingState';
import SummaryCard from '../components/SummaryCard';
import { PageHeader } from '../components/PageHeader';
import useFetch from '../hooks/useFetch';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { expenseApi, getErrorMessage } from '../services/api';
import { formatDate } from '../utils/format';

export default function Profile() {
  const { user, updateProfile, fmt } = useAuth();
  const { categories, toast } = useApp();
  const stats = useFetch(() => expenseApi.list({ limit: 1 }), []);
  const [name, setName] = useState(user.name);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async (e) => {
    e.preventDefault();
    if (name.trim().length < 2) return setError('Name must be at least 2 characters');
    setBusy(true);
    setError('');
    try {
      await updateProfile({ name: name.trim() });
      toast('Profile updated');
      setEditing(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Profile" subtitle="Your account details." />
      <div className="card profile">
        <span className="avatar avatar--lg">{user.name[0].toUpperCase()}</span>
        <div className="profile__info">
          {editing ? (
            <form className="inline-form" onSubmit={save} noValidate>
              <input value={name} onChange={(e) => { setName(e.target.value); setError(''); }} aria-label="Name" autoFocus />
              <button className="btn btn--primary btn--sm" disabled={busy}>{busy ? 'Saving...' : 'Save'}</button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setEditing(false); setName(user.name); setError(''); }}>Cancel</button>
            </form>
          ) : (
            <h2>{user.name} <button type="button" className="icon-btn" onClick={() => setEditing(true)} aria-label="Edit name"><Pencil size={15} /></button></h2>
          )}
          {error && <span className="field__error">{error}</span>}
          <p className="muted"><Mail size={14} /> {user.email}</p>
          <p className="muted"><Calendar size={14} /> Member since {formatDate(user.createdAt)}</p>
        </div>
      </div>

      <div className="grid grid--3 section">
        {stats.loading && !stats.data ? <LoadingState compact /> : (
          <>
            <SummaryCard icon={Receipt} label="Total transactions recorded" value={String(stats.data?.pagination.total ?? 0)} />
            <SummaryCard icon={Tags} label="Categories" value={String(categories.length)} accent="var(--secondary)" />
            <SummaryCard icon={Receipt} label="All-time spending" value={fmt(stats.data?.summary.totalAmount ?? 0)} accent="var(--warning)" />
          </>
        )}
      </div>
    </>
  );
}
