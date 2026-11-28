import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Briefcase,
  Building2,
  Calculator,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  HandCoins,
  Landmark,
  Newspaper,
  PieChart,
  Shield,
  Tag,
  X,
  type LucideIcon,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useI18n } from '../hooks/i18n';
import { useAuth } from '../hooks/auth';

interface SubMenuItem {
  label: string;
  to: string;
}

interface MenuSection {
  id: string;
  label: string;
  Icon: LucideIcon;
  allLabel: string;
  allTo: string;
  items: SubMenuItem[];
}

export function SideMenuDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { pathname } = useLocation();
  const { t } = useI18n();
  const { user } = useAuth();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [menuRows, setMenuRows] = useState<Array<{ slug: string; label: string; parent_slug: string | null; route: string; icon: string; sort_order: number }>>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const loadMenu = async () => {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('navigation_menu_items')
        .select('slug,label,parent_slug,route,icon,sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (!alive) return;
      if (error) {
        console.error('Unable to load navigation menu from Supabase:', error.message);
        setMenuRows([]);
        return;
      }
      setMenuRows((data ?? []) as typeof menuRows);
    };
    void loadMenu();
    return () => { alive = false; };
  }, []);

  const sections = useMemo<MenuSection[]>(() => {
    const icons: Record<string, LucideIcon> = {
      'credit-card': CreditCard, landmark: Landmark, 'hand-coins': HandCoins,
      shield: Shield, 'chart-pie': PieChart, 'file-text': Building2,
      users: Briefcase, calculator: Calculator, tag: Tag, newspaper: Newspaper,
    };
    return menuRows.filter((row) => row.parent_slug === null).map((parent) => ({
      id: parent.slug,
      label: parent.label,
      Icon: icons[parent.icon] ?? Briefcase,
      allLabel: parent.slug === 'news' ? 'All News' : parent.slug === 'offers' ? 'All Offers' : parent.slug === 'calculators' ? 'All Financial Tools' : `All ${parent.label}`,
      allTo: parent.route,
      items: menuRows
        .filter((row) => row.parent_slug === parent.slug)
        .map((row) => ({ label: row.label, to: row.route })),
    }));
  }, [menuRows]);

  const activeSection = useMemo(
    () => (activeId ? sections.find((s) => s.id === activeId) ?? null : null),
    [activeId, sections],
  );

  // Close drawer automatically when navigating to a new route.
  useEffect(() => {
    onClose();
  }, [pathname]);

  // Reset submenu when closed, lock scroll & listen to Escape while open.
  useEffect(() => {
    if (!open) {
      setActiveId(null);
      return;
    }
    panelRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex">
      <button
        type="button"
        aria-label={t('nav.close')}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 transition-opacity"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={activeSection ? activeSection.label : t('nav.menu')}
        className="relative z-10 flex h-full w-full max-w-[360px] flex-col bg-white shadow-2xl outline-none"
      >
        {/* Top drawer header */}
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-line px-4 pt-[env(safe-area-inset-top)]">
          {activeSection ? (
            <button
              type="button"
              onClick={() => setActiveId(null)}
              aria-label={t('nav.back')}
              className="flex min-w-0 items-center gap-2 rounded-lg py-1.5 pr-2 text-left text-[16px] font-bold text-ink transition-colors hover:text-pri-dark"
            >
              <ChevronLeft size={22} className="shrink-0 text-pri-dark" aria-hidden />
              <activeSection.Icon size={20} strokeWidth={1.7} className="shrink-0 text-pri-dark" aria-hidden />
              <span className="truncate">{activeSection.label}</span>
            </button>
          ) : (
            <Link
              to="/"
              onClick={onClose}
              aria-label="FORWORD home"
              className="pl-2 text-[22px] font-bold tracking-tight text-ink"
            >
              FOR<span className="text-pri-dark">WORD</span>
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={t('nav.close')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface"
          >
            <X size={21} aria-hidden />
          </button>
        </div>

        {/* Scrollable menu / sub-menu list */}
        <nav aria-label={activeSection ? `${activeSection.label} submenu` : 'Main menu'} className="flex-1 overflow-y-auto">
          {!activeSection ? (
            <ul className="divide-y divide-line">
              {sections.map((section) => {
                const RowIcon = section.Icon;
                return (
                  <li key={section.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(section.id)}
                      className="flex w-full items-center gap-4 px-6 py-[18px] text-left transition-colors hover:bg-surface/70 active:bg-mint/50"
                    >
                      <RowIcon size={26} strokeWidth={1.6} className="shrink-0 text-pri-dark" aria-hidden />
                      <span className="min-w-0 flex-1 text-[17px] font-semibold leading-snug text-ink">
                        {section.label}
                      </span>
                      <ChevronRight size={20} strokeWidth={2.2} className="shrink-0 text-pri-dark" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="divide-y divide-line">
              <li>
                <Link
                  to={activeSection.allTo}
                  onClick={onClose}
                  className="flex items-center justify-between gap-3 bg-mint/40 px-6 py-4 text-[15px] font-bold text-pri-dark transition-colors hover:bg-mint"
                >
                  <span>{activeSection.allLabel}</span>
                  <ChevronRight size={18} strokeWidth={2.2} className="shrink-0 text-pri-dark" aria-hidden />
                </Link>
              </li>
              {activeSection.items.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onClose}
                    className="flex items-center justify-between gap-3 px-6 py-4 text-[15px] font-medium text-ink transition-colors hover:bg-surface/70 active:bg-mint/40"
                  >
                    <span className="min-w-0 flex-1">{item.label}</span>
                    <ChevronRight size={18} strokeWidth={2} className="shrink-0 text-pri-dark/80" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </nav>

        {!activeSection && (
          <div className="shrink-0 border-t border-line bg-white p-4 pb-[max(env(safe-area-inset-bottom),16px)]">
            {user ? (
              <Link
                to="/profile"
                onClick={onClose}
                className="flex h-12 w-full items-center justify-center rounded-full bg-pri px-5 text-sm font-bold text-white transition-colors hover:bg-pri-dark"
              >
                My account
              </Link>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/login"
                  onClick={onClose}
                  className="flex h-12 items-center justify-center rounded-full border border-pri px-4 text-sm font-bold text-pri-dark transition-colors hover:bg-mint"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  onClick={onClose}
                  className="flex h-12 items-center justify-center rounded-full bg-pri px-4 text-sm font-bold text-white transition-colors hover:bg-pri-dark"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
