import { useMemo, useRef, useState } from 'react';
import { AlertTriangle, FileUp } from 'lucide-react';
import Modal from './Modal';
import { importApi, getErrorMessage } from '../services/api';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/format';

const MAX_BYTES = 800 * 1024;

/** Bank statement import: choose a CSV, review the auto-categorised rows, then save the ones you keep. */
export default function ImportModal({ onClose }) {
  const { categories, incomeSources, notifyChange, toast } = useApp();
  const { fmt } = useAuth();
  const fileRef = useRef(null);
  const [step, setStep] = useState('pick'); // pick | review
  const [rows, setRows] = useState([]);
  const [skipped, setSkipped] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const readFile = async (file) => {
    if (!file) return;
    setError('');
    if (file.size > MAX_BYTES) return setError('That file is larger than 800 KB. Export a shorter date range and try again.');
    setBusy(true);
    try {
      const preview = await importApi.preview(await file.text());
      setRows(preview.rows.map((r) => ({ ...r, include: !r.duplicate })));
      setSkipped(preview.skipped || []);
      setStep('review');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const update = (i, patch) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const chosen = rows.filter((r) => r.include);
  const totals = useMemo(() => ({
    out: chosen.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount, 0),
    inc: chosen.filter((r) => r.type === 'income').reduce((s, r) => s + r.amount, 0),
  }), [chosen]);

  const commit = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await importApi.commit(chosen.map(({ date, title, amount, type, category }) => ({ date, title, amount, type, category })));
      toast(`Imported ${res.expenses} expense${res.expenses === 1 ? '' : 's'} and ${res.income} income entr${res.income === 1 ? 'y' : 'ies'}`);
      notifyChange();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open title="Import bank statement" onClose={onClose} size={step === 'review' ? 'xl' : 'md'}
      footer={step === 'review' ? (
        <>
          <button type="button" className="btn btn--ghost" onClick={() => { setStep('pick'); setRows([]); }} disabled={busy}>Choose another file</button>
          <button type="button" className="btn btn--primary" onClick={commit} disabled={busy || chosen.length === 0}>
            {busy ? 'Importing...' : `Import ${chosen.length} transaction${chosen.length === 1 ? '' : 's'}`}
          </button>
        </>
      ) : undefined}>
      {error && <div className="alert alert--danger" role="alert">{error}</div>}

      {step === 'pick' && (
        <div className="import-drop">
          <FileUp size={30} aria-hidden="true" />
          <h4>Choose a CSV file from your bank</h4>
          <p className="muted">
            We detect the date format and the debit/credit columns, and suggest a category from the description.
            You review everything before it is saved. The file is read in your browser and sent only to your own account.
          </p>
          <input ref={fileRef} id="csv-file" type="file" accept=".csv,text/csv" hidden onChange={(e) => readFile(e.target.files?.[0])} />
          <button type="button" className="btn btn--primary" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? 'Reading file...' : 'Select CSV file'}
          </button>
        </div>
      )}

      {step === 'review' && (
        <>
          <div className="import-summary">
            <span><strong>{rows.length}</strong> rows found</span>
            <span><strong>{rows.filter((r) => r.duplicate).length}</strong> look like duplicates (unchecked)</span>
            <span>Out: <strong>{fmt(totals.out)}</strong></span>
            <span>In: <strong>{fmt(totals.inc)}</strong></span>
          </div>
          {skipped.length > 0 && (
            <div className="alert alert--warning"><AlertTriangle size={15} /> {skipped.length} line{skipped.length === 1 ? '' : 's'} skipped (e.g. line {skipped[0].line}: {skipped[0].reason}).</div>
          )}
          <div className="table-wrap import-table">
            <table className="table table--compact">
              <thead>
                <tr>
                  <th scope="col"><input type="checkbox" aria-label="Select all rows" checked={rows.length > 0 && rows.every((r) => r.include)}
                    onChange={(e) => setRows((rs) => rs.map((r) => ({ ...r, include: e.target.checked })))} /></th>
                  <th scope="col">Date</th><th scope="col">Description</th><th scope="col">Category</th><th scope="col" className="right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.line}-${i}`} className={r.duplicate ? 'is-dup' : ''}>
                    <td><input type="checkbox" checked={r.include} onChange={(e) => update(i, { include: e.target.checked })} aria-label={`Include ${r.title}`} /></td>
                    <td className="nowrap muted">{formatDate(r.date)}</td>
                    <td>{r.title}{r.duplicate && <span className="chip chip--tiny">duplicate?</span>}</td>
                    <td>
                      <select value={r.category} onChange={(e) => update(i, { category: e.target.value })} aria-label={`Category for ${r.title}`}>
                        {(r.type === 'income' ? incomeSources : categories.map((c) => c.name)).map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </td>
                    <td className={`right amount ${r.type === 'income' ? 'amount--in' : ''}`}>{r.type === 'income' ? '+' : ''}{fmt(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}
