import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { areaGradient } from '../components/ChartGradients';
import { ArrowDownLeft, CalendarDays, Crown, PiggyBank, Plus, Receipt, Scale, Wallet } from 'lucide-react';
import QuickAdd from '../components/QuickAdd';
import HealthGauge from '../components/HealthGauge';
import ForecastCard from '../components/ForecastCard';
import Heatmap from '../components/Heatmap';
import Onboarding from '../components/Onboarding';
import { SkeletonPage } from '../components/Skeleton';
import { useActions } from '../context/ActionsContext';
import SummaryCard from '../components/SummaryCard';
import ChartCard from '../components/ChartCard';
import CategoryCard from '../components/CategoryCard';
import BudgetCard from '../components/BudgetCard';
import ExpenseTable from '../components/ExpenseTable';
import InsightCard from '../components/InsightCard';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import DonutChart, { DonutLegend } from '../components/DonutChart';
import { AXIS, ChartTooltip, GRID } from '../components/ChartTooltip';
import { PageHeader } from '../components/PageHeader';
import useFetch from '../hooks/useFetch';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { analyticsApi, budgetApi, expenseApi, incomeApi, insightsApi, recurringApi } from '../services/api';
import { lastWeeks, monthRange, splitMonth } from '../utils/dateRanges';
import { budgetTotals, withCategoryMeta } from '../utils/calc';
import { monthLabel, shortLabel } from '../utils/format';

