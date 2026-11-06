import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartTooltip } from './ChartTooltip';

/** Donut chart used by both Dashboard and Analytics. `data` rows: { category, total, color, percentage } */
export default function DonutChart({ data, fmt, centerLabel, centerValue, height = 260 }) {
  return (
    <div className="donut" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="total" nameKey="category" innerRadius="62%" outerRadius="88%" paddingAngle={2} stroke="none">
            {data.map((d) => (
              <Cell key={d.category} fill={d.color} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip fmt={fmt} />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="donut__center">
        <small>{centerLabel}</small>
        <strong>{centerValue}</strong>
      </div>
    </div>
  );
}

export function DonutLegend({ data }) {
  return (
    <ul className="legend">
      {data.map((d) => (
        <li key={d.category}>
          <span className="legend__dot" style={{ background: d.color }} />
          <span>{d.category}</span>
          <small>{d.percentage.toFixed(1)}%</small>
        </li>
      ))}
    </ul>
  );
}
