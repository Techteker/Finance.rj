import { ReactNode, useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Bell, ChevronLeft, Heart, Home, LayoutGrid, Search, Tag, User } from 'lucide-react';
import { getProductMenu } from '../lib/api';
import { useAsync } from '../hooks/useAsync';
import { Icon } from './Icon';

export function Logo({ className = '' }: { className?: string }) {
  return <Link to="/" aria-label="FORWORD home" className={`text-[22px] font-bold tracking-tight ${className}`}>FOR<span className="text-pri-dark">WORD</span></Link>;
}

const TABS = [
  { to: '/', label: 'Home', Icon: Home, end: true },
  { to: '/offers', label: 'Offers', Icon: Tag },
  { to: '/category', label: 'Category', Icon: LayoutGrid },
  { to: '/favorites', label: 'Favorite', Icon: Heart },
  { to: '/profile', label: 'Profile', Icon: User },
];

export function BottomNav() {
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white pb-safe pt-2 md:hidden">
      <ul className="mx-auto flex max-w-md">
        {TABS.map(({ to, label, Icon: I, end }) => (
          <li key={to} className="flex-1">
            <NavLink to={to} end={end} className={({ isActive }) => `flex flex-col items-center gap-1 py-1 text-[11px] ${isActive ? 'font-bold text-pri-dark' : 'font-medium text-slate'}`}>
              <I size={24} aria-hidden />{label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function MegaMenu() {
  const [open, setOpen] = useState(false);
  const categories = useAsync(getProductMenu, []);
  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <NavLink to="/category" className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? 'text-pri-dark' : 'text-ink'}`} aria-haspopup="true" aria-expanded={open}>Category</NavLink>
      {open && (
        <div className="absolute left-1/2 top-full z-50 w-[860px] max-w-[92vw] -translate-x-1/2 rounded-2xl border border-line bg-white p-5 shadow-card">
          <div className="grid grid-cols-4 gap-x-6 gap-y-5">
            {(categories.data ?? []).map((c) => (
              <div key={c.slug}>
                <Link to={`/category/${c.slug}`} onClick={() => setOpen(false)} className="mb-1.5 flex items-center gap-2 text-sm font-bold text-pri-dark"><Icon name={c.icon} size={16} />{c.label}</Link>
                <ul className="space-y-1">{c.subs.slice(0, 6).map((s) => <li key={s.slug}><Link onClick={() => setOpen(false)} to={`/${c.slug}/${s.slug}`} className="text-[13px] text-slate hover:text-ink">{s.label}</Link></li>)}</ul>
              </div>
            ))}
            <div>
              <Link to="/calculators" onClick={() => setOpen(false)} className="mb-1.5 flex items-center gap-2 text-sm font-bold text-pri-dark"><Icon name="calc" size={16} />Financial Tools</Link>
              <ul className="space-y-1">{['emi-calculator', 'sip-calculator', 'fd-calculator', 'income-tax-calculator'].map((s) => <li key={s}><Link onClick={() => setOpen(false)} to={`/calculators/${s}`} className="text-[13px] text-slate hover:text-ink">{s.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())}</Link></li>)}</ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function TopNav() {
  return (
    <header className="sticky top-0 z-40 hidden border-b border-line bg-white/95 backdrop-blur md:block">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-6 px-4">
        <Logo />
        <nav aria-label="Primary" className="flex flex-1 items-center gap-1">
          {TABS.filter((t) => t.to !== '/category').map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? 'text-pri-dark' : 'text-ink'}`}>{label}</NavLink>
          ))}
          <MegaMenu />
        </nav>
        <Link to="/search" aria-label="Search" className="rounded-full bg-surface p-2.5"><Search size={20} /></Link>
        <Link to="/notifications" aria-label="Notifications" className="rounded-full bg-surface p-2.5"><Bell size={20} /></Link>
      </div>
    </header>
  );
}

export function Page({ title, back, right, logo, tab, cta, children, big, wide }: { title?: string; back?: boolean; right?: ReactNode; logo?: boolean; tab?: boolean; cta?: ReactNode; children: ReactNode; big?: boolean; wide?: boolean }) {
  const nav = useNavigate();
  useEffect(() => { document.title = title ? `${title} | FORWORD` : 'FORWORD: Indian finance, made clear'; window.scrollTo(0, 0); }, [title]);
  return (
    <div className="min-h-screen bg-white">
      <TopNav />
      <div className={`mx-auto w-full px-4 ${wide ? 'max-w-5xl' : 'max-w-3xl'}`}>
        <div className="flex items-center gap-3 pb-3 pt-[max(env(safe-area-inset-top),12px)] md:pt-5">
          {back && <button onClick={() => (window.history.length > 1 ? nav(-1) : nav('/'))} aria-label="Go back" className="rounded-full bg-surface p-2"><ChevronLeft size={20} /></button>}
          {logo ? <Logo className="flex-1 md:hidden" /> : <h1 className={`flex-1 font-bold ${big ? 'text-2xl' : 'text-lg md:text-2xl'}`}>{title}</h1>}
          {logo && <span className="hidden flex-1 md:block" />}
          <div className="flex items-center gap-2">{logo && <><Link to="/search" aria-label="Search" className="rounded-full bg-surface p-2 md:hidden"><Search size={20} /></Link><Link to="/notifications" aria-label="Notifications" className="rounded-full bg-surface p-2 md:hidden"><Bell size={20} /></Link></>}{right}</div>
        </div>
        <main className={`space-y-4 ${cta ? 'pb-28' : tab ? 'pb-28 md:pb-10' : 'pb-10'}`}>{children}</main>
      </div>
      {cta ? <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white px-4 pb-safe pt-3"><div className="mx-auto max-w-3xl">{cta}</div></div> : tab ? <BottomNav /> : null}
    </div>
  );
}
