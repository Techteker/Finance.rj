import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { addFavorite, formatApiError, getFavorites, removeFavorite } from '../lib/api';
import { safeStorageGet, safeStorageSet } from '../lib/format';
import type { FavType, Favorite } from '../types';
import { useAuth } from './auth';

/* ---------- Toast ---------- */
interface ToastCtx { show: (msg: string, action?: { label: string; run: () => void }) => void }
const T = createContext<ToastCtx>({ show: () => {} });
export const useToast = () => useContext(T);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<{ msg: string; action?: { label: string; run: () => void } } | null>(null);
  const timerRef = useRef<number | null>(null);
  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); }, []);
  const show = useCallback<ToastCtx['show']>((msg, action) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setT({ msg, action });
    timerRef.current = window.setTimeout(() => { setT(null); timerRef.current = null; }, 4000);
  }, []);
  return (
    <T.Provider value={{ show }}>
      {children}
      {t && (
        <div role="status" className="fixed inset-x-4 bottom-24 z-[60] mx-auto flex max-w-md items-center gap-3 rounded-xl bg-ink px-4 py-3 text-sm text-white shadow-card md:bottom-8">
          <span className="flex-1">{t.msg}</span>
          {t.action && <button className="font-bold text-gold" onClick={() => { t.action!.run(); if (timerRef.current) window.clearTimeout(timerRef.current); setT(null); }}>{t.action.label}</button>}
        </div>
      )}
    </T.Provider>
  );
}

/* ---------- Favorites ---------- */
interface Snap { title: string; subtitle?: string; imageUrl?: string; href: string }
interface FavCtx {
  items: Favorite[]; loading: boolean;
  isSaved: (type: FavType, id: string) => boolean;
  toggle: (type: FavType, id: string, snap: Snap) => Promise<void>;
  remove: (fav: Favorite) => Promise<void>;
  restore: (fav: Favorite) => Promise<void>;
}
const F = createContext<FavCtx>(null as unknown as FavCtx);
export const useFavorites = () => useContext(F);
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const toast = useToast();
  const [items, setItems] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(false);
  const pendingRef = useRef(new Set<string>());
  const activeUserIdRef = useRef<string | null>(null);

  const userId = user?.$id ?? null;
  activeUserIdRef.current = userId;
  useEffect(() => {
    pendingRef.current.clear();
    if (!userId) { setItems([]); setLoading(false); return; }
    let live = true;
    setLoading(true);
    getFavorites(userId)
      .then((docs) => { if (live && activeUserIdRef.current === userId) setItems(docs); })
      .catch(() => { if (live && activeUserIdRef.current === userId) setItems([]); })
      .finally(() => { if (live && activeUserIdRef.current === userId) setLoading(false); });
    return () => { live = false; };
  }, [userId]);

  const value = useMemo<FavCtx>(() => ({
    items, loading,
    isSaved: (type, id) => items.some((i) => i.itemType === type && i.itemId === id),
    toggle: async (type, id, snap) => {
      if (!user) { nav('/login', { state: { from: loc.pathname } }); return; }
      const actorId = user.$id;
      const key = `${type}:${id}`;
      if (pendingRef.current.has(key)) return;
      pendingRef.current.add(key);
      const existing = items.find((i) => i.itemType === type && i.itemId === id);
      try {
        if (existing) {
          await removeFavorite(existing.$id);
          if (activeUserIdRef.current !== actorId) return;
          setItems((p) => p.filter((i) => i.$id !== existing.$id));
          toast.show('Removed from Favorites');
        } else {
          const f = await addFavorite(actorId, { itemType: type, itemId: id, ...snap });
          if (activeUserIdRef.current !== actorId) return;
          setItems((p) => [f, ...p]);
          toast.show('Saved to Favorites', { label: 'View', run: () => nav('/favorites') });
        }
      } catch (e) {
        if (activeUserIdRef.current === actorId) toast.show(formatApiError(e));
      } finally {
        pendingRef.current.delete(key);
      }
    },
    remove: async (fav) => {
      const actorId = activeUserIdRef.current;
      await removeFavorite(fav.$id);
      if (activeUserIdRef.current !== actorId) return;
      setItems((p) => p.filter((i) => i.$id !== fav.$id));
    },
    restore: async (fav) => {
      if (!user) return;
      const actorId = user.$id;
      const f = await addFavorite(actorId, { itemType: fav.itemType, itemId: fav.itemId, title: fav.title, subtitle: fav.subtitle, imageUrl: fav.imageUrl, href: fav.href });
      if (activeUserIdRef.current !== actorId) return;
      setItems((p) => [f, ...p]);
    },
  }), [items, loading, user, nav, loc.pathname, toast]);
  return <F.Provider value={value}>{children}</F.Provider>;
}

/* ---------- Compare selection (max 3, kept for the session) ---------- */
interface CmpCtx { ids: string[]; has: (id: string) => boolean; toggle: (id: string) => void; clear: () => void }
const C = createContext<CmpCtx>(null as unknown as CmpCtx);
export const useCompare = () => useContext(C);
export function CompareProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [ids, setIds] = useState<string[]>(() => { try { return JSON.parse(safeStorageGet('session', 'forword:compare') || '[]'); } catch { return []; } });
  useEffect(() => { safeStorageSet('session', 'forword:compare', JSON.stringify(ids)); }, [ids]);
  const value = useMemo<CmpCtx>(() => ({
    ids, has: (id) => ids.includes(id), clear: () => setIds([]),
    toggle: (id) => setIds((p) => { if (p.includes(id)) return p.filter((x) => x !== id); if (p.length >= 3) { toast.show('You can compare up to 3 products.'); return p; } return [...p, id]; }),
  }), [ids, toast]);
  return <C.Provider value={value}>{children}</C.Provider>;
}

/* ---------- Online status ---------- */
export function useOnline() {
  const [on, setOn] = useState(navigator.onLine);
  useEffect(() => {
    const a = () => setOn(true), b = () => setOn(false);
    window.addEventListener('online', a); window.addEventListener('offline', b);
    return () => { window.removeEventListener('online', a); window.removeEventListener('offline', b); };
  }, []);
  return on;
}
