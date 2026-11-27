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
import { CATEGORIES, NEWS_CATEGORIES, OFFER_CATEGORIES } from '../lib/menu';
import { CALCS } from '../lib/calc';
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

const CAT_ICONS: Record<string, LucideIcon> = {
  'credit-cards': CreditCard,
  banking: Landmark,
  loans: HandCoins,
  insurance: Shield,
  investments: PieChart,
  'tax-savings': Building2,
  'government-schemes': Briefcase,
};

export function SideMenuDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { pathname } = useLocation();
  const { t, tCategory, tNewsCategory, tOfferCategory, tCalc } = useI18n();
  const { user } = useAuth();
  const [activeId, setActiveId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const sections = useMemo<MenuSection[]>(() => {
    const categorySections: MenuSection[] = CATEGORIES.map((c) => {
      const catLabel = tCategory(c.slug, c.label);
      return {
        id: c.slug,
        label: catLabel,
        Icon: CAT_ICONS[c.slug] ?? Briefcase,
        allLabel: `${t('common.all')} ${catLabel}`,
        allTo: `/category/${c.slug}`,
        items: c.subs.map((sub) => ({
          label: sub.label,
          to: `/${c.slug}/${sub.slug}`,
        })),
      };
    });

    const calculatorsSection: MenuSection = {
      id: 'calculators',
      label: t('nav.financialTools'),
      Icon: Calculator,
      allLabel: `${t('common.all')} ${t('nav.financialTools')}`,
      allTo: '/calculators',
      items: CALCS.map((c) => ({
        label: tCalc(c.slug, c.title),
        to: `/calculators/${c.slug}`,
      })),
    };

    const newsSection: MenuSection = {
      id: 'news',
      label: t('news.tabNews'),
      Icon: Newspaper,
      allLabel: `${t('common.all')} ${t('news.tabNews')}`,
      allTo: '/',
      items: NEWS_CATEGORIES.map((n) => ({
        label: tNewsCategory(n.slug, n.name),
        to: `/news/category/${n.slug}`,
      })),
    };

    const offersSection: MenuSection = {
      id: 'offers',
      label: t('nav.offers'),
      Icon: Tag,
      allLabel: `${t('common.all')} ${t('nav.offers')}`,
      allTo: '/offers',
      items: OFFER_CATEGORIES.filter((o) => o.slug !== 'all').map((o) => ({
        label: tOfferCategory(o.slug, o.label),
        to: `/offers/category/${o.slug}`,
      })),
    };

    return [...categorySections, calculatorsSection, offersSection, newsSection];
  }, [t, tCategory, tNewsCategory, tOfferCategory, tCalc]);

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
