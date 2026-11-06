import { useMemo } from 'react';
import ChartCard from './ChartCard';
import LoadingState from './LoadingState';
import { formatDate } from '../utils/format';

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Calendar heatmap: darker days are heavier spending. Rows are weekdays, columns are weeks. */
export default function Heatmap({ state, fmt, title = 'Spending calendar', subtitle = 'Darker means more spent that day' }) {
  const { data, loading, error, reload } = state;

  const model = useMemo(() => {
    if (!data?.length) return null;
    const max = Math.max(...data.map((d) => d.total), 0);
    const first = new Date(`${data[0].label}T00:00:00Z`);
    const lead = (first.getUTCDay() + 6) % 7; // Monday-first
    const cells = [...Array(lead).fill(null), ...data];
    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    const level = (t) => (t <= 0 || max <= 0 ? 0 : Math.min(4, Math.ceil((t / max) * 4)));
    const busiest = data.reduce((a, b) => (b.total > a.total ? b : a), data[0]);
    return { weeks, level, max, busiest, total: data.reduce((s, d) => s + d.total, 0), active: data.filter((d) => d.total > 0).length };
  }, [data]);

  return (
    <ChartCard title={title} subtitle={subtitle}>
      {loading && !data ? <LoadingState compact /> : error ? <LoadingState compact error={error} onRetry={reload} /> : !model ? (
        <p className="muted">No days to show yet.</p>
      ) : (
        <>
          <div className="heatmap" role="img" aria-label={`Spending calendar. ${model.active} days with spending, busiest day ${formatDate(model.busiest.label)} at ${fmt(model.busiest.total)}.`}>
            <div className="heatmap__dows" aria-hidden="true">{DOW.map((d, i) => <span key={d}>{i % 2 === 0 ? d : ''}</span>)}</div>
            <div className="heatmap__grid">
              {model.weeks.map((w, wi) => (
                <div key={wi} className="heatmap__week">
                  {Array.from({ length: 7 }, (_, di) => {
                    const c = w[di];
                    if (!c) return <span key={di} className="heatmap__cell is-empty" />;
                    return <span key={di} className={`heatmap__cell lv-${model.level(c.total)}`} title={`${formatDate(c.label)}: ${c.total ? fmt(c.total) : 'no spending'}`} />;
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="heatmap__legend" aria-hidden="true">
            <span>Less</span>{[0, 1, 2, 3, 4].map((l) => <span key={l} className={`heatmap__cell lv-${l}`} />)}<span>More</span>
          </div>
          <p className="muted small">Busiest day: <strong>{formatDate(model.busiest.label)}</strong> ({fmt(model.busiest.total)}).</p>
        </>
      )}
    </ChartCard>
  );
}
