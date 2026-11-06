import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Command, LogOut, Menu, Moon, Search, Settings, Sun, User } from 'lucide-react';
import { NAV_ITEMS } from './Sidebar';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import useFetch from '../hooks/useFetch';
import { budgetApi } from '../services/api';
import { splitMonth } from '../utils/dateRanges';
import { budgetAlerts } from '../utils/calc';

function useOutsideClose(ref, close) {
  useEffect(() => {
    const handler = (e) => ref.current && !ref.current.contains(e.target) && close();
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, close]);
}

export default function Topbar({ onMenu, menuOpen }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const title = NAV_ITEMS.find((n) => n.to === pathname)?.label || (pathname === '/profile' ? 'Profile' : 'SpendWise');
  const { user, logout, fmt } = useAuth();
  const { month, setMonth, theme, toggleTheme, setPaletteOpen } = useApp();
  const [query, setQuery] = useState('');
  const [menu, setMenu] = useState(null); // 'bell' | 'user' | null
  const ref = useRef(null);
  useOutsideClose(ref, () => setMenu(null));

  const { data: budgets } = useFetch(() => budgetApi.list(splitMonth(month)), [month]);
  const alerts = budgetAlerts(budgets || []);

  const search = (e) => {
    e.preventDefault();
    navigate(`/expenses${query.trim() ? `?search=${encodeURIComponent(query.trim())}` : ''}`);
  };

  return (
    <header className="topbar" ref={ref}>
      <button type="button" className="icon-btn topbar__menu" onClick={onMenu} aria-label="Toggle sidebar" aria-expanded={menuOpen} aria-controls="app-sidebar">
        <Menu size={20} />
      </button>
      <h2 className="topbar__title">{title}</h2>

      <form className="search" onSubmit={search} role="search">
        <Search size={16} />
        <input id="global-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search transactions..." aria-label="Search transactions" />
      </form>

      <div className="topbar__right">
        <input type="month" className="month-input" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Select month" />

        <button type="button" className="icon-btn" onClick={() => setPaletteOpen(true)} aria-label="Open command palette" title="Command palette (Ctrl+K)">
          <Command size={18} />
        </button>

        <button type="button" className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme" title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="popover-wrap">
          <button type="button" className="icon-btn" onClick={() => setMenu(menu === 'bell' ? null : 'bell')} aria-label="Notifications">
            <Bell size={18} />
            {alerts.length > 0 && <span className="notif-dot">{alerts.length}</span>}
          </button>
          {menu === 'bell' && (
            <div className="popover">
              <h4>Budget alerts</h4>
              {alerts.length === 0 ? (
                <p className="muted small">No budget alerts for this month.</p>
              ) : (
                alerts.map((b) => (
                  <Link key={b._id} to="/budgets" className={`alert-row alert-row--${b.status}`} onClick={() => setMenu(null)}>
                    <strong>{b.category}</strong>
                    <span>{b.status === 'critical' ? 'Exceeded' : 'Nearing limit'} · {b.utilization.toFixed(0)}% of {fmt(b.amount)}</span>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>

        <div className="popover-wrap">
          <button type="button" className="avatar-btn" onClick={() => setMenu(menu === 'user' ? null : 'user')} aria-label="Profile menu">
            <span className="avatar">{user?.name?.[0]?.toUpperCase() || 'U'}</span>
          </button>
          {menu === 'user' && (
            <div className="popover popover--menu">
              <div className="popover__user">
                <strong>{user?.name}</strong>
                <small>{user?.email}</small>
              </div>
              <Link to="/profile" onClick={() => setMenu(null)}><User size={15} /> Profile</Link>
              <Link to="/settings" onClick={() => setMenu(null)}><Settings size={15} /> Settings</Link>
              <button type="button" onClick={logout}><LogOut size={15} /> Log out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
