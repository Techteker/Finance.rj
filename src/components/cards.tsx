import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Check, Image as ImageIcon } from 'lucide-react';
import type { News, Offer, Product } from '../types';
import { parseFacts, safeMediaUrl, shortDate, timeAgo } from '../lib/format';
import { useCompare, useFavorites } from '../hooks/app';
import { useI18n } from '../hooks/i18n';
import { Btn } from './ui';

export function Thumb({ src, alt = '', className = '' }: { src?: string; alt?: string; className?: string }) {
  const safeSrc = safeMediaUrl(src);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [safeSrc]);
  return safeSrc && !failed
    ? <img src={safeSrc} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} className={`object-cover ${className}`} />
    : <span className={`flex items-center justify-center bg-mint text-pri/40 ${className}`}><ImageIcon size={28} /></span>;
}

export function SaveButton({ type, id, title, subtitle, imageUrl, href, className = '' }: { type: import('../types').FavType; id: string; title: string; subtitle?: string; imageUrl?: string; href: string; className?: string }) {
  const { isSaved, toggle } = useFavorites();
  const on = isSaved(type, id);
  return (
    <button aria-pressed={on} aria-label={on ? 'Remove from Favorites' : 'Save to Favorites'} onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(type, id, { title, subtitle, imageUrl, href }); }} className={`p-1 ${on ? 'text-pri-dark' : 'text-slate'} ${className}`}>
      <Bookmark size={18} fill={on ? 'currentColor' : 'none'} />
    </button>
  );
}

export function NewsCard({ n }: { n: News }) {
  return (
    <Link to={`/news/${n.slug}`} className="flex gap-3 rounded-card border border-line bg-white p-3">
      <Thumb src={n.imageUrl} alt={n.title} className="h-[84px] w-[84px] shrink-0 rounded-xl" />
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold text-pri-dark">{n.categoryName}{n.isSponsored ? ' · Sponsored' : ''}</span>
        <span className="mt-1 line-clamp-2 block text-sm font-semibold leading-snug">{n.title}</span>
        <span className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate">
          <span className="min-w-0 flex-1 truncate">{n.publisher} · {timeAgo(n.publishedAt)} · {n.readTime} min read</span>
          <SaveButton type="news" id={n.$id} title={n.title} subtitle={n.publisher} imageUrl={n.imageUrl} href={`/news/${n.slug}`} />
        </span>
      </span>
    </Link>
  );
}

export function FeaturedCard({ n }: { n: News }) {
  const { t, tNewsCategory } = useI18n();
  return (
    <Link to={`/news/${n.slug}`} className="block overflow-hidden rounded-card border border-line bg-white">
      <Thumb src={n.imageUrl} alt={n.title} className="h-44 w-full md:h-64" />
      <span className="block space-y-1.5 p-3.5">
        <span className="block text-[11px] font-semibold text-pri-dark">{t('news.topStory')} · {tNewsCategory(n.categorySlug, n.categoryName)}</span>
        <span className="block text-lg font-bold leading-snug">{n.title}</span>
        <span className="block text-xs text-slate">{n.publisher} · {timeAgo(n.publishedAt)} · {n.readTime} min read</span>
      </span>
    </Link>
  );
}

export function ProductCard({ p, compare = true }: { p: Product; compare?: boolean }) {
  const cmp = useCompare();
  const { t } = useI18n();
  const facts = parseFacts(p.facts).slice(0, 3);
  return (
    <article className="space-y-3 rounded-card border border-line bg-white p-4 shadow-card">
      <div className="flex items-center gap-3">
        <Thumb src={p.bankLogo} alt={p.bankName} className="h-11 w-11 shrink-0 rounded-xl bg-mint" />
        <Link to={`/product/${p.slug}`} className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">{p.name}</span>
          <span className="block text-xs text-slate">{p.bankName || 'Partner'}{p.subcategory ? ` · ${p.subcategory.replace(/-/g, ' ')}` : ''}</span>
        </Link>
        <SaveButton type="product" id={p.$id} title={p.name} subtitle={p.bankName} imageUrl={p.bankLogo} href={`/product/${p.slug}`} />
      </div>
      {facts.length > 0 && (
        <dl className="space-y-2 rounded-xl bg-surface p-3">
          {facts.map(([k, v]) => <div key={k} className="flex justify-between gap-3 text-[13px]"><dt className="text-slate">{k}</dt><dd className="text-right font-semibold">{v || t('common.notAvailable')}</dd></div>)}
        </dl>
      )}
      <div className="flex gap-2.5">
        {compare && <Btn variant={cmp.has(p.$id) ? 'primary' : 'outline'} onClick={() => cmp.toggle(p.$id)} aria-pressed={cmp.has(p.$id)} icon={cmp.has(p.$id) ? <Check size={16} /> : undefined}>{cmp.has(p.$id) ? t('common.added') : t('common.compare')}</Btn>}
        <Btn to={`/go/${p.slug}`}>{t('common.applyNow')}</Btn>
      </div>
      <p className="text-[10px] text-slate">Updated {shortDate(p.verifiedAt)} · Partner link: FORWORD may earn a commission. <Link to="/disclosure" className="underline">{t('common.disclosure')}</Link></p>
    </article>
  );
}

export function OfferCard({ o }: { o: Offer }) {
  return (
    <article className="relative min-w-0 overflow-hidden rounded-[20px] border border-line bg-white shadow-card">
      <Link to={`/offers/${o.$id}`} className="flex min-h-[166px] flex-col items-center justify-center gap-2.5 px-3 py-4 text-center">
        <Thumb src={o.brandLogo} alt={o.brandName} className="h-[68px] w-[68px] rounded-2xl border border-line bg-white p-2 object-contain" />
        <span className="text-[17px] font-extrabold leading-tight text-pri-dark">{o.discount}</span>
        <span className="line-clamp-2 text-[13px] font-semibold leading-snug">{o.brandName}</span>
      </Link>
      <SaveButton type="offer" id={o.$id} title={o.title} subtitle={o.brandName} imageUrl={o.brandLogo} href={`/offers/${o.$id}`} className="absolute right-2 top-2 rounded-full bg-white/90 p-2 shadow-sm" />
    </article>
  );
}

export function CompareBar() {
  const { ids } = useCompare();
  const { t } = useI18n();
  if (!ids.length) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white px-4 pb-safe pt-3">
      <div className="mx-auto max-w-3xl">{ids.length < 2 ? <Btn disabled>{t('common.selectOneMore')}</Btn> : <Btn to={`/compare?ids=${ids.join(',')}`}>{t('common.compareCount', { count: ids.length })}</Btn>}</div>
    </div>
  );
}
