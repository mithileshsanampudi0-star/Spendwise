import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { categoryApi, metaApi } from '../services/api';
import { currentMonth } from '../utils/dateRanges';
import { useAuth } from './AuthContext';

const AppContext = createContext(null);

const THEME_KEY = 'spendwise_theme';

export function AppProvider({ children }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState(() => localStorage.getItem(THEME_KEY) || 'dark');
  const [month, setMonth] = useState(currentMonth());
  const [categories, setCategories] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [incomeSources, setIncomeSources] = useState(['Salary', 'Freelance', 'Business', 'Investments', 'Gift', 'Refund', 'Other']);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const reloadCategories = useCallback(async () => {
    try {
      setCategories(await categoryApi.list());
    } catch {
      /* the pages that need categories surface their own errors */
    }
  }, []);

  useEffect(() => {
    if (user) {
      reloadCategories();
      metaApi.get().then((m) => setIncomeSources(m.incomeSources)).catch(() => {});
    } else setCategories([]);
  }, [user, reloadCategories]);

  // Bumping this key makes every useFetch consumer reload, so dashboard, analytics and
  // budgets stay in sync after any change without a full page refresh.
  const notifyChange = useCallback(() => setRefreshKey((k) => k + 1), []);

  // `action` = { label, onClick } adds a button such as "Undo"; those toasts stay a little longer.
  const toast = useCallback((message, type = 'success', action) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type, action }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), action ? 8000 : 3800);
  }, []);

  const dismissToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const value = useMemo(
    () => ({
      theme,
      setTheme: setThemeState,
      toggleTheme: () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')),
      month,
      setMonth,
      categories,
      reloadCategories,
      refreshKey,
      notifyChange,
      incomeSources,
      paletteOpen,
      setPaletteOpen,
      quickOpen,
      setQuickOpen,
      toasts,
      toast,
      dismissToast,
    }),
    [theme, month, incomeSources, paletteOpen, quickOpen, categories, reloadCategories, refreshKey, notifyChange, toasts, toast, dismissToast]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
