import { Eye, Pencil, Repeat, Trash2 } from 'lucide-react';
import CategoryIcon from './CategoryIcon';
import { formatDate } from '../utils/format';

export default function ExpenseTable({ expenses, categories, fmt, onView, onEdit, onDelete, compact = false, sort, onSort, kind = 'expense' }) {
  const income = kind === 'income';
  const meta = (name) => (income ? { icon: 'Wallet', color: '#34D399' } : categories.find((c) => c.name === name));

  const SortHead = ({ field, children, align }) => {
    if (!onSort) return <th className={align}>{children}</th>;
    const active = sort?.sortBy === field;
    return (
      <th className={`${align || ''} sortable`} onClick={() => onSort(field)}>
        {children}
        <span className={`sort-arrow ${active ? 'active' : ''}`}>{active ? (sort.order === 'asc' ? '▲' : '▼') : '↕'}</span>
      </th>
    );
  };

  return (
    <div className="table-wrap">
      <table className={`table ${compact ? 'table--compact' : ''}`}>
        <thead>
          <tr>
            <th scope="col">{income ? 'Income' : 'Transaction'}</th>
            {!compact && <th scope="col">{income ? 'Source' : 'Category'}</th>}
            <SortHead field="date">Date</SortHead>
            {!compact && !income && <th scope="col">Payment</th>}
            <SortHead field="amount" align="right">Amount</SortHead>
            <th className="right" scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((e) => {
            const m = meta(e.category);
            return (
              <tr key={e._id}>
                <td>
                  <div className="tx-cell">
                    <CategoryIcon name={m?.icon} color={m?.color} size={16} />
                    <div>
                      <strong>{e.title}{e.recurringId && <span className="chip chip--tiny" title="Created by a recurring rule"><Repeat size={10} /> auto</span>}</strong>
                      {compact && <small>{e.category}</small>}
                    </div>
                  </div>
                </td>
                {!compact && (
                  <td>
                    <span className="chip" style={{ '--chip': m?.color || '#94A3B8' }}>
                      {e.category}
                    </span>
                  </td>
                )}
                <td className="muted nowrap">{formatDate(e.date)}</td>
                {!compact && !income && <td className="muted">{e.paymentMethod}</td>}
                <td className={`right amount ${income ? 'amount--in' : ''}`}>{income ? '+' : ''}{fmt(e.amount)}</td>
                <td className="right">
                  <div className="row-actions row-actions--end">
                    {onView && (
                      <button type="button" className="icon-btn" onClick={() => onView(e)} aria-label={`View ${e.title}`}>
                        <Eye size={15} />
                      </button>
                    )}
                    {onEdit && (
                      <button type="button" className="icon-btn" onClick={() => onEdit(e)} aria-label={`Edit ${e.title}`}>
                        <Pencil size={15} />
                      </button>
                    )}
                    {onDelete && (
                      <button type="button" className="icon-btn icon-btn--danger" onClick={() => onDelete(e)} aria-label={`Delete ${e.title}`}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
