import { Pencil, Trash2 } from 'lucide-react';
import CategoryIcon from './CategoryIcon';

export default function CategoryCard({ category, fmt, onEdit, onDelete, showCount = true }) {
  const { name, color, icon, total = 0, percentage = 0, count = 0, isDefault } = category;
  return (
    <div className="card category-card" style={{ '--cat': color }}>
      <div className="category-card__head">
        <CategoryIcon name={icon} color={color} />
        <div className="category-card__name">
          <strong>{name}</strong>
          {isDefault && <span className="badge">Default</span>}
        </div>
        {(onEdit || onDelete) && (
          <div className="row-actions">
            {onEdit && (
              <button type="button" className="icon-btn" onClick={() => onEdit(category)} aria-label={`Edit ${name}`}>
                <Pencil size={15} />
              </button>
            )}
            {onDelete && !isDefault && (
              <button type="button" className="icon-btn icon-btn--danger" onClick={() => onDelete(category)} aria-label={`Delete ${name}`}>
                <Trash2 size={15} />
              </button>
            )}
          </div>
        )}
      </div>
      <p className="category-card__total">{fmt(total)}</p>
      <div className="progress">
        <div className="progress__bar" style={{ width: `${percentage}%`, background: color }} />
      </div>
      <p className="category-card__meta">
        {percentage.toFixed(1)}% of spending{showCount ? ` · ${count} transaction${count === 1 ? '' : 's'}` : ''}
      </p>
    </div>
  );
}
