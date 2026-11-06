import { useState } from 'react';
import { Plus, Tags } from 'lucide-react';
import CategoryCard from '../components/CategoryCard';
import CategoryIcon from '../components/CategoryIcon';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import Modal from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import useFetch from '../hooks/useFetch';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { categoryApi, getErrorMessage } from '../services/api';
import { COLOR_SWATCHES, ICON_NAMES, getIcon } from '../utils/icons';

function CategoryForm({ initial, onSubmit, onCancel, busy, error }) {
  const [values, setValues] = useState({
    name: initial?.name || '',
    color: initial?.color || COLOR_SWATCHES[0],
    icon: initial?.icon || 'Wallet',
  });
  const [nameError, setNameError] = useState('');
  const lockedName = Boolean(initial?.isDefault);

  const submit = (e) => {
    e.preventDefault();
    if (!values.name.trim()) return setNameError('Category name is required');
    if (values.name.length > 40) return setNameError('Name must be 40 characters or fewer');
    onSubmit(values);
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      {error && <div className="alert alert--danger">{error}</div>}
      <div className="field">
        <label htmlFor="c-name">Name</label>
        <input id="c-name" value={values.name} disabled={lockedName} onChange={(e) => { setValues({ ...values, name: e.target.value }); setNameError(''); }} placeholder="e.g. Pets" autoFocus />
        {lockedName && <span className="muted small">Default category names cannot be changed. You can still change the colour and icon.</span>}
        {nameError && <span className="field__error">{nameError}</span>}
      </div>

      <div className="field">
        <label>Colour</label>
        <div className="swatches">
          {COLOR_SWATCHES.map((c) => (
            <button key={c} type="button" className={`swatch ${values.color.toLowerCase() === c.toLowerCase() ? 'active' : ''}`}
              style={{ background: c }} onClick={() => setValues({ ...values, color: c })} aria-label={`Colour ${c}`} />
          ))}
          <input type="color" value={values.color} onChange={(e) => setValues({ ...values, color: e.target.value })} aria-label="Custom colour" className="swatch-input" />
        </div>
      </div>

      <div className="field">
        <label>Icon</label>
        <div className="icon-grid">
          {ICON_NAMES.map((name) => {
            const Icon = getIcon(name);
            const active = values.icon === name;
            return (
              <button key={name} type="button" title={name} className={`icon-choice ${active ? 'active' : ''}`}
                style={active ? { color: values.color, borderColor: values.color } : undefined}
                onClick={() => setValues({ ...values, icon: name })}>
                <Icon size={18} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="preview">
        <span className="muted small">Preview</span>
        <CategoryIcon name={values.icon} color={values.color} />
        <strong>{values.name || 'Category name'}</strong>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Saving...' : initial ? 'Save changes' : 'Create category'}</button>
      </div>
    </form>
  );
}

export default function Categories() {
  const { reloadCategories, notifyChange, toast } = useApp();
  const { fmt } = useAuth();
  const { data, loading, error, reload } = useFetch(() => categoryApi.list(), []);
  const [form, setForm] = useState({ open: false, category: null });
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const list = data || [];
  const grandTotal = list.reduce((sum, c) => sum + c.total, 0);
  // Share of all-time spending, computed once here so every card agrees
  const withShare = list.map((c) => ({ ...c, percentage: grandTotal > 0 ? (c.total / grandTotal) * 100 : 0 }));

  const close = () => { setForm({ open: false, category: null }); setFormError(''); };

  const save = async (values) => {
    setBusy(true);
    setFormError('');
    try {
      if (form.category) await categoryApi.update(form.category._id, values);
      else await categoryApi.create(values);
      toast(form.category ? 'Category updated' : 'Category created');
      close();
      await reloadCategories();
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
      const res = await categoryApi.remove(deleting._id);
      toast(res.message || 'Category deleted');
      setDeleting(null);
      await reloadCategories();
      notifyChange();
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Categories" subtitle="Organise spending with default and custom categories. Totals cover all time."
        actions={<button type="button" className="btn btn--primary" onClick={() => setForm({ open: true, category: null })}><Plus size={16} /> New category</button>} />

      {loading && !data ? <LoadingState label="Loading categories..." /> : error ? <LoadingState error={error} onRetry={reload} /> : withShare.length === 0 ? (
        <div className="card"><EmptyState icon={Tags} title="No categories" message="Create your first category." /></div>
      ) : (
        <div className="grid grid--cards-lg">
          {withShare.map((c) => (
            <CategoryCard key={c._id} category={c} fmt={fmt}
              onEdit={(x) => setForm({ open: true, category: x })} onDelete={setDeleting} />
          ))}
        </div>
      )}

      <Modal open={form.open} title={form.category ? 'Edit category' : 'New category'} onClose={close}>
        {form.open && <CategoryForm initial={form.category} onSubmit={save} onCancel={close} busy={busy} error={formError} />}
      </Modal>

      <ConfirmDialog open={Boolean(deleting)} title="Delete category?" busy={busy}
        message={deleting ? `"${deleting.name}" will be deleted. Its ${deleting.count} expense(s) will be moved to "Other" and its budgets removed.` : ''}
        onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
    </>
  );
}
