import { useState } from 'react';
import { PAYMENT_METHODS } from '../utils/format';
import { todayISO } from '../utils/calc';

const toForm = (e) => ({
  title: e?.title || '',
  amount: e?.amount ?? '',
  category: e?.category || '',
  date: e?.date ? new Date(e.date).toISOString().slice(0, 10) : todayISO(),
  paymentMethod: e?.paymentMethod || 'UPI',
  description: e?.description || '',
});

const validate = (v) => {
  const errors = {};
  if (!v.title.trim()) errors.title = 'Title is required';
  else if (v.title.length > 100) errors.title = 'Title must be 100 characters or fewer';
  if (v.amount === '' || Number(v.amount) <= 0 || Number.isNaN(Number(v.amount))) errors.amount = 'Enter an amount greater than 0';
  if (!v.category) errors.category = 'Choose a category';
  if (!v.date) errors.date = 'Pick a date';
  if (v.description.length > 500) errors.description = 'Description must be 500 characters or fewer';
  return errors;
};

/**
 * Add/edit form for expenses and income. `initial` may be a saved record (edit) or a prefilled draft
 * from quick-add (no _id), in which case the button says "Add".
 */
export default function ExpenseForm({ initial, categories, onSubmit, onCancel, submitting, serverError, kind = 'expense' }) {
  const income = kind === 'income';
  const editing = Boolean(initial?._id);
  const [values, setValues] = useState(() => {
    const base = toForm(initial);
    if (!base.category && categories.length) base.category = categories[0].name;
    return base;
  });
  const [errors, setErrors] = useState({});

  const change = (e) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const submit = (e) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    const out = { ...values, title: values.title.trim(), amount: Number(values.amount) };
    if (income) delete out.paymentMethod;
    onSubmit(out);
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      {serverError && <div className="alert alert--danger">{serverError}</div>}

      <div className="field">
        <label htmlFor="title">{income ? 'Income title' : 'Expense title'}</label>
        <input id="title" name="title" value={values.title} onChange={change} placeholder={income ? 'e.g. October salary' : 'e.g. Grocery shopping'} autoFocus />
        {errors.title && <span className="field__error" role="alert">{errors.title}</span>}
      </div>

      <div className="form-row">
        <div className="field">
          <label htmlFor="amount">Amount</label>
          <input id="amount" name="amount" type="number" min="0" step="0.01" value={values.amount} onChange={change} placeholder="0.00" />
          {errors.amount && <span className="field__error" role="alert">{errors.amount}</span>}
        </div>
        <div className="field">
          <label htmlFor="date">Date</label>
          <input id="date" name="date" type="date" value={values.date} onChange={change} />
          {errors.date && <span className="field__error" role="alert">{errors.date}</span>}
        </div>
      </div>

      <div className="form-row">
        <div className="field">
          <label htmlFor="category">{income ? 'Source' : 'Category'}</label>
          <select id="category" name="category" value={values.category} onChange={change}>
            {categories.map((c) => (
              <option key={c._id} value={c.name}>{c.name}</option>
            ))}
          </select>
          {errors.category && <span className="field__error" role="alert">{errors.category}</span>}
        </div>
        {!income && (
          <div className="field">
            <label htmlFor="paymentMethod">Payment method</label>
            <select id="paymentMethod" name="paymentMethod" value={values.paymentMethod} onChange={change}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="field">
        <label htmlFor="description">Description <span className="muted">(optional)</span></label>
        <textarea id="description" name="description" rows="3" value={values.description} onChange={change} placeholder="Add a note..." />
        {errors.description && <span className="field__error" role="alert">{errors.description}</span>}
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={submitting}>Cancel</button>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Saving...' : editing ? 'Save changes' : income ? 'Add income' : 'Add expense'}
        </button>
      </div>
    </form>
  );
}
