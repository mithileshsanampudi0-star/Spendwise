import { useState } from 'react';
import Modal from '../components/Modal';
import ExpenseForm from '../components/ExpenseForm';
import CategoryIcon from '../components/CategoryIcon';
import { expenseApi, incomeApi, getErrorMessage } from '../services/api';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/format';

/**
 * Shared add / edit / view / delete flow for expenses and income (`kind`).
 * Deleting is a soft delete with an Undo button, so no confirmation dialog is needed.
 * `openAdd(draft)` can be given a prefilled draft (from quick-add or a detected subscription).
 */
export default function useExpenseActions(onDone, kind = 'expense') {
  const income = kind === 'income';
  const api = income ? incomeApi : expenseApi;
  const label = income ? 'Income' : 'Expense';
  const { categories, incomeSources, notifyChange, toast } = useApp();
  const { fmt } = useAuth();
  const [form, setForm] = useState({ open: false, record: null });
  const [viewing, setViewing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const options = income ? incomeSources.map((n) => ({ _id: n, name: n })) : categories;

  const closeForm = () => {
    setForm({ open: false, record: null });
    setError('');
  };

  const save = async (values) => {
    setBusy(true);
    setError('');
    const editing = Boolean(form.record?._id);
    try {
      if (editing) await api.update(form.record._id, values);
      else await api.create(values);
      toast(`${label} ${editing ? 'updated' : 'added'}`);
      closeForm();
      notifyChange();
      onDone?.();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (record) => {
    try {
      await api.remove(record._id);
      notifyChange();
      onDone?.();
      toast(`${label} deleted`, 'success', {
        label: 'Undo',
        onClick: async () => {
          try {
            await api.restore(record._id);
            toast(`${label} restored`);
            notifyChange();
            onDone?.();
          } catch (err) {
            toast(getErrorMessage(err), 'error');
          }
        },
      });
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  };

  const cat = viewing && !income && categories.find((c) => c.name === viewing.category);

  const modals = (
    <>
      <Modal open={form.open} title={form.record?._id ? `Edit ${label.toLowerCase()}` : `Add ${label.toLowerCase()}`} onClose={closeForm}>
        {form.open && (
          <ExpenseForm kind={kind} initial={form.record} categories={options} onSubmit={save} onCancel={closeForm} submitting={busy} serverError={error} />
        )}
      </Modal>

      <Modal
        open={Boolean(viewing)}
        title={`${label} details`}
        onClose={() => setViewing(null)}
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setViewing(null)}>Close</button>
            <button type="button" className="btn btn--primary" onClick={() => { setForm({ open: true, record: viewing }); setViewing(null); }}>Edit</button>
          </>
        }
      >
        {viewing && (
          <div className="details">
            <div className="details__head">
              <CategoryIcon name={income ? 'Wallet' : cat?.icon} color={income ? '#34D399' : cat?.color} size={22} />
              <div>
                <h4>{viewing.title}</h4>
                <p className="details__amount">{fmt(viewing.amount)}</p>
              </div>
            </div>
            <dl>
              <dt>{income ? 'Source' : 'Category'}</dt><dd>{viewing.category}</dd>
              <dt>Date</dt><dd>{formatDate(viewing.date)}</dd>
              {!income && (<><dt>Payment method</dt><dd>{viewing.paymentMethod}</dd></>)}
              <dt>Description</dt><dd>{viewing.description || 'No description'}</dd>
              <dt>Added on</dt><dd>{formatDate(viewing.createdAt)}</dd>
            </dl>
          </div>
        )}
      </Modal>
    </>
  );

  return {
    openAdd: (draft) => setForm({ open: true, record: draft || null }),
    openEdit: (record) => setForm({ open: true, record }),
    openView: setViewing,
    askDelete: remove,
    modals,
  };
}
