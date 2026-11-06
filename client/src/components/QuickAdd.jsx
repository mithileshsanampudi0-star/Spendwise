import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { importApi, getErrorMessage } from '../services/api';
import { useActions } from '../context/ActionsContext';

/**
 * Type a sentence like "coffee 120 yesterday upi" or "salary 50k". The server parses it with
 * plain rules (no AI), and the result opens in the normal form so the user always confirms.
 */
export default function QuickAdd({ autoFocus, onDone, className = '' }) {
  const { addDraft } = useActions();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError('');
    try {
      const draft = await importApi.quick(text);
      setText('');
      onDone?.();
      addDraft(draft);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={`quickadd ${className}`} onSubmit={submit} role="search" aria-label="Quick add">
      <Sparkles size={16} aria-hidden="true" />
      <input
        value={text}
        onChange={(e) => { setText(e.target.value); setError(''); }}
        placeholder='Quick add: "coffee 120 yesterday upi" or "salary 50k"'
        aria-label="Quick add a transaction in plain words"
        aria-describedby={error ? 'quickadd-error' : undefined}
        autoFocus={autoFocus}
        maxLength={200}
      />
      <button className="btn btn--primary btn--sm" disabled={busy || !text.trim()}>{busy ? 'Reading...' : 'Add'}</button>
      {error && <span id="quickadd-error" className="quickadd__error" role="alert">{error}</span>}
    </form>
  );
}
