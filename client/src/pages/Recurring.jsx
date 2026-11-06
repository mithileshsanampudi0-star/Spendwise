import { useState } from 'react';
import { Pause, Pencil, Play, Plus, Repeat, Sparkles, Trash2 } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { PageHeader } from '../components/PageHeader';
import useFetch from '../hooks/useFetch';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage, recurringApi } from '../services/api';
import { formatDate, PAYMENT_METHODS } from '../utils/format';
import { todayISO } from '../utils/calc';

const FREQ = { weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };
// Rough monthly cost so rules with different frequencies can be added up.
const monthlyEquivalent = (r) => (r.frequency === 'weekly' ? (r.amount * 52) / 12 : r.frequency === 'yearly' ? r.amount / 12 : r.amount);

function RuleForm({ initial, categories, incomeSources, onSubmit, onCancel, busy, error }) {
  const editing = Boolean(initial?._id);
  const [v, setV] = useState({
    type: initial?.type || 'expense',
    title: initial?.title || '',
    amount: initial?.amount ?? '',
    category: initial?.category || '',
    frequency: initial?.frequency || 'monthly',
    startDate: initial?.startDate ? new Date(initial.startDate).toISOString().slice(0, 10) : todayISO(),
    endDate: initial?.endDate ? new Date(initial.endDate).toISOString().slice(0, 10) : '',
    paymentMethod: initial?.paymentMethod || 'UPI',
  });
  const [errors, setErrors] = useState({});
  const options = v.type === 'income' ? incomeSources : categories.map((c) => c.name);
  const category = options.includes(v.category) ? v.category : options[0] || '';

  const change = (e) => {
    setV((x) => ({ ...x, [e.target.name]: e.target.value }));
    setErrors((er) => ({ ...er, [e.target.name]: undefined }));
  };

  const submit = (e) => {
    e.preventDefault();
    const er = {};
    if (!v.title.trim()) er.title = 'Title is required';
    if (!(Number(v.amount) > 0)) er.amount = 'Enter an amount greater than 0';
    if (!v.startDate) er.startDate = 'Pick a start date';
    if (v.endDate && v.endDate < v.startDate) er.endDate = 'End date cannot be before the start date';
    setErrors(er);
    if (Object.keys(er).length) return;
    const body = { title: v.title.trim(), amount: Number(v.amount), category, frequency: v.frequency, endDate: v.endDate || null };
    if (v.type === 'expense') body.paymentMethod = v.paymentMethod;
    if (!editing) { body.type = v.type; body.startDate = v.startDate; }
    onSubmit(body);
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      {error && <div className="alert alert--danger" role="alert">{error}</div>}
      {!editing && (
        <div className="segmented segmented--block" role="group" aria-label="Type">
          {['expense', 'income'].map((t) => (
            <button key={t} type="button" className={v.type === t ? 'active' : ''} aria-pressed={v.type === t} onClick={() => setV((x) => ({ ...x, type: t }))}>
              {t === 'expense' ? 'Expense (bill, subscription)' : 'Income (salary)'}
            </button>
          ))}
        </div>
      )}
      <div className="field">
        <label htmlFor="r-title">Title</label>
        <input id="r-title" name="title" value={v.title} onChange={change} placeholder={v.type === 'income' ? 'e.g. Monthly salary' : 'e.g. Rent'} autoFocus />
        {errors.title && <span className="field__error" role="alert">{errors.title}</span>}
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="r-amount">Amount</label>
          <input id="r-amount" name="amount" type="number" min="0" step="0.01" value={v.amount} onChange={change} />
          {errors.amount && <span className="field__error" role="alert">{errors.amount}</span>}
        </div>
        <div className="field">
          <label htmlFor="r-freq">Repeats</label>
          <select id="r-freq" name="frequency" value={v.frequency} onChange={change}>
            {Object.entries(FREQ).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="r-cat">{v.type === 'income' ? 'Source' : 'Category'}</label>
          <select id="r-cat" name="category" value={category} onChange={change}>
            {options.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        {v.type === 'expense' && (
          <div className="field">
            <label htmlFor="r-pay">Payment method</label>
            <select id="r-pay" name="paymentMethod" value={v.paymentMethod} onChange={change}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        )}
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="r-start">First date</label>
          <input id="r-start" name="startDate" type="date" value={v.startDate} onChange={change} disabled={editing} />
          {errors.startDate && <span className="field__error" role="alert">{errors.startDate}</span>}
        </div>
        <div className="field">
          <label htmlFor="r-end">Ends <span className="muted">(optional)</span></label>
          <input id="r-end" name="endDate" type="date" value={v.endDate} onChange={change} />
          {errors.endDate && <span className="field__error" role="alert">{errors.endDate}</span>}
        </div>
      </div>
      <p className="muted small">A transaction is created automatically on each due date. Dates after the 28th move to the last day of shorter months.</p>
      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Saving...' : editing ? 'Save changes' : 'Create rule'}</button>
      </div>
    </form>
  );
}

export default function Recurring() {
  const { categories, incomeSources, notifyChange, toast } = useApp();
  const { fmt } = useAuth();
  const rules = useFetch(() => recurringApi.list(), []);
  const detected = useFetch(() => recurringApi.detected(), []);
  const [modal, setModal] = useState({ open: false, rule: null, draft: null });
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const list = rules.data || [];
  const active = list.filter((r) => r.active);
  const monthlyOut = active.filter((r) => r.type === 'expense').reduce((s, r) => s + monthlyEquivalent(r), 0);
  const monthlyIn = active.filter((r) => r.type === 'income').reduce((s, r) => s + monthlyEquivalent(r), 0);

  const close = () => { setModal({ open: false, rule: null, draft: null }); setError(''); };

  const save = async (body) => {
    setBusy(true);
    setError('');
    try {
      if (modal.rule) await recurringApi.update(modal.rule._id, body);
      else await recurringApi.create(body);
      toast(modal.rule ? 'Rule updated' : 'Recurring rule created');
      close();
      notifyChange();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (r) => {
    try {
      await recurringApi.update(r._id, { active: !r.active });
      toast(r.active ? 'Paused' : 'Resumed');
      notifyChange();
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await recurringApi.remove(deleting._id);
      toast('Rule deleted. Past transactions are kept.');
      setDeleting(null);
      notifyChange();
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const track = (s) => setModal({
    open: true, rule: null,
    draft: { type: 'expense', title: s.title, amount: s.amount, category: s.category, frequency: s.frequency, startDate: s.nextExpected || todayISO() },
  });

  return (
    <>
      <PageHeader title="Recurring" subtitle="Rent, salary and subscriptions that post themselves on the right date."
        actions={<button type="button" className="btn btn--primary" onClick={() => setModal({ open: true, rule: null, draft: null })}><Plus size={16} /> New rule</button>} />

      {list.length > 0 && (
        <div className="grid grid--3">
          <div className="card stat"><small>Active rules</small><strong>{active.length}</strong></div>
          <div className="card stat"><small>Fixed costs / month</small><strong>{fmt(monthlyOut)}</strong></div>
          <div className="card stat"><small>Expected income / month</small><strong className="amount--in">{fmt(monthlyIn)}</strong></div>
        </div>
      )}

      {(detected.data || []).length > 0 && (
        <section className="card section" aria-labelledby="detected-h">
          <h3 id="detected-h" className="section__title"><Sparkles size={16} aria-hidden="true" /> Subscriptions we spotted</h3>
          <p className="muted small">These charges repeat at steady amounts and are not tracked yet. Found by matching your own history, not guessed.</p>
          <ul className="detected-list">
            {detected.data.map((s) => (
              <li key={`${s.title}-${s.frequency}`}>
                <div>
                  <strong>{s.title}</strong>
                  <small>{fmt(s.amount)} {s.frequency} · seen {s.occurrences} times · last {formatDate(s.lastDate)}</small>
                </div>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => track(s)}>Track it</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="card section">
        {rules.loading && !rules.data ? <LoadingState label="Loading rules..." /> : rules.error ? <LoadingState error={rules.error} onRetry={rules.reload} /> : list.length === 0 ? (
          <EmptyState icon={Repeat} title="No recurring rules yet" message="Add rent, a salary or a subscription once and SpendWise records it every time it is due."
            action={<button type="button" className="btn btn--primary" onClick={() => setModal({ open: true, rule: null, draft: null })}><Plus size={16} /> New rule</button>} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th scope="col">Rule</th><th scope="col">Repeats</th><th scope="col">Next due</th><th scope="col" className="right">Amount</th><th scope="col" className="right">Actions</th></tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r._id} className={r.active ? '' : 'is-paused'}>
                    <td>
                      <div className="tx-cell">
                        <div>
                          <strong>{r.title}</strong>
                          <small>{r.type === 'income' ? 'Income' : 'Expense'} · {r.category}{!r.active && ' · paused'}</small>
                        </div>
                      </div>
                    </td>
                    <td className="muted">{FREQ[r.frequency]}</td>
                    <td className="muted nowrap">{r.active ? formatDate(r.nextDate) : '—'}</td>
                    <td className={`right amount ${r.type === 'income' ? 'amount--in' : ''}`}>{r.type === 'income' ? '+' : ''}{fmt(r.amount)}</td>
                    <td className="right">
                      <div className="row-actions row-actions--end">
                        <button type="button" className="icon-btn" onClick={() => toggle(r)} aria-label={r.active ? `Pause ${r.title}` : `Resume ${r.title}`}>
                          {r.active ? <Pause size={15} /> : <Play size={15} />}
                        </button>
                        <button type="button" className="icon-btn" onClick={() => setModal({ open: true, rule: r, draft: null })} aria-label={`Edit ${r.title}`}><Pencil size={15} /></button>
                        <button type="button" className="icon-btn icon-btn--danger" onClick={() => setDeleting(r)} aria-label={`Delete ${r.title}`}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modal.open} title={modal.rule ? 'Edit recurring rule' : 'New recurring rule'} onClose={close}>
        {modal.open && <RuleForm initial={modal.rule || modal.draft} categories={categories} incomeSources={incomeSources} onSubmit={save} onCancel={close} busy={busy} error={error} />}
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} title="Delete recurring rule?" busy={busy}
        message={deleting ? `"${deleting.title}" will stop posting. Transactions it already created stay in your history.` : ''}
        onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
    </>
  );
}