export default function Dashboard() {
  const { month, categories } = useApp();
  const { fmt, user } = useAuth();
  const [groupBy, setGroupBy] = useState('day');
  const range = monthRange(month);

  const summary = useFetch(() => analyticsApi.summary(range), [month]);
  const cats = useFetch(() => analyticsApi.categories(range), [month]);
  const trends = useFetch(() => analyticsApi.trends({ ...range, groupBy }), [month, groupBy]);
  const budgets = useFetch(() => budgetApi.list(splitMonth(month)), [month]);
  const recent = useFetch(() => expenseApi.list({ limit: 5, sortBy: 'date', order: 'desc' }), []);
  const insights = useFetch(() => insightsApi.get({ month }), [month]);
  const forecast = useFetch(() => analyticsApi.forecast({ month }), [month]);
  const health = useFetch(() => analyticsApi.health({ month }), [month]);
  // The calendar always shows the last 12 weeks, so it is useful even in the first days of a month.
  const heatRange = lastWeeks(12);
  const heat = useFetch(() => analyticsApi.heatmap(heatRange), [heatRange.from]);
  const anyIncome = useFetch(() => incomeApi.list({ limit: 1 }), []);
  const rules = useFetch(() => recurringApi.list(), []);

  const actions = useActions();

  if (summary.loading && !summary.data) return <SkeletonPage />;
  if (summary.error) return <LoadingState error={summary.error} onRetry={summary.reload} />;

  const budgetList0 = budgets.data || [];
  const s = summary.data;
  const onboardingSteps = [
    { label: 'Add your first expense', done: (recent.data?.pagination?.total || 0) > 0, onClick: () => actions.addExpense() },
    { label: 'Record some income', done: (anyIncome.data?.pagination?.total || 0) > 0, onClick: () => actions.addIncome() },
    { label: 'Set a monthly budget', done: budgetList0.length > 0, to: '/budgets' },
    { label: 'Add a recurring bill or salary', done: (rules.data || []).length > 0, to: '/recurring' },
  ];
  const catRows = withCategoryMeta(cats.data || [], categories);
  const budgetList = budgets.data || [];
  const bt = budgetTotals(budgetList);
  const meta = (name) => categories.find((c) => c.name === name);
  const hasData = s.count > 0;

  return (
    <>
      <PageHeader
        title={`Hi, ${user?.name?.split(' ')[0] || 'there'}`}
        subtitle={`Here is your spending overview for ${monthLabel(month)}.`}
        actions={
          <button type="button" className="btn btn--primary" onClick={() => actions.addExpense()}>
            <Plus size={16} /> Add expense
          </button>
        }
      />

      <QuickAdd className="quickadd--page" />

      <Onboarding steps={onboardingSteps} />

      <div className="grid grid--4">
        <SummaryCard icon={Receipt} label="Total expenses" value={fmt(s.total)} amount={s.total} format={fmt} accent="var(--primary)"
          trend={s.comparison.changePct}
          sub={s.comparison.changePct === null ? `${s.count} transactions` : `${s.count} transactions · vs previous period`} />
        <SummaryCard icon={CalendarDays} label="Daily average spending" value={fmt(s.dailyAverage)} amount={s.dailyAverage} format={fmt} accent="var(--secondary)"
          sub={`Across ${s.days} day${s.days === 1 ? '' : 's'}`} />
        <SummaryCard icon={Crown} label="Highest spending category" value={s.highestCategory?.category || 'No data yet'} accent="var(--warning)"
          sub={s.highestCategory ? `${fmt(s.highestCategory.total)} · ${s.highestCategory.percentage}% of total` : 'Add an expense to see this'} />
        <SummaryCard icon={Wallet} label="Remaining monthly budget"
          value={budgetList.length ? fmt(bt.remaining) : 'No budget set'} amount={budgetList.length ? bt.remaining : undefined} format={fmt}
          accent={bt.remaining < 0 ? 'var(--danger)' : 'var(--success)'}
          sub={budgetList.length ? `${fmt(bt.spent)} of ${fmt(bt.total)} used (${bt.utilization.toFixed(0)}%)` : 'Create budgets to track this'} />
      </div>

      <div className="grid grid--3 section">
        <SummaryCard icon={ArrowDownLeft} label="Income" value={fmt(s.income)} amount={s.income} format={fmt} accent="var(--success)"
          sub={s.income > 0 ? 'Money in this period' : 'No income recorded yet'} />
        <SummaryCard icon={Scale} label="Net cash flow" value={fmt(s.net)} amount={s.net} format={fmt}
          accent={s.net < 0 ? 'var(--danger)' : 'var(--success)'}
          sub={s.income > 0 || s.total > 0 ? (s.net < 0 ? 'Spending exceeds income' : 'Income minus expenses') : 'Nothing recorded'} />
        <SummaryCard icon={PiggyBank} label="Savings rate"
          value={s.savingsRate === null ? 'Needs income' : `${s.savingsRate.toFixed(0)}%`}
          accent={s.savingsRate !== null && s.savingsRate < 0 ? 'var(--danger)' : 'var(--primary)'}
          sub={s.savingsRate === null ? 'Add income to calculate' : 'Share of income you kept'} />
      </div>

      <div className="grid grid--2 section">
        <ForecastCard state={forecast} month={month} />
        <HealthGauge state={health} />
      </div>

      <div className="section"><Heatmap state={heat} fmt={fmt} subtitle="Last 12 weeks. Darker means more spent that day" /></div>

      {!hasData ? (
        <div className="card section">
          <EmptyState icon={Receipt} title={`No expenses in ${monthLabel(month)}`}
            message="Add your first expense or pick another month to see charts, budgets and insights."
            action={<button type="button" className="btn btn--primary" onClick={() => actions.addExpense()}><Plus size={16} /> Add expense</button>} />
        </div>
      ) : (
        <>
          <div className="grid grid--2-1 section">
            <ChartCard title="Spending trend" subtitle={monthLabel(month)}
              actions={
                <div className="segmented">
                  {['day', 'week'].map((g) => (
                    <button key={g} type="button" className={groupBy === g ? 'active' : ''} onClick={() => setGroupBy(g)}>
                      {g === 'day' ? 'Daily' : 'Weekly'}
                    </button>
                  ))}
                </div>
              }>
              {trends.loading && !trends.data ? <LoadingState compact /> : (
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trends.data || []} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      {areaGradient('gTrend')}
                      <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tickFormatter={shortLabel} {...AXIS} tickLine={false} axisLine={false} minTickGap={24} />
                      <YAxis {...AXIS} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => fmt(v, true)} />
                      <Tooltip content={<ChartTooltip fmt={fmt} labelFormatter={shortLabel} />} />
                      <Area type="monotone" dataKey="total" name="Spent" stroke="url(#gTrend-line)" fill="url(#gTrend)" strokeWidth={2.5} dot={groupBy === 'week'} activeDot={{ r: 5 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            <ChartCard title="Category distribution" subtitle="Share of total spend">
              <DonutChart data={catRows} fmt={fmt} centerLabel="Total" centerValue={fmt(s.total, true)} />
              <DonutLegend data={catRows} />
            </ChartCard>
          </div>

          <section className="section">
            <h3 className="section__title">Category spending</h3>
            <div className="grid grid--cards">
              {catRows.map((c) => (
                <CategoryCard key={c.category} fmt={fmt}
                  category={{ name: c.category, color: c.color, icon: c.icon, total: c.total, percentage: c.percentage, count: c.count }} />
              ))}
            </div>
          </section>
        </>
      )}

      <div className="grid grid--2 section">
        <ChartCard title="Budget overview" subtitle="Budget vs actual"
          actions={<Link to="/budgets" className="link">Manage</Link>}>
          {budgets.loading && !budgets.data ? <LoadingState compact /> : budgetList.length === 0 ? (
            <EmptyState icon={Wallet} title="No budgets for this month" message="Set category limits to see utilization here."
              action={<Link to="/budgets" className="btn btn--ghost btn--sm">Create budget</Link>} />
          ) : (
            <div className="stack">
              {budgetList.map((b) => <BudgetCard key={b._id} budget={b} meta={meta(b.category)} fmt={fmt} compact />)}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Financial insights" subtitle="Based on your records"
          actions={<Link to="/insights" className="link">View all</Link>}>
          {insights.loading && !insights.data ? <LoadingState compact /> : insights.data && !insights.data.sufficient ? (
            <EmptyState title="Not enough data yet" message={insights.data.message} />
          ) : (
            <div className="stack">
              {(insights.data?.insights || []).slice(0, 4).map((i, idx) => <InsightCard key={i.type + idx} insight={i} />)}
            </div>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Recent transactions" className="section"
        actions={<Link to="/expenses" className="link">See all</Link>}>
        {recent.loading && !recent.data ? <LoadingState compact /> : recent.data?.data.length ? (
          <ExpenseTable compact expenses={recent.data.data} categories={categories} fmt={fmt}
            onEdit={actions.editExpense} onDelete={actions.deleteExpense} />
        ) : (
          <EmptyState icon={Receipt} title="No transactions yet" message="Your latest expenses will appear here." />
        )}
      </ChartCard>

    </>
  );
}
