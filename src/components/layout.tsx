import { ReactNode, useCallback, useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronLeft, Globe, Heart, Home, LayoutGrid, Menu, Search, Tag, User } from 'lucide-react';
import { CATEGORIES } from '../lib/menu';
import { applySeo, type SeoConfig } from '../lib/seo';
import { useAuth } from '../hooks/auth';
import { useI18n } from '../hooks/i18n';
import type { TranslationKey } from '../lib/i18n';
import { Icon } from './Icon';
import { SideMenuDrawer } from './SideMenuDrawer';
import { Btn, EmptyState, Skeleton } from './ui';

export function Logo({ className = '' }: { className?: string }) {
  return <Link to="/" aria-label="FORWORD home" className={`text-[22px] font-bold tracking-tight ${className}`}>FOR<span className="text-pri-dark">WORD</span></Link>;
}

const TABS: { to: string; key: TranslationKey; Icon: typeof Home; end?: boolean }[] = [
  { to: '/', key: 'nav.home', Icon: Home, end: true },
  { to: '/offers', key: 'nav.offers', Icon: Tag },
  { to: '/category', key: 'nav.category', Icon: LayoutGrid },
  { to: '/favorites', key: 'nav.favorite', Icon: Heart },
  { to: '/profile', key: 'nav.profile', Icon: User },
];

function BottomNav() {
  const { t } = useI18n();
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white pb-safe pt-2 md:hidden">
      <ul className="mx-auto flex max-w-md">
        {TABS.map(({ to, key, Icon: I, end }) => (
          <li key={to} className="min-w-0 flex-1">
            <NavLink to={to} end={end} className={({ isActive }) => `flex flex-col items-center gap-1 px-0.5 py-1 text-[11px] leading-tight ${isActive ? 'font-bold text-pri-dark' : 'font-medium text-slate'}`}>
              <I size={22} aria-hidden />
              <span className="max-w-full truncate">{t(key)}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function MegaMenu() {
  const [open, setOpen] = useState(false);
  const { t, tCategory, tCalc } = useI18n();
  const quickCalcs: [string, string][] = [
    ['emi-calculator', 'EMI Calculator'],
    ['sip-calculator', 'SIP Calculator'],
    ['fd-calculator', 'FD Calculator'],
    ['income-tax-calculator', 'Income Tax Calculator'],
  ];
  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <NavLink to="/category" className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? 'text-pri-dark' : 'text-ink'}`} aria-haspopup="true" aria-expanded={open}>{t('nav.category')}</NavLink>
      {open && (
        <div className="absolute left-1/2 top-full z-50 w-[860px] max-w-[92vw] -translate-x-1/2 rounded-2xl border border-line bg-white p-5 shadow-card">
          <div className="grid grid-cols-4 gap-x-6 gap-y-5">
            {CATEGORIES.map((c) => (
              <div key={c.slug}>
                <Link to={`/category/${c.slug}`} onClick={() => setOpen(false)} className="mb-1.5 flex items-center gap-2 text-sm font-bold text-pri-dark"><Icon name={c.icon} size={16} />{tCategory(c.slug, c.label)}</Link>
                <ul className="space-y-1">{c.subs.slice(0, 6).map((s) => <li key={s.slug}><Link onClick={() => setOpen(false)} to={`/${c.slug}/${s.slug}`} className="text-[13px] text-slate hover:text-ink">{s.label}</Link></li>)}</ul>
              </div>
            ))}
            <div>
              <Link to="/calculators" onClick={() => setOpen(false)} className="mb-1.5 flex items-center gap-2 text-sm font-bold text-pri-dark"><Icon name="calc" size={16} />{t('nav.financialTools')}</Link>
              <ul className="space-y-1">{quickCalcs.map(([slug, fallback]) => <li key={slug}><Link onClick={() => setOpen(false)} to={`/calculators/${slug}`} className="text-[13px] text-slate hover:text-ink">{tCalc(slug, fallback)}</Link></li>)}</ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TopNav({ onOpenMenu, menuOpen }: { onOpenMenu: () => void; menuOpen: boolean }) {
  const { t, langMeta } = useI18n();
  return (
    <header className="sticky top-0 z-40 hidden border-b border-line bg-white/95 backdrop-blur md:block">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open menu"
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface hover:text-pri-dark"
        >
          <Menu size={22} aria-hidden />
        </button>
        <Logo />
        <nav aria-label="Primary" className="flex flex-1 items-center gap-1">
          {TABS.filter((tabItem) => tabItem.to !== '/category').map(({ to, key, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? 'text-pri-dark' : 'text-ink'}`}>{t(key)}</NavLink>
          ))}
          <MegaMenu />
        </nav>
        <Link to="/settings/language" aria-label={t('lang.switchAria', { name: langMeta.name })} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface px-3 py-2 text-xs font-bold text-ink transition-colors hover:bg-mint hover:text-pri-dark">
          <Globe size={16} aria-hidden />
          <span>{langMeta.shortLabel}</span>
        </Link>
        <Link to="/search" aria-label={t('nav.search')} className="rounded-full bg-surface p-2.5"><Search size={20} /></Link>
        <Link to="/notifications" aria-label={t('nav.notifications')} className="rounded-full bg-surface p-2.5"><Bell size={20} /></Link>
      </div>
    </header>
  );
}

