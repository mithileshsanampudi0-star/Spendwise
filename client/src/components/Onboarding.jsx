import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X } from 'lucide-react';

const KEY = 'spendwise_onboarding_dismissed';

/** First-run checklist. Each step is ticked from real data, never from a click. */
export default function Onboarding({ steps }) {
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
  });
  const done = steps.filter((s) => s.done).length;
  if (hidden || done === steps.length) return null;

  const dismiss = () => {
    setHidden(true);
    try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ }
  };

  return (
    <section className="card onboarding section" aria-labelledby="onb-h">
      <div className="onboarding__head">
        <div>
          <h3 id="onb-h">Get set up <span className="muted">· {done} of {steps.length} done</span></h3>
          <div className="progress"><div className="progress__bar progress__bar--primary" style={{ width: `${(done / steps.length) * 100}%` }} /></div>
        </div>
        <button type="button" className="icon-btn" onClick={dismiss} aria-label="Dismiss checklist"><X size={16} /></button>
      </div>
      <ul className="onboarding__steps">
        {steps.map((s) => (
          <li key={s.label} className={s.done ? 'is-done' : ''}>
            <span className="onboarding__tick" aria-hidden="true">{s.done && <Check size={12} />}</span>
            {s.done ? <span>{s.label}</span> : s.to ? <Link to={s.to}>{s.label}</Link> : <button type="button" className="link-btn" onClick={s.onClick}>{s.label}</button>}
            <span className="sr-only">{s.done ? ' (done)' : ' (to do)'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
