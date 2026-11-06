import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ToastHost from './ToastHost';
import CommandPalette from './CommandPalette';
import DemoBanner from './DemoBanner';
import { ActionsProvider } from '../context/ActionsContext';
import useMediaQuery from '../hooks/useMediaQuery';

const KEY = 'spendwise_sidebar_collapsed';

export default function AppLayout() {
  const mobile = useMediaQuery('(max-width: 1024px)');
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(KEY) === '1');

  const close = useCallback(() => setOpen(false), []);

  // Close the drawer on navigation, when switching to desktop, and on Escape.
  useEffect(() => close(), [pathname, close]);
  useEffect(() => {
    if (!mobile) close();
  }, [mobile, close]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, close]);

  const toggleCollapse = () =>
    setCollapsed((c) => {
      localStorage.setItem(KEY, c ? '0' : '1');
      return !c;
    });

  const onMenu = () => (mobile ? setOpen((o) => !o) : toggleCollapse());

  return (
    <ActionsProvider>
    <a href="#main" className="skip-link">Skip to main content</a>
    <div className={`app-shell ${collapsed && !mobile ? 'is-collapsed' : ''}`}>
      <Sidebar mobile={mobile} open={open} collapsed={collapsed} onClose={close} onToggleCollapse={toggleCollapse} />
      <div className="app-main">
        <Topbar onMenu={onMenu} menuOpen={mobile ? open : !collapsed} />
        <DemoBanner />
        <main className="page" id="main" tabIndex={-1}>
          <div key={pathname} className="page-anim">
            <Outlet />
          </div>
        </main>
      </div>
      <ToastHost />
      <CommandPalette />
    </div>
    </ActionsProvider>
  );
}