export function Page({ title, back, right, logo, tab, cta, children, big, wide, seo }: { title?: string; back?: boolean; right?: ReactNode; logo?: boolean; tab?: boolean; cta?: ReactNode; children: ReactNode; big?: boolean; wide?: boolean; seo?: SeoConfig }) {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const { t, langMeta } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const seoKey = JSON.stringify(seo ?? null);
  useEffect(() => {
    applySeo({ title, canonicalPath: pathname, ...seo });
  }, [title, pathname, seoKey]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className="min-h-screen bg-white">
      <TopNav onOpenMenu={() => setMenuOpen(true)} menuOpen={menuOpen} />
      <SideMenuDrawer open={menuOpen} onClose={closeMenu} />
      <div className={`mx-auto w-full px-4 ${wide ? 'max-w-5xl' : 'max-w-3xl'}`}>
        <div className="flex items-center gap-2.5 pb-3 pt-1 md:pt-5">
          {back && <button onClick={() => (window.history.length > 1 ? nav(-1) : nav('/'))} aria-label={t('nav.back')} className="shrink-0 rounded-full bg-surface p-2"><ChevronLeft size={20} /></button>}
          {logo && (
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              className="-ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface hover:text-pri-dark md:hidden"
            >
              <Menu size={22} aria-hidden />
            </button>
          )}
          {logo ? <Logo className="flex-1 md:hidden" /> : <h1 className={`min-w-0 flex-1 font-bold ${big ? 'text-2xl' : 'text-lg md:text-2xl'}`}>{title}</h1>}
          {logo && <span className="hidden flex-1 md:block" />}
          <div className="flex shrink-0 items-center gap-2">
            {logo && (
              <>
                <Link to="/settings/language" aria-label={t('lang.switchAria', { name: langMeta.name })} className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-2 text-xs font-bold text-ink md:hidden">
                  <Globe size={16} aria-hidden />
                  <span>{langMeta.shortLabel}</span>
                </Link>
                <Link to="/search" aria-label={t('nav.search')} className="rounded-full bg-surface p-2 md:hidden"><Search size={20} /></Link>
                <Link to="/notifications" aria-label={t('nav.notifications')} className="rounded-full bg-surface p-2 md:hidden"><Bell size={20} /></Link>
              </>
            )}
            {right}
          </div>
        </div>
        <main className={`space-y-4 ${cta ? 'pb-28' : tab ? 'pb-28 md:pb-10' : 'pb-10'}`}>{children}</main>
      </div>
      {cta ? <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white px-4 pb-safe pt-3"><div className="mx-auto max-w-3xl">{cta}</div></div> : tab ? <BottomNav /> : null}
    </div>
  );
}

/** Shared login-required gate for protected screens (Profile, Favorites, Rewards, Password). */
export function AuthGate({
  title,
  icon = 'user',
  emptyTitle,
  emptyText,
  back = true,
  tab = false,
  big = false,
  showRegister = false,
  children,
}: {
  title: string;
  icon?: string;
  emptyTitle?: string;
  emptyText?: string;
  back?: boolean;
  tab?: boolean;
  big?: boolean;
  showRegister?: boolean;
  children: (uid: string) => ReactNode;
}) {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  if (loading) return <Page title={title} back={back} big={big} tab={tab} seo={{ noIndex: true }}><Skeleton rows={2} /></Page>;
  if (!user) {
    return (
      <Page title={title} back={back} big={big} tab={tab} seo={{ noIndex: true }}>
        <EmptyState
          icon={icon}
          title={emptyTitle ?? t('auth.loginToContinue')}
          text={emptyText ?? t('auth.loginToContinueText')}
          action={showRegister ? <div className="space-y-2.5"><Btn to="/login">{t('auth.login')}</Btn><Btn to="/register" variant="outline">{t('auth.createAccount')}</Btn></div> : <Btn to="/login">{t('auth.login')}</Btn>}
        />
      </Page>
    );
  }
  return <>{children(user.$id)}</>;
}
