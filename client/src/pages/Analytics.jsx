import { useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { areaGradient, barGradients } from '../components/ChartGradients';
import { BarChart3, CalendarDays, Crown, Receipt, TrendingDown, TrendingUp } from 'lucide-react';
import SummaryCard from '../components/SummaryCard';
import ChartCard from '../components/ChartCard';
import DonutChart, { DonutLegend } from '../components/DonutChart';
import { AXIS, ChartTooltip, GRID } from '../components/ChartTooltip';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import { PageHeader } from '../components/PageHeader';
import Heatmap from '../components/Heatmap';
import useFetch from '../hooks/useFetch';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { analyticsApi } from '../services/api';
import { RANGE_PRESETS, getRange } from '../utils/dateRanges';
import { withCategoryMeta } from '../utils/calc';
import { formatDate, shortLabel } from '../utils/format';

export default function Analytics() {
  const { categories } = useApp();
  const { fmt } = useAuth();
  const [preset, setPreset] = useState('month');
  const [custom, setCustom] = useState({ from: '', to: '' });

  const range = preset === 'custom' ? custom : getRange(preset);
  const validRange = Boolean(range.from && range.to && range.from <= range.to);

  const guard = (fn) => () => (validRange ? fn() : Promise.resolve(null));
  const summary = useFetch(guard(() => analyticsApi.summary(range)), [range.from, range.to]);
  const cats = useFetch(guard(() => analyticsApi.categories(range)), [range.from, range.to]);
  const daily = useFetch(guard(() => analyticsApi.trends({ ...range, groupBy: 'day' })), [range.from, range.to]);
  const comparison = useFetch(guard(() => analyticsApi.comparison(range)), [range.from, range.to]);

  const flow = useFetch(guard(() => analyticsApi.cashflow(range)), [range.from, range.to]);

  const loading = validRange && (summary.loading || cats.loading || daily.loading || comparison.loading) && !summary.data;
  const error = summary.error || cats.error || daily.error || comparison.error;

  const s = summary.data;
  const catRows = withCategoryMeta(cats.data || [], categories);
  const change = s?.comparison.changePct;

  return (
    <>
      <PageHeader title="Analytics" subtitle="Dig into where your money goes." />

      <div className="card filters">
        <div className="segmented segmented--wrap">
          {RANGE_PRESETS.map((p) => (
            <button key={p.value} type="button" className={preset === p.value ? 'active' : ''} onClick={() => setPreset(p.value)}>{p.label}</button>
          ))}
        </div>
        {preset === 'custom' && (
          <>
            <input type="date" value={custom.from} max={custom.to || undefined} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} aria-label="From date" />
            <input type="date" value={custom.to} min={custom.from || undefined} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} aria-label="To date" />
          </>
        )}
        {validRange && <span className="muted small">{formatDate(range.from)} - {formatDate(range.to)}</span>}
      </div>

      {!validRange ? (
        <div className="card section"><EmptyState icon={CalendarDays} title="Choose a date range" message="Pick both a start and end date for your custom range." /></div>
      ) : loading ? <LoadingState label="Crunching your numbers..." /> : error ? (
        <LoadingState error={error} onRetry={() => { summary.reload(); cats.reload(); daily.reload(); comparison.reload(); }} />
      ) : s && (
        <>
          <div className="grid grid--3 section">
            <SummaryCard icon={Receipt} label="Total expenses" value={fmt(s.total)} sub={`${s.count} transactions`} />
            <SummaryCard icon={CalendarDays} label="Average daily spending" value={fmt(s.dailyAverage)} accent="var(--secondary)" sub={`Over ${s.days} day${s.days === 1 ? '' : 's'}`} />
            <SummaryCard icon={Crown} label="Highest category" value={s.highestCategory?.category || '-'} accent="var(--warning)"
              sub={s.highestCategory ? fmt(s.highestCategory.total) : 'No data'} />
            <SummaryCard icon={TrendingDown} label="Lowest category" value={s.lowestCategory?.category || '-'} accent="var(--success)"
              sub={s.lowestCategory ? fmt(s.lowestCategory.total) : 'No data'} />
            <SummaryCard icon={BarChart3} label="Total transactions" value={String(s.count)} accent="var(--primary)" sub={`${catRows.length} categories used`} />
            <SummaryCard icon={TrendingUp} label="Change vs previous period"
              value={change === null ? 'No comparison' : `${change > 0 ? '+' : ''}${change.toFixed(1)}%`}
              accent={change > 0 ? 'var(--danger)' : 'var(--success)'}
              sub={change === null ? 'No spending in the previous period' : `Previous: ${fmt(s.comparison.previousTotal)}`} />
          </div>

          {s.count === 0 ? (
            <div className="card section"><EmptyState icon={BarChart3} title="No expenses in this range" message="Choose a different range or add expenses to see charts." /></div>
          ) : (
            <>
              <div className="grid grid--2 section">
                <ChartCard title="Category distribution" subtitle="Where the money went">
                  <DonutChart data={catRows} fmt={fmt} centerLabel="Total" centerValue={fmt(s.total, true)} />
                  <DonutLegend data={catRows} />
                </ChartCard>
                <ChartCard title="Daily spending" subtitle="Line chart by day">
                  <div className="chart-box chart-box--lg">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={daily.data || []} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        {areaGradient('gDaily')}
                        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tickFormatter={shortLabel} {...AXIS} tickLine={false} axisLine={false} minTickGap={28} />
                        <YAxis {...AXIS} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => fmt(v, true)} />
                        <Tooltip content={<ChartTooltip fmt={fmt} labelFormatter={shortLabel} />} />
                        <Area type="monotone" dataKey="total" name="Spent" stroke="url(#gDaily-line)" fill="url(#gDaily)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              </div>

              <div className="grid grid--2 section">
                <ChartCard title="Monthly spending" subtitle="Last 6 months">
                  <div className="chart-box">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparison.data?.monthly || []} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        {barGradients()}
                        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tickFormatter={shortLabel} {...AXIS} tickLine={false} axisLine={false} />
                        <YAxis {...AXIS} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => fmt(v, true)} />
                        <Tooltip cursor={{ fill: 'var(--hover)' }} content={<ChartTooltip fmt={fmt} labelFormatter={shortLabel} />} />
                        <Bar dataKey="total" name="Spent" fill="url(#gBarA)" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
                <ChartCard title="Weekly comparison" subtitle="Last 8 weeks">
                  <div className="chart-box">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparison.data?.weekly || []} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        {barGradients()}
                        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tickFormatter={shortLabel} {...AXIS} tickLine={false} axisLine={false} />
                        <YAxis {...AXIS} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => fmt(v, true)} />
                        <Tooltip cursor={{ fill: 'var(--hover)' }} content={<ChartTooltip fmt={fmt} labelFormatter={(l) => `Week ${shortLabel(l)}`} />} />
                        <Bar dataKey="total" name="Spent" fill="url(#gBarB)" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              </div>

              <div className="grid grid--2 section">
                <ChartCard title="Cash flow" subtitle="Income vs expenses, last 6 months">
                  {flow.loading && !flow.data ? <LoadingState compact /> : (
                    <div className="chart-box">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={flow.data?.monthly || []} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="label" tickFormatter={shortLabel} {...AXIS} tickLine={false} axisLine={false} />
                          <YAxis {...AXIS} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => fmt(v, true)} />
                          <Tooltip cursor={{ fill: 'var(--hover)' }} content={<ChartTooltip fmt={fmt} labelFormatter={shortLabel} />} />
                          <Legend wrapperStyle={{ color: 'var(--text-muted)', fontSize: 12 }} />
                          <Bar dataKey="income" name="Income" fill="var(--success)" radius={[8, 8, 0, 0]} />
                          <Bar dataKey="expenses" name="Expenses" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {flow.data && (
                    <p className="muted small">
                      This range: income <strong>{fmt(flow.data.income)}</strong>, expenses <strong>{fmt(flow.data.expenses)}</strong>, net <strong>{fmt(flow.data.net)}</strong>
                      {flow.data.savingsRate !== null && <>, savings rate <strong>{flow.data.savingsRate.toFixed(0)}%</strong></>}.
                    </p>
                  )}
                </ChartCard>
                <Heatmap state={{ data: flow.data?.dailyExpenses, loading: flow.loading, error: flow.error, reload: flow.reload }} fmt={fmt} />
              </div>

              <ChartCard title="Category comparison" subtitle="Selected range vs the previous period of equal length" className="section">
                <div className="chart-box chart-box--lg">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparison.data?.categories || []} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      {barGradients()}
                      <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="category" {...AXIS} tickLine={false} axisLine={false} interval={0} tickFormatter={(v) => (v.length > 10 ? `${v.slice(0, 9)}…` : v)} />
                      <YAxis {...AXIS} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => fmt(v, true)} />
                      <Tooltip cursor={{ fill: 'var(--hover)' }} content={<ChartTooltip fmt={fmt} />} />
                      <Legend wrapperStyle={{ color: 'var(--text-muted)', fontSize: 12 }} />
                      <Bar dataKey="current" name="This period" fill="url(#gBarA)" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="previous" name="Previous period" fill="url(#gBarB)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </>
          )}
        </>
      )}
    </>
  );
}
