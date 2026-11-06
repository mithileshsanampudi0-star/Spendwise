import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/api';
import { formatCurrency } from '../utils/format';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // The session is an httpOnly cookie we cannot read, so always ask the server who we are.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    authApi
      .me()
      .then((d) => !ignore && setUser(d.user))
      .catch(() => {})
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener('spendwise:unauthorized', onUnauthorized);
    return () => window.removeEventListener('spendwise:unauthorized', onUnauthorized);
  }, []);

  const login = useCallback(async (credentials) => setUser((await authApi.login(credentials)).user), []);
  const register = useCallback(async (details) => setUser((await authApi.register(details)).user), []);
  const startDemo = useCallback(async () => setUser((await authApi.demo()).user), []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* the cookie expires on its own; still sign out locally */
    }
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (changes) => setUser((await authApi.updateProfile(changes)).user), []);

  const value = useMemo(() => {
    const currency = user?.currency || 'INR';
    return {
      user,
      loading,
      login,
      register,
      startDemo,
      logout,
      updateProfile,
      isDemo: Boolean(user?.isDemo),
      currency,
      fmt: (amount, compact = false) => formatCurrency(amount, currency, compact),
    };
  }, [user, loading, login, register, startDemo, logout, updateProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
