import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, CalendarClock, Landmark, Pencil, Plus, Trash2, Wallet, X } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import Modal from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import useFetch from '../hooks/useFetch';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { debtApi, getErrorMessage } from '../services/api';
import { formatDate } from '../utils/format';

const KIND = {
  owe: { label: 'I owe', person: 'Lender / who you owe', icon: ArrowUpRight },
  lent: { label: 'I lent', person: 'Borrower / who owes you', icon: ArrowDownLeft },
};

const dayInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const daysUntil = (d) => Math.ceil((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);

function DebtForm({ initial, onSubmit, onCancel, busy, error }) {
  const [v, setV] = useState({
    name: initial?.name || '',
    kind: initial?.kind || 'owe',
    principal: initial?.principal ?? '',
    dueDate: dayInput(initial?.dueDate),
    note: initial?.note || '',
  });
  const [errors, setErrors] = useState({});
  const change = (e) => { setV((x) => ({ ...x, [e.target.name]: e.target.value })); setErrors((er) => ({ ...er, [e.target.name]: undefined })); };

  const submit = (e) => {
    e.preventDefault();
    const er = {};
    if (!v.name.trim()) er.name = 'Name is required';
    if (!(Number(v.principal) > 0)) er.principal = 'Amount must be greater than 0';
    setErrors(er);
    if (Object.keys(er).length) return;
    onSubmit({ name: v.name.trim(), kind: v.kind, principal: Number(v.principal), dueDate: v.dueDate || null, note: v.note });
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      {error && <div className="alert alert--danger">{error}</div>}
      <div className="segmented" role="group" aria-label="Type">
        {Object.entries(KIND).map(([k, m]) => (
          <button key={k} type="button" className={v.kind === k ? 'active' : ''} onClick={() => setV((x) => ({ ...x, kind: k }))}>{m.label}</button>
        ))}
      </div>
      <div className="field">
        <label htmlFor="d-name">{KIND[v.kind].person}</label>
        <input id="d-name" name="name" value={v.name} onChange={change} placeholder="e.g. Bank loan, Rahul" autoFocus />
        {errors.name && <span className="field__error">{errors.name}</span>}
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="d-amount">Total amount</label>
          <input id="d-amount" name="principal" type="number" min="0" step="1" value={v.principal} onChange={change} />
          {errors.principal && <span className="field__error">{errors.principal}</span>}
        </div>
        <div className="field">
          <label htmlFor="d-due">Due date <span className="muted">(optional)</span></label>
          <input id="d-due" name="dueDate" type="date" value={v.dueDate} onChange={change} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="d-note">Note <span className="muted">(optional)</span></label>
        <textarea id="d-note" name="note" rows="2" value={v.note} onChange={change} />
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Saving...' : initial ? 'Save changes' : 'Add record'}</button>
      </div>
    </form>
  );
}

function PaymentForm({ debt, fmt, onSubmit, onRemovePayment, onCancel, busy, error }) {
  const remaining = Math.max(0, debt.principal - debt.paid);
  const [amount, setAmount] = useState(remaining || '');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const verb = debt.kind === 'owe' ? 'Record a payment you made' : 'Record money you received back';

  const submit = (e) => {
    e.preventDefault();
    const n = Number(amount);
    if (!(n > 0)) return setErr('Enter an amount above 0');
    if (n > remaining + 0.005) return setErr(`Cannot be more than the remaining ${fmt(remaining)}`);
    onSubmit({ amount: n, date, note });
  };

  return (
    <div className="form">
      {error && <div className="alert alert--danger">{error}</div>}
      <p className="muted">{verb} for <strong>{debt.name}</strong>. Remaining: {fmt(remaining)}.</p>
      <form className="form" onSubmit={submit} noValidate>
        <div className="form-row">
          <div className="field">
            <label htmlFor="pay-amount">Amount</label>
            <input id="pay-amount" type="number" min="0" step="1" value={amount} onChange={(e) => { setAmount(e.target.value); setErr(''); }} autoFocus />
            {err && <span className="field__error">{err}</span>}
          </div>
          <div className="field">
            <label htmlFor="pay-date">Date</label>
            <input id="pay-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="pay-note">Note <span className="muted">(optional)</span></label>
          <input id="pay-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>Close</button>
          <button type="submit" className="btn btn--primary" disabled={busy || remaining <= 0}>{busy ? 'Saving...' : 'Add payment'}</button>
        </div>
      </form>
      {debt.payments.length > 0 && (
        <div className="debt__history">
          <h4>Payment history</h4>
          <ul>
            {[...debt.payments].reverse().map((p) => (
              <li key={p._id}>
                <span>{formatDate(p.date)}{p.note ? ` · ${p.note}` : ''}</span>
                <strong>{fmt(p.amount)}</strong>
                <button type="button" className="icon-btn icon-btn--danger" onClick={() => onRemovePayment(p._id)} aria-label="Remove payment" disabled={busy}><X size={14} /></button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function Debts() {
  const { toast, notifyChange } = useApp();
  const { fmt } = useAuth();
  const { data, loading, error, reload } = useFetch(() => debtApi.list(), []);
  const [tab, setTab] = useState('all');
  const [modal, setModal] = useState({ type: null, debt: null });
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const debts = data?.debts || [];
  const summary = data?.summary;
  const shown = debts.filter((d) => tab === 'all' || d.kind === tab);
  const close = () => { setModal({ type: null, debt: null }); setFormError(''); };

  // Keep the payment dialog pointing at the freshest copy of the record after each change.
  const current = modal.debt ? debts.find((d) => d._id === modal.debt._id) || modal.debt : null;

  const run = async (fn, okMsg, closeAfter = true) => {
    setBusy(true);
    setFormError('');
    try {
      await fn();
      toast(okMsg);
      if (closeAfter) close();
      notifyChange();
      reload();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const save = (values) => run(() => (modal.debt ? debtApi.update(modal.debt._id, values) : debtApi.create(values)), modal.debt ? 'Record updated' : 'Record added');
  const pay = (values) => run(() => debtApi.addPayment(modal.debt._id, values), 'Payment added', false);
  const unpay = (pid) => run(() => debtApi.removePayment(modal.debt._id, pid), 'Payment removed', false);

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await debtApi.remove(deleting._id);
      toast('Record deleted');
      setDeleting(null);
      notifyChange();
      reload();
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const addBtn = <button type="button" className="btn btn--primary" onClick={() => setModal({ type: 'form', debt: null })}><Plus size={16} /> New record</button>;

  return (
    <>
      <PageHeader title="Debts & loans" subtitle="Track what you owe and what others owe you. Payments only count when you record them." actions={addBtn} />

      {loading && !data ? <LoadingState label="Loading..." /> : error ? <LoadingState error={error} onRetry={reload} /> : debts.length === 0 ? (
        <div className="card">
          <EmptyState icon={Landmark} title="No debts or loans yet" message="Add a loan, EMI or money you lent a friend and record repayments as they happen." action={addBtn} />
        </div>
      ) : (
        <>
          <div className="grid grid--3 debt-summary">
            <div className="card debt-stat">
              <span className="muted small">You owe</span>
              <strong className="debt-stat__num debt-stat__num--owe">{fmt(summary.owe.remaining)}</strong>
              <span className="muted small">{fmt(summary.owe.paid)} paid of {fmt(summary.owe.total)}</span>
            </div>
            <div className="card debt-stat">
              <span className="muted small">Owed to you</span>
              <strong className="debt-stat__num debt-stat__num--lent">{fmt(summary.lent.remaining)}</strong>
              <span className="muted small">{fmt(summary.lent.paid)} received of {fmt(summary.lent.total)}</span>
            </div>
            <div className="card debt-stat">
              <span className="muted small">Net position</span>
              <strong className="debt-stat__num">{fmt(summary.lent.remaining - summary.owe.remaining)}</strong>
              <span className="muted small">{summary.overdue ? `${summary.overdue} overdue` : 'Nothing overdue'}</span>
            </div>
          </div>

          <div className="segmented debt-tabs" role="group" aria-label="Filter">
            {[['all', 'All'], ['owe', 'I owe'], ['lent', 'I lent']].map(([k, l]) => (
              <button key={k} type="button" className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>

          <div className="grid grid--cards-lg">
            {shown.map((d) => {
              const remaining = Math.max(0, d.principal - d.paid);
              const pct = Math.min(100, (d.paid / d.principal) * 100);
              const settled = remaining <= 0;
              const left = d.dueDate && !settled ? daysUntil(d.dueDate) : null;
              const Icon = KIND[d.kind].icon;
              return (
                <div key={d._id} className={`card goal debt ${settled ? 'goal--done' : ''}`}>
                  <div className="goal__head">
                    <span className="goal__icon"><Icon size={18} /></span>
                    <div className="debt__title">
                      <strong>{d.name}</strong>
                      <small className="muted">{KIND[d.kind].label}{settled ? ' · settled' : ''}</small>
                    </div>
                    <div className="row-actions">
                      <button type="button" className="icon-btn" onClick={() => setModal({ type: 'form', debt: d })} aria-label={`Edit ${d.name}`}><Pencil size={15} /></button>
                      <button type="button" className="icon-btn icon-btn--danger" onClick={() => setDeleting(d)} aria-label={`Delete ${d.name}`}><Trash2 size={15} /></button>
                    </div>
                  </div>
                  {d.note && <p className="muted small">{d.note}</p>}
                  <div className="goal__amounts">
                    <strong>{fmt(remaining)}</strong>
                    <span className="muted">left of {fmt(d.principal)}</span>
                    <span className="goal__pct">{pct.toFixed(0)}%</span>
                  </div>
                  <div className="progress progress--lg">
                    <div className={`progress__bar ${settled ? 'progress__bar--ok' : 'progress__bar--primary'}`} style={{ width: `${pct}%` }} />
                  </div>
                  {d.dueDate && (
                    <div className="goal__meta">
                      <span className={left !== null && left < 0 ? 'debt__overdue' : 'muted'}>
                        <CalendarClock size={13} /> {formatDate(d.dueDate)}
                        {left !== null && ` (${left >= 0 ? `${left} days left` : `${Math.abs(left)} days overdue`})`}
                      </span>
                    </div>
                  )}
                  <button type="button" className="btn btn--ghost btn--block" onClick={() => setModal({ type: 'payment', debt: d })}>
                    <Wallet size={15} /> {d.kind === 'owe' ? 'Record payment' : 'Record repayment'}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      <Modal open={modal.type === 'form'} title={modal.debt ? 'Edit record' : 'New debt or loan'} onClose={close}>
        {modal.type === 'form' && <DebtForm initial={modal.debt} onSubmit={save} onCancel={close} busy={busy} error={formError} />}
      </Modal>
      <Modal open={modal.type === 'payment'} title="Payments" onClose={close}>
        {modal.type === 'payment' && current && (
          <PaymentForm key={current.payments.length} debt={current} fmt={fmt} onSubmit={pay} onRemovePayment={unpay} onCancel={close} busy={busy} error={formError} />
        )}
      </Modal>

      <ConfirmDialog open={Boolean(deleting)} title="Delete record?" busy={busy}
        message={deleting ? `"${deleting.name}" and its payment history will be permanently removed.` : ''}
        onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
    </>
  );
}
