import { useState } from 'react';
import { CalendarClock, Pencil, PiggyBank, Plus, Trash2, TrendingUp } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import Modal from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import useFetch from '../hooks/useFetch';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage, savingsApi } from '../services/api';
import { goalProgress } from '../utils/calc';
import { formatDate } from '../utils/format';

function GoalForm({ initial, onSubmit, onCancel, busy, error }) {
  const [values, setValues] = useState({
    name: initial?.name || '',
    targetAmount: initial?.targetAmount ?? '',
    currentAmount: initial?.currentAmount ?? 0,
    targetDate: initial?.targetDate ? new Date(initial.targetDate).toISOString().slice(0, 10) : '',
    description: initial?.description || '',
  });
  const [errors, setErrors] = useState({});

  const change = (e) => {
    setValues((v) => ({ ...v, [e.target.name]: e.target.value }));
    setErrors((er) => ({ ...er, [e.target.name]: undefined }));
  };

  const submit = (e) => {
    e.preventDefault();
    const er = {};
    if (!values.name.trim()) er.name = 'Goal name is required';
    if (!(Number(values.targetAmount) > 0)) er.targetAmount = 'Target must be greater than 0';
    if (values.currentAmount === '' || Number(values.currentAmount) < 0) er.currentAmount = 'Saved amount cannot be negative';
    setErrors(er);
    if (Object.keys(er).length) return;
    onSubmit({
      name: values.name.trim(),
      targetAmount: Number(values.targetAmount),
      currentAmount: Number(values.currentAmount),
      targetDate: values.targetDate || null,
      description: values.description,
    });
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      {error && <div className="alert alert--danger">{error}</div>}
      <div className="field">
        <label htmlFor="g-name">Goal name</label>
        <input id="g-name" name="name" value={values.name} onChange={change} placeholder="e.g. Emergency fund" autoFocus />
        {errors.name && <span className="field__error">{errors.name}</span>}
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="g-target">Target amount</label>
          <input id="g-target" name="targetAmount" type="number" min="0" step="1" value={values.targetAmount} onChange={change} />
          {errors.targetAmount && <span className="field__error">{errors.targetAmount}</span>}
        </div>
        <div className="field">
          <label htmlFor="g-current">Currently saved</label>
          <input id="g-current" name="currentAmount" type="number" min="0" step="1" value={values.currentAmount} onChange={change} />
          {errors.currentAmount && <span className="field__error">{errors.currentAmount}</span>}
        </div>
      </div>
      <div className="field">
        <label htmlFor="g-date">Target date <span className="muted">(optional)</span></label>
        <input id="g-date" name="targetDate" type="date" value={values.targetDate} onChange={change} />
      </div>
      <div className="field">
        <label htmlFor="g-desc">Description <span className="muted">(optional)</span></label>
        <textarea id="g-desc" name="description" rows="3" value={values.description} onChange={change} />
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Saving...' : initial ? 'Save changes' : 'Add goal'}</button>
      </div>
    </form>
  );
}

function ProgressForm({ goal, fmt, onSubmit, onCancel, busy, error }) {
  const [amount, setAmount] = useState(goal.currentAmount);
  const [err, setErr] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (amount === '' || Number(amount) < 0) return setErr('Enter 0 or more');
    onSubmit({ currentAmount: Number(amount) });
  };
  return (
    <form className="form" onSubmit={submit} noValidate>
      {error && <div className="alert alert--danger">{error}</div>}
      <p className="muted">Enter the total amount you have saved toward <strong>{goal.name}</strong>. Target: {fmt(goal.targetAmount)}.</p>
      <div className="field">
        <label htmlFor="p-amount">Total saved so far</label>
        <input id="p-amount" type="number" min="0" step="1" value={amount} onChange={(e) => { setAmount(e.target.value); setErr(''); }} autoFocus />
        {err && <span className="field__error">{err}</span>}
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Saving...' : 'Update progress'}</button>
      </div>
    </form>
  );
}

