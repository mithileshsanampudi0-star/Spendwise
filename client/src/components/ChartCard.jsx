export default function ChartCard({ title, subtitle, actions, children, className = '' }) {
  return (
    <section className={`card chart-card ${className}`}>
      <header className="card__header">
        <div>
          <h3 className="card__title">{title}</h3>
          {subtitle && <p className="card__subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="card__actions">{actions}</div>}
      </header>
      <div className="card__body">{children}</div>
    </section>
  );
}
