import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, FileUp, Plus, Receipt, Search, X } from 'lucide-react';
import ImportModal from '../components/ImportModal';
import ExpenseTable from '../components/ExpenseTable';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import { PageHeader } from '../components/PageHeader';
import useFetch from '../hooks/useFetch';
import useDebounce from '../hooks/useDebounce';
import useExpenseActions from '../hooks/useExpenseActions';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { expenseApi, incomeApi } from '../services/api';

const PAGE_SIZE = 10;

/** Transactions list. `kind` switches it between expenses and income. */
export default function Expenses({ kind = 'expense' }) {
  const income = kind === 'income';
  const api = income ? incomeApi : expenseApi;
  const { categories: expenseCategories, incomeSources } = useApp();
  const categories = income ? incomeSources.map((n) => ({ _id: n, name: n })) : expenseCategories;
  const [importing, setImporting] = useState(() => !income && new URLSearchParams(window.location.search).get('import') === '1');
  const { fmt } = useAuth();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') || '');
  const [category, setCategory] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState({ sortBy: 'date', order: 'desc' });
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search);

  // Keep in sync when the global top-bar search navigates here with ?search=
  useEffect(() => {
    setSearch(params.get('search') || '');
  }, [params]);

  useEffect(() => {
    if (!income && params.get('import') === '1') setImporting(true);
  }, [params, income]);

  useEffect(() => setPage(1), [debounced, category, from, to, sort]);

  const query = { search: debounced, category, from, to, ...sort, page, limit: PAGE_SIZE };
  const { data, loading, error, reload } = useFetch(() => api.list(query), [debounced, category, from, to, sort, page, kind]);
  const actions = useExpenseActions(undefined, kind);

  const toggleSort = (field) =>
    setSort((s) => (s.sortBy === field ? { sortBy: field, order: s.order === 'asc' ? 'desc' : 'asc' } : { sortBy: field, order: 'desc' }));

  const filtersActive = Boolean(search || category || from || to);
  const clear = () => {
    setSearch('');
    setCategory('');
    setFrom('');
    setTo('');
    if (params.get('search')) setParams({});
  };

  const rows = data?.data || [];
  const pagination = data?.pagination;
  const invalidRange = from && to && from > to;

  return (
    <>
      <PageHeader
        title={income ? 'Income' : 'Transactions'}
        subtitle={income ? 'Salary, freelance and every other money coming in.' : 'Search, filter and manage every expense.'}
        actions={
          <>
            {!income && <button type="button" className="btn btn--ghost" onClick={() => setImporting(true)}><FileUp size={16} /> Import CSV</button>}
            <button type="button" className="btn btn--primary" onClick={() => actions.openAdd()}><Plus size={16} /> {income ? 'Add income' : 'Add expense'}</button>
          </>
        }
      />

      <div className="card filters">
        <div className="search search--block">
          <Search size={16} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title, note or category" aria-label="Search" />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label={income ? 'Filter by source' : 'Filter by category'}>
          <option value="">{income ? 'All sources' : 'All categories'}</option>
          {categories.map((c) => <option key={c._id} value={c.name}>{c.name}</option>)}
        </select>
        <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
        <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
        {filtersActive && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={clear}><X size={14} /> Clear</button>
        )}
      </div>
      {invalidRange && <div className="alert alert--danger">The start date must be before the end date.</div>}

      <div className="card section">
        {loading && !data ? <LoadingState label="Loading transactions..." /> : error ? <LoadingState error={error} onRetry={reload} /> : rows.length === 0 ? (
          <EmptyState icon={Receipt}
            title={filtersActive ? 'No matching transactions' : income ? 'No income recorded yet' : 'No expenses yet'}
            message={filtersActive ? 'Try adjusting your search or filters.' : income ? 'Add your salary or other income to see cash flow and savings rate.' : 'Add your first expense, or import a bank statement CSV.'}
            action={!filtersActive && <button type="button" className="btn btn--primary" onClick={() => actions.openAdd()}><Plus size={16} /> {income ? 'Add income' : 'Add expense'}</button>} />
        ) : (
          <>
            <div className="table-meta">
              <span>{pagination.total} transaction{pagination.total === 1 ? '' : 's'}</span>
              <span>Total: <strong>{fmt(data.summary.totalAmount)}</strong></span>
            </div>
            <ExpenseTable kind={kind} expenses={rows} categories={categories} fmt={fmt} sort={sort} onSort={toggleSort}
              onView={actions.openView} onEdit={actions.openEdit} onDelete={actions.askDelete} />
            <div className="pagination">
              <button type="button" className="btn btn--ghost btn--sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft size={16} /> Prev
              </button>
              <span>Page {pagination.page} of {pagination.pages}</span>
              <button type="button" className="btn btn--ghost btn--sm" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          </>
        )}
      </div>

      {actions.modals}
      {importing && <ImportModal onClose={() => { setImporting(false); if (params.get('import')) setParams({}); }} />}
    </>
  );
}