export default function Savings() {
  const { toast, notifyChange } = useApp();
  const { fmt } = useAuth();
  const { data, loading, error, reload } = useFetch(() => savingsApi.list(), []);
  const [modal, setModal] = useState({ type: null, goal: null }); // type: 'form' | 'progress'
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const goals = data || [];
  const close = () => { setModal({ type: null, goal: null }); setFormError(''); };

  const save = async (values) => {
    setBusy(true);
    setFormError('');
    try {
      if (modal.goal) await savingsApi.update(modal.goal._id, values);
      else await savingsApi.create(values);
      toast(modal.type === 'progress' ? 'Progress updated' : modal.goal ? 'Goal updated' : 'Goal added');
      close();
      notifyChange();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await savingsApi.remove(deleting._id);
      toast('Goal deleted');
      setDeleting(null);
      notifyChange();
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Savings goals" subtitle="Saved amounts only change when you update them. Spending less is not counted automatically."
        actions={<button type="button" className="btn btn--primary" onClick={() => setModal({ type: 'form', goal: null })}><Plus size={16} /> New goal</button>} />

      {loading && !data ? <LoadingState label="Loading goals..." /> : error ? <LoadingState error={error} onRetry={reload} /> : goals.length === 0 ? (
        <div className="card">
          <EmptyState icon={PiggyBank} title="No savings goals yet" message="Create a goal and track your progress toward it."
            action={<button type="button" className="btn btn--primary" onClick={() => setModal({ type: 'form', goal: null })}><Plus size={16} /> Add goal</button>} />
        </div>
      ) : (
        <div className="grid grid--cards-lg">
          {goals.map((g) => {
            const p = goalProgress(g);
            return (
              <div key={g._id} className={`card goal ${p.done ? 'goal--done' : ''}`}>
                <div className="goal__head">
                  <span className="goal__icon"><PiggyBank size={18} /></span>
                  <strong>{g.name}</strong>
                  <div className="row-actions">
                    <button type="button" className="icon-btn" onClick={() => setModal({ type: 'form', goal: g })} aria-label={`Edit ${g.name}`}><Pencil size={15} /></button>
                    <button type="button" className="icon-btn icon-btn--danger" onClick={() => setDeleting(g)} aria-label={`Delete ${g.name}`}><Trash2 size={15} /></button>
                  </div>
                </div>
                {g.description && <p className="muted small">{g.description}</p>}
                <div className="goal__amounts">
                  <strong>{fmt(g.currentAmount)}</strong>
                  <span className="muted">of {fmt(g.targetAmount)}</span>
                  <span className="goal__pct">{p.pct.toFixed(0)}%</span>
                </div>
                <div className="progress progress--lg">
                  <div className={`progress__bar ${p.done ? 'progress__bar--ok' : 'progress__bar--primary'}`} style={{ width: `${p.pct}%` }} />
                </div>
                <div className="goal__meta">
                  <span>{p.done ? 'Goal reached!' : `${fmt(p.remaining)} to go`}</span>
                  {g.targetDate && (
                    <span className="muted"><CalendarClock size={13} /> {formatDate(g.targetDate)}
                      {!p.done && p.daysLeft !== null && ` (${p.daysLeft >= 0 ? `${p.daysLeft} days left` : `${Math.abs(p.daysLeft)} days overdue`})`}
                    </span>
                  )}
                </div>
                {p.suggestedMonthly !== null && (
                  <p className="goal__suggest">
                    Save <strong>{fmt(p.suggestedMonthly)}</strong> a month for {p.monthsLeft} month{p.monthsLeft === 1 ? '' : 's'} to reach this on time.
                  </p>
                )}
                <button type="button" className="btn btn--ghost btn--block" onClick={() => setModal({ type: 'progress', goal: g })}>
                  <TrendingUp size={15} /> Update progress
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal.type === 'form'} title={modal.goal ? 'Edit goal' : 'New savings goal'} onClose={close}>
        {modal.type === 'form' && <GoalForm initial={modal.goal} onSubmit={save} onCancel={close} busy={busy} error={formError} />}
      </Modal>
      <Modal open={modal.type === 'progress'} title="Update savings progress" onClose={close} size="sm">
        {modal.type === 'progress' && <ProgressForm goal={modal.goal} fmt={fmt} onSubmit={save} onCancel={close} busy={busy} error={formError} />}
      </Modal>

      <ConfirmDialog open={Boolean(deleting)} title="Delete goal?" busy={busy}
        message={deleting ? `"${deleting.name}" and its progress will be permanently removed.` : ''}
        onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
    </>
  );
}
