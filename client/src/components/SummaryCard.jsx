import { TrendingDown, TrendingUp } from 'lucide-react';
import useCountUp from '../hooks/useCountUp';

/**
 * Pass `amount` + `format` to count the number up on load/changes;
 * otherwise `value` is rendered as-is.
 */
export default function SummaryCard({ icon: Icon, label, value, amount, format, sub, trend, accent = 'var(--primary)' }) {
  const animated = useCountUp(Number.isFinite(amount) ? amount : 0);
  const display =
    Number.isFinite(amount) && format
      ? format(Math.abs(animated - amount) < 0.005 ? amount : Math.round(animated))
      : value;

  return (
    <div className="card summary-card" style={{ '--accent': accent }}>
      <div className="summary-card__top">
        <span className="summary-card__icon">{Icon && <Icon size={20} />}</span>
        {trend !== undefined && trend !== null && (
          <span className={`trend ${trend > 0 ? 'trend--up' : 'trend--down'}`}>
            {trend > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="summary-card__label">{label}</p>
      <p className="summary-card__value">{display}</p>
      {sub && <p className="summary-card__sub">{sub}</p>}
    </div>
  );
}
