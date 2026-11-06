import { Link } from 'react-router-dom';

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </div>
  );
}

export function NotFound() {
  return (
    <div className="fullscreen-center">
      <div className="empty-state">
        <h1 className="gradient-text" style={{ fontSize: '4rem' }}>404</h1>
        <h4>Page not found</h4>
        <p>The page you are looking for does not exist.</p>
        <Link to="/" className="btn btn--primary">Go home</Link>
      </div>
    </div>
  );
}
