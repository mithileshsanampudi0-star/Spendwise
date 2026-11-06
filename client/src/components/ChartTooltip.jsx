import { formatPercent } from '../utils/format';

export const AXIS = { stroke: 'var(--text-muted)', fontSize: 12 };
export const GRID = 'var(--border)';

/** Shared Recharts tooltip so every chart looks consistent. */
export function ChartTooltip({ active, payload, label, fmt, labelFormatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{labelFormatter ? labelFormatter(label) : label}</p>
      {payload.map((p) => (
        <p key={p.dataKey + p.name} style={{ color: p.color || p.payload?.color }}>
          {p.name}: <strong>{fmt(p.value)}</strong>
          {p.payload?.percentage !== undefined && p.dataKey === 'total' ? ` (${formatPercent(p.payload.percentage, 1)})` : ''}
        </p>
      ))}
    </div>
  );
}
