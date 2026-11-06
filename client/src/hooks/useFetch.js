import { useEffect, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { getErrorMessage } from '../services/api';

/**
 * Fetch hook. Re-runs when `deps` change, when `reload()` is called, or when any page
 * triggers notifyChange() (an expense/budget was added, edited or deleted).
 */
export default function useFetch(fetcher, deps = []) {
  const { refreshKey } = useApp();
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let ignore = false;
    setState((s) => ({ ...s, loading: true, error: '' }));
    fetcher()
      .then((data) => !ignore && setState({ data, loading: false, error: '' }))
      .catch((err) => !ignore && setState({ data: null, loading: false, error: getErrorMessage(err) }));
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refreshKey, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
