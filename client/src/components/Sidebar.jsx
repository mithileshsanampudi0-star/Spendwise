import { NavLink } from 'react-router-dom';
import {
  BarChart3, ChevronsLeft, Landmark, ChevronsRight, FileText, LayoutDashboard, Lightbulb, LogOut, PiggyBank, Receipt, Repeat, TrendingUp,
  Settings, Tags, Target, X,
} from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';

export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/expenses', label: 'Transactions', icon: Receipt },
  { to: '/income', label: 'Income', icon: TrendingUp },
  { to: '/recurring', label: 'Recurring', icon: Repeat },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/budgets', label: 'Budgets', icon: Target },
  { to: '/categories', label: 'Categories', icon: Tags },
  { to: '/savings', label: 'Savings Goals', icon: PiggyBank },
  { to: '/debts', label: 'Debts & Loans', icon: Landmark },
  { to: '/insights', label: 'Financial Insights', icon: Lightbulb },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/settings', label: 'Settings', icon: Settings },
];

/**
 * Desktop: floating rail that collapses to icons.
 * Mobile/tablet: off-canvas drawer with scrim, close button, Esc and route-change close.
 */
export default function Sidebar({ mobile, open, collapsed, onClose, onToggleCollapse }) {
  const { user, logout } = useAuth();
  const rail = collapsed && !mobile;

  return (
    <>
      <div className={`sidebar-scrim ${mobile && open ? 'is-open' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside
        id="app-sidebar"
        className={`sidebar ${open ? 'is-open' : ''} ${rail ? 'is-collapsed' : ''}`}
        aria-label="Main navigation"
        aria-hidden={mobile && !open ? 'true' : undefined}
      >
        <div className="sidebar__head">
          <Logo compact={rail} size={rail ? 40 : 38} />
          {mobile && (
            <button type="button" className="icon-btn sidebar__close" onClick={onClose} aria-label="Close menu">
              <X size={18} />
            </button>
          )}
        </div>

        <nav className="sidebar__nav">
          {NAV_ITEMS.map(({ to, label, icon: Icon }, i) => (
            <NavLink
              key={to}
              to={to}
              onClick={mobile ? onClose : undefined}
              title={rail ? label : undefined}
              style={{ '--i': i }}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={19} />
              <span className="nav-link__label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__foot">
          {!rail && (
            <div className="sidebar__user">
              <span className="avatar avatar--sm">{user?.name?.[0]?.toUpperCase() || 'U'}</span>
              <div>
                <strong>{user?.name}</strong>
                <small>{user?.email}</small>
              </div>
            </div>
          )}
          <button type="button" className="nav-link nav-link--btn" onClick={logout} title={rail ? 'Log out' : undefined}>
            <LogOut size={19} />
            <span className="nav-link__label">Log out</span>
          </button>
        </div>

        {!mobile && (
          <button
            type="button"
            className="sidebar__toggle"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
          >
            {collapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
          </button>
        )}
      </aside>
    </>
  );
}
