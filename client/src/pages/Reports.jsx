import { useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import ChartCard from '../components/ChartCard';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import SummaryCard from '../components/SummaryCard';
import { PageHeader } from '../components/PageHeader';
import useFetch from '../hooks/useFetch';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { reportApi } from '../services/api';
import { exportCSV, exportPDF, periodLabel } from '../utils/reportExport';
import { withCategoryMeta } from '../utils/calc';
import { ArrowDownLeft, Scale, Wallet } from 'lucide-react';

export default function Reports() {
  const { month, setMonth, categories, toast } = useApp();
  const { fmt } = useAuth();
  const [mode, setMode] = useState('month'); // 'month' | 'custom'
  const [custom, setCustom] = useState({ from: '', to: '' });

  const validCustom = Boolean(custom.from && custom.to && custom.from <= custom.to);
  const params = mode === 'month' ? { month } : custom;
  const enabled = mode === 'month' || validCustom;

  const { data, loading, error, reload } = useFetch(
    () => (enabled ? reportApi.monthly(params) : Promise.resolve(null)),
    [mode, month, custom.from, custom.to]
  );

  const run = async (fn, label) => {
    try {
      await fn(data);
      toast(`${label} downloaded`);
    } catch {
      toast(`Could not create the ${label}`, 'error');
    }
  };

  const rows = data ? withCategoryMeta(data.categories, categories) : [];

  return (
    <>
      <PageHeader title="Reports" subtitle="Generate a summary for any period and export it."
        actions={data && (data.transactionCount > 0 || data.incomeCount > 0) && (
          <>
            <button type="button" className="btn btn--ghost" onClick={() => run(exportCSV, 'CSV')}><FileSpreadsheet size={16} /> Export CSV</button>
            <button type="button" className="btn btn--primary" onClick={() => run(exportPDF, 'PDF')}><Download size={16} /> Download PDF</button>
          </>
        )} />

      <div className="card filters">
        <div className="segmented">
          <button type="button" className={mode === 'month' ? 'active' : ''} onClick={() => setMode('month')}>Monthly</button>
          <button type="button" className={mode === 'custom' ? 'active' : ''} onClick={() => setMode('custom')}>Custom range</button>
        </div>
        {mode === 'month' ? (
          <input type="month" className="month-input" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Report month" />
        ) : (
          <>
            <input type="date" value={custom.from} max={custom.to || undefined} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} aria-label="From date" />
            <input type="date" value={custom.to} min={custom.from || undefined} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} aria-label="To date" />
          </>
        )}
      </div>

      {!enabled ? (
        <div className="card section"><EmptyState icon={FileText} title="Choose a date range" message="Select both a start and end date to build the report." /></div>
      ) : loading && !data ? <LoadingState label="Building report..." /> : error ? <LoadingState error={error} onRetry={reload} /> : data && (
        <>
          <p className="muted section-tight">Reporting period: <strong>{periodLabel(data.period)}</strong></p>
          <div className="grid grid--3">
            <SummaryCard icon={ArrowDownLeft} label="Income" value={fmt(data.totalIncome)} accent="var(--success)" sub={`${data.incomeCount} entr${data.incomeCount === 1 ? 'y' : 'ies'}`} />
            <SummaryCard icon={Wallet} label="Expenses" value={fmt(data.totalExpenses)} sub={`${data.transactionCount} transactions`} />
            <SummaryCard icon={Scale} label="Net" value={fmt(data.net)} accent={data.net < 0 ? 'var(--danger)' : 'var(--secondary)'} sub={data.net < 0 ? 'Spent more than earned' : 'Earned minus spent'} />
          </div>

          {data.transactionCount === 0 ? (
            <div className="card section"><EmptyState icon={FileText} title="No expenses in this period" message="There is nothing to report for the selected dates." /></div>
          ) : (
            <ChartCard title="Category-wise report" subtitle="Distribution of spending" className="section">
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Category</th><th className="right">Transactions</th><th className="right">Share</th><th className="right">Total</th></tr></thead>
                  <tbody>
                    {rows.map((c) => (
                      <tr key={c.category}>
                        <td><span className="chip" style={{ '--chip': c.color }}>{c.category}</span></td>
                        <td className="right muted">{c.count}</td>
                        <td className="right">
                          <div className="share">
                            <div className="progress"><div className="progress__bar" style={{ width: `${c.percentage}%`, background: c.color }} /></div>
                            <span>{c.percentage.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="right amount">{fmt(c.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.truncated && <p className="muted small">The export lists the first 5,000 transactions; totals cover the entire period.</p>}
            </ChartCard>
          )}
        </>
      )}
    </>
  );
}
