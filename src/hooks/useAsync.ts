import { useCallback, useEffect, useRef, useState } from 'react';
import { formatApiError } from '../lib/api';
import { safeStorageGet, safeStorageRemove, safeStorageSet } from '../lib/format';

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data?: T; loading: boolean; error?: string }>({ loading: true });
  const [tick, setTick] = useState(0);
  const prevTickRef = useRef(0);
  useEffect(() => {
    let live = true;
    const isManualReload = tick !== prevTickRef.current;
    prevTickRef.current = tick;
    setState((s) => (isManualReload ? { ...s, loading: true, error: undefined } : { loading: true }));
    fn()
      .then((data) => live && setState({ data, loading: false }))
      .catch((e) => live && setState({ loading: false, error: formatApiError(e) }));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

export function useLocalList(key: string, max = 8): [string[], (v: string) => void, () => void] {
  const read = () => { try { return JSON.parse(safeStorageGet('local', key) || '[]') as string[]; } catch { return []; } };
  const [items, setItems] = useState<string[]>(read);
  const add = useCallback((v: string) => {
    setItems((prev) => {
      const next = [v, ...prev.filter((x) => x !== v)].slice(0, max);
      safeStorageSet('local', key, JSON.stringify(next));
      return next;
    });
  }, [key, max]);
  const clear = useCallback(() => {
    setItems([]);
    safeStorageRemove('local', key);
  }, [key]);
  return [items, add, clear];
}
