import { Link } from 'react-router-dom';
import { HeartPulse } from 'lucide-react';
import ChartCard from './ChartCard';
import LoadingState from './LoadingState';

const tone = (score) => (score >= 80 ? 'var(--success)' : score >= 60 ? 'var(--primary)' : score >= 40 ? 'var(--warning)' : 'var(--danger)');

/** Score ring plus the four components that produced it, so the number is never a black box. */
export default function HealthGauge({ state }) {
  const { data, loading, error, reload } = state;
  const R = 52;
  const C = 2 * Math.PI * R;

  return (
    <ChartCard title="Financial health" subtitle="Calculated from your own numbers">
      {loading && !data ? <LoadingState compact /> : error ? <LoadingState compact error={error} onRetry={reload} /> : !data.sufficient ? (
        <div className="empty-inline"><HeartPulse size={20} aria-hidden="true" /><p>{data.reason || 'Add at least 5 expenses and a budget or income to see your score.'}</p></div>
      ) : (
        <div className="health">
          <div className="health__ring" role="img" aria-label={`Financial health score ${data.score} out of 100, ${data.grade}`}>
            <svg viewBox="0 0 120 120" width="132" height="132" aria-hidden="true">
              <circle cx="60" cy="60" r={R} fill="none" stroke="var(--border)" strokeWidth="10" />
              <circle cx="60" cy="60" r={R} fill="none" stroke={tone(data.score)} strokeWidth="10" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={C * (1 - data.score / 100)} transform="rotate(-90 60 60)" className="health__arc" />
            </svg>
            <div className="health__num"><strong>{data.score}</strong><small>{data.grade}</small></div>
          </div>
          <ul className="health__parts">
            {data.components.map((c) => (
              <li key={c.key}>
                <div className="health__row"><span>{c.label}</span><span className="muted">{Math.round(c.score)}/100 · {c.weight}%</span></div>
                {c.detail && <small className="muted">{c.detail}</small>}
                <div className="progress"><div className="progress__bar" style={{ width: `${c.score}%`, background: tone(c.score) }} /></div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {data?.sufficient && data.tips?.length > 0 && (
        <ul className="health__tips">{data.tips.map((t) => <li key={t}>{t}</li>)}</ul>
      )}
      {data?.sufficient && <Link to="/insights" className="link small">See all insights</Link>}
    </ChartCard>
  );
}
