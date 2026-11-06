import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from 'lucide-react';

const ICONS = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: OctagonAlert };

export default function InsightCard({ insight }) {
  const severity = insight.severity || 'info';
  const Icon = ICONS[severity] || Info;
  return (
    <article className={`insight insight--${severity}`}>
      <span className="insight__icon">
        <Icon size={18} />
      </span>
      <div>
        <h4>{insight.title}</h4>
        <p>{insight.message}</p>
      </div>
    </article>
  );
}
