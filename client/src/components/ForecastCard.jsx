import { TrendingUp } from 'lucide-react';
import ChartCard from './ChartCard';
import LoadingState from './LoadingState';
import { useAuth } from '../context/AuthContext';
import { monthLabel } from '../utils/format';

/** Month-end projection with the reasoning shown, and a clear "not enough data" state instead of a guess. */
export default function ForecastCard({ state, month }) {
  const { fmt } = useAuth();
  const { data, loading, error, reload } = state;

  return (
    <ChartCard title={data?.final ? 'Month total' : 'Month-end forecast'} subtitle={monthLabel(month)}>
      {loading && !data ? <LoadingState compact /> : error ? <LoadingState compact error={error} onRetry={reload} /> : !data.sufficient ? (
        <div className="empty-inline"><TrendingUp size={20} aria-hidden="true" /><p>{data.reason}</p></div>
      ) : (
        <div className="forecast">
          <p className="forecast__value">{fmt(data.projected)}</p>
          <p className="muted">
            {data.final ? 'Final spending for this month.' : <>
              Spent so far <strong>{fmt(data.spent)}</strong>, plus about <strong>{fmt(data.dailyRate)}</strong> a day for {data.remainingDays} more day{data.remainingDays === 1 ? '' : 's'}
              {data.upcomingRecurring > 0 && <>, plus <strong>{fmt(data.upcomingRecurring)}</strong> of bills still due</>}.
            </>}
          </p>
          <ul className="forecast__facts">
            {data.budgetTotal > 0 && (
              <li className={data.projectedVsBudget > 0 ? 'bad' : 'good'}>
                {data.projectedVsBudget > 0 ? `${fmt(data.projectedVsBudget)} over` : `${fmt(Math.abs(data.projectedVsBudget))} under`} your total budget of {fmt(data.budgetTotal)}
              </li>
            )}
            {data.safeDailySpend != null && (
              <li className={data.safeDailySpend < 0 ? 'bad' : ''}>
                {data.safeDailySpend < 0 ? 'Budget already used up for this month' : <>You can spend <strong>{fmt(data.safeDailySpend)}</strong> a day to stay within budget</>}
              </li>
            )}
            {data.projectedSavings != null && (
              <li className={data.projectedSavings < 0 ? 'bad' : 'good'}>
                Projected {data.projectedSavings < 0 ? 'shortfall' : 'savings'} {fmt(Math.abs(data.projectedSavings))} against income of {fmt(data.incomeSoFar)}
              </li>
            )}
          </ul>
          {!data.final && <span className={`chip chip--conf-${data.confidence}`}>{data.confidence} confidence</span>}
        </div>
      )}
    </ChartCard>
  );
}
