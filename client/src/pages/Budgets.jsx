import { useState } from 'react';
import { Plus, Target } from 'lucide-react';
import BudgetCard from '../components/BudgetCard';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import Modal from '../components/Modal';
import SummaryCard from '../components/SummaryCard';
import { PageHeader } from '../components/PageHeader';
import useFetch from '../hooks/useFetch';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { budgetApi, getErrorMessage } from '../services/api';
import { splitMonth } from '../utils/dateRanges';
import { budgetAlerts, budgetTotals } from '../utils/calc';
import { monthLabel } from '../utils/format';
import { PiggyBank, TrendingUp, Wallet } from 'lucide-react';

function BudgetForm({ initial, categories, taken, onSubmit, onCancel, busy, error }) {
  const available = categories.filter((c) => c.name === initial?.category || !taken.includes(c.name));
  const [values, setValues] = useState({
    category: initial?.category || available[0]?.name || '',
    amount: initial?.amount ?? '',
  });
  const [errors, setErrors] = useState({});

  const submit = (e) => {
    e.preventDefault();
    const er = {};
    if (!values.category) er.category = 'Choose a category';
    if (!(Number(values.amount) > 0)) er.amount = 'Enter an amount greater than 0';
    setErrors(er);
    if (Object.keys(er).length) return;
    onSubmit({ category: values.category, amount: Number(values.amount) });
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      {error && <div className="alert alert--danger">{error}</div>}
      {available.length === 0 && !initial && <div className="alert alert--warning">Every category already has a budget this month.</div>}
      <div className="field">
        <label htmlFor="b-category">Category</label>
        <select id="b-category" value={values.category} onChange={(e) => setValues({ ...values, category: e.target.value })}>
          {available.map((c) => <option key={c._id} value={c.name}>{c.name}</option>)}
        </select>
        {errors.category && <span className="field__error">{errors.category}</span>}
      </div>
      <div className="field">
        <label htmlFor="b-amount">Monthly limit</label>
        <input id="b-amount" type="number" min="0" step="1" value={values.amount} onChange={(e) => { setValues({ ...values, amount: e.target.value }); setErrors({}); }} placeholder="e.g. 5000" autoFocus />
        {errors.amount && <span className="field__error">{errors.amount}</span>}
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className="btn btn--primary" disabled={busy || (available.length === 0 && !initial)}>
          {busy ? 'Saving...' : initial ? 'Save changes' : 'Create budget'}
        </button>
      </div>
    </form>
  );
}

export default function Budgets() {
  const { month, categories, notifyChange, toast } = useApp();
  const { fmt } = useAuth();
  const my = splitMonth(month);
  const { data, loading, error, reload } = useFetch(() => budgetApi.list(my), [month]);

  const [form, setForm] = useState({ open: false, budget: null });
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const budgets = data || [];
  const totals = budgetTotals(budgets);
  const alerts = budgetAlerts(budgets);
  const meta = (name) => categories.find((c) => c.name === name);

  const close = () => { setForm({ open: false, budget: null }); setFormError(''); };

  const save = async (values) => {
    setBusy(true);
    setFormError('');
    try {
      if (form.budget) await budgetApi.update(form.budget._id, values);
      else await budgetApi.create({ ...values, ...my });
      toast(form.budget ? 'Budget updated' : 'Budget created');
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
      await budgetApi.remove(deleting._id);
      toast('Budget deleted');
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
      <PageHeader title="Budgets" subtitle={`Category limits for ${monthLabel(month)}. Spending updates automatically.`}
        actions={<button type="button" className="btn btn--primary" onClick={() => setForm({ open: true, budget: null })}><Plus size={16} /> New budget</button>} />

      {loading && !data ? <LoadingState label="Loading budgets..." /> : error ? <LoadingState error={error} onRetry={reload} /> : (
        <>
          {budgets.length > 0 && (
            <div className="grid grid--3">
              <SummaryCard icon={Wallet} label="Total budget" value={fmt(totals.total)} sub={`${budgets.length} categor${budgets.length === 1 ? 'y' : 'ies'}`} />
              <SummaryCard icon={TrendingUp} label="Spent so far" value={fmt(totals.spent)} accent="var(--secondary)" sub={`${totals.utilization.toFixed(0)}% of total budget`} />
              <SummaryCard icon={PiggyBank} label={totals.remaining >= 0 ? 'Remaining' : 'Over budget'} value={fmt(Math.abs(totals.remaining))}
                accent={totals.remaining >= 0 ? 'var(--success)' : 'var(--danger)'}
                sub={alerts.length ? `${alerts.length} alert${alerts.length === 1 ? '' : 's'} need attention` : 'Everything on track'} />
            </div>
          )}

          {alerts.map((b) => (
            <div key={b._id} className={`alert alert--${b.status === 'critical' ? 'danger' : 'warning'} section-tight`}>
              {b.status === 'critical'
                ? <><strong>{b.category}</strong> budget exceeded: {fmt(b.spent)} spent of {fmt(b.amount)}.</>
                : <><strong>{b.category}</strong> is at {b.utilization.toFixed(0)}% of its budget. {fmt(b.remaining)} left.</>}
            </div>
          ))}

          <div className="section">
            {budgets.length === 0 ? (
              <div className="card">
                <EmptyState icon={Target} title="No budgets for this month" message="Set a limit for a category to start tracking budget versus actual spending."
                  action={<button type="button" className="btn btn--primary" onClick={() => setForm({ open: true, budget: null })}><Plus size={16} /> Create budget</button>} />
              </div>
            ) : (
              <div className="grid grid--cards-lg">
                {budgets.map((b) => (
                  <BudgetCard key={b._id} budget={b} meta={meta(b.category)} fmt={fmt}
                    onEdit={(x) => setForm({ open: true, budget: x })} onDelete={setDeleting} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <Modal open={form.open} title={form.budget ? 'Edit budget' : 'New budget'} onClose={close} size="sm">
        {form.open && (
          <BudgetForm initial={form.budget} categories={categories} taken={budgets.map((b) => b.category)}
            onSubmit={save} onCancel={close} busy={busy} error={formError} />
        )}
      </Modal>

      <ConfirmDialog open={Boolean(deleting)} title="Delete budget?" busy={busy}
        message={deleting ? `The ${deleting.category} budget for ${monthLabel(month)} will be removed. Your expenses are not affected.` : ''}
        onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
    </>
  );
}
