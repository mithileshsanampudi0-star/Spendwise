import { AlertTriangle, OctagonAlert, Pencil, Trash2 } from 'lucide-react';
import CategoryIcon from './CategoryIcon';

const STATUS_TEXT = { ok: 'On track', warning: 'Nearing limit', critical: 'Limit exceeded' };

export default function BudgetCard({ budget, meta, fmt, onEdit, onDelete, compact }) {
  const { category, amount, spent, remaining, utilization, status } = budget;
  return (
    <div className={`card budget-card budget-card--${status} ${compact ? 'budget-card--compact' : ''}`}>
      <div className="budget-card__head">
        <CategoryIcon name={meta?.icon} color={meta?.color} size={16} />
        <strong>{category}</strong>
        <span className={`status-pill status-pill--${status}`}>
          {status === 'critical' && <OctagonAlert size={12} />}
          {status === 'warning' && <AlertTriangle size={12} />}
          {STATUS_TEXT[status]}
        </span>
        {(onEdit || onDelete) && (
          <div className="row-actions">
            {onEdit && (
              <button type="button" className="icon-btn" onClick={() => onEdit(budget)} aria-label={`Edit ${category} budget`}>
                <Pencil size={15} />
              </button>
            )}
            {onDelete && (
              <button type="button" className="icon-btn icon-btn--danger" onClick={() => onDelete(budget)} aria-label={`Delete ${category} budget`}>
                <Trash2 size={15} />
              </button>
            )}
          </div>
        )}
      </div>
      <div className="progress progress--lg">
        <div className={`progress__bar progress__bar--${status}`} style={{ width: `${Math.min(100, utilization)}%` }} />
      </div>
      <div className="budget-card__stats">
        <span>
          <small>Spent</small>
          {fmt(spent)}
        </span>
        <span>
          <small>{remaining >= 0 ? 'Remaining' : 'Over by'}</small>
          {fmt(Math.abs(remaining))}
        </span>
        <span>
          <small>Budget</small>
          {fmt(amount)}
        </span>
        <span className="budget-card__pct">{utilization.toFixed(0)}%</span>
      </div>
    </div>
  );
}
