import { useState } from 'react';
import { ExternalLink, Info, Search, ShieldCheck } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { OFFER_CATEGORIES } from '../lib/menu';
import { getBrand, getOffer, getOffers, isOfferActive } from '../lib/api';
import { safeUrl, shortDate } from '../lib/format';
import { useAsync } from '../hooks/useAsync';
import { useI18n } from '../hooks/i18n';
import { Page } from '../components/layout';
import { Async, Btn, Chips, EmptyState, ErrorState, Skeleton } from '../components/ui';
import { OfferCard, SaveButton, Thumb } from '../components/cards';
import {
  buildBrandJsonLd,
  buildCollectionJsonLd,
  buildItemListJsonLd,
  buildOfferCategoryKeywords,
  buildOfferJsonLd,
  buildOfferKeywords,
} from '../lib/seo';
import { NotFound } from './utility';

export function Offers() {
  const { t, tOfferCategory } = useI18n();
  const { cat = 'all' } = useParams();
  const idx = Math.max(0, OFFER_CATEGORIES.findIndex((c) => c.slug === cat));
  const [q, setQ] = useState('');
  const state = useAsync(() => getOffers({ category: OFFER_CATEGORIES[idx].slug }), [idx]);
  const shown = state.data?.filter((o) => `${o.title ?? ''} ${o.brandName ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()));
  const navigate = useNavigate();
  const nav = (i: number) => navigate(i === 0 ? '/offers' : `/offers/category/${OFFER_CATEGORIES[i].slug}`);
  const activeCat = OFFER_CATEGORIES[idx];
  const categoryLabelEn = activeCat?.label ?? 'All offers';
  const categoryLabel = activeCat ? tOfferCategory(activeCat.slug, activeCat.label) : t('common.all');

  const offersTitle = idx === 0 ? 'Finance Offers & Cashback Deals' : `${categoryLabelEn} Offers & Deals`;
  const offersDesc = `Discover curated ${categoryLabelEn.toLowerCase()} finance offers, credit card discounts, and cashback deals across top Indian brands on FORWORD.`;
  const offersPath = idx === 0 ? '/offers' : `/offers/category/${OFFER_CATEGORIES[idx].slug}`;
  const origin = window.location.origin;
  const offerSchemas: Record<string, unknown>[] = [
    buildCollectionJsonLd(origin, { name: offersTitle, description: offersDesc, path: offersPath }),
  ];
  if (shown?.length) {
    offerSchemas.push(
      buildItemListJsonLd(origin, {
        name: offersTitle,
        path: offersPath,
        items: shown.slice(0, 15).map((item) => ({ name: `${item.brandName} – ${item.title}`, path: `/offers/${item.$id}`, image: item.imageUrl || item.brandLogo })),
      }),
    );
  }
  return (
    <Page
      title={t('nav.offers')}
      big
      tab
      wide
      seo={{
        title: offersTitle,
        description: offersDesc,
        keywords: buildOfferCategoryKeywords(OFFER_CATEGORIES[idx].slug),
        breadcrumbs: idx === 0
          ? [{ name: 'Home', path: '/' }, { name: 'Offers', path: '/offers' }]
          : [{ name: 'Home', path: '/' }, { name: 'Offers', path: '/offers' }, { name: categoryLabelEn, path: offersPath }],
        jsonLd: offerSchemas,
      }}
    >
      <label className="flex items-center gap-2.5 rounded-[14px] border border-line bg-surface px-3.5 py-3">
        <Search size={20} className="text-slate" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('offers.searchPlaceholder')} aria-label={t('offers.searchPlaceholder')} className="flex-1 bg-transparent text-sm outline-none" />
      </label>
      <Chips items={OFFER_CATEGORIES.map((c) => tOfferCategory(c.slug, c.label))} value={idx} onChange={nav} />
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold">{categoryLabel}</h3>
          <p className="text-[11px] text-slate">{t('offers.browseDeals')}</p>
        </div>
        {shown && <span className="rounded-full bg-mint px-2.5 py-1 text-[11px] font-semibold text-pri-dark">{t('offers.count', { count: shown.length })}</span>}
      </div>
      <Async state={{ ...state, data: shown }} empty={<EmptyState icon="tag" title={t('offers.noneTitle')} text={t('offers.noneText')} action={<Btn to="/category">{t('common.browseCategories')}</Btn>} />}>
        {(items) => <div className="grid grid-cols-2 gap-3">{items.map((o) => <OfferCard key={o.$id} o={o} />)}</div>}
      </Async>
    </Page>
  );
}

export function OfferDetail() {
  const { t } = useI18n();
  const { id = '' } = useParams();
  const state = useAsync(() => getOffer(id), [id]);
  const o = state.data;
  if (state.loading) return <Page title={t('offers.details')} back><Skeleton rows={2} /></Page>;
  if (state.error || !o) return state.error ? <Page title={t('offers.details')} back><ErrorState text={state.error} onRetry={state.reload} /></Page> : <NotFound />;
  const url = safeUrl(o.externalUrl);
  const active = isOfferActive(o.validTill);

  const offerDesc = o.description || `Claim ${o.discount} from ${o.brandName} on FORWORD. Check offer validity, eligibility, and terms before applying.`;
  return (
    <Page
      title={t('offers.details')}
      back
      seo={{
        title: `${o.title} – ${o.brandName}`,
        description: offerDesc,
        keywords: buildOfferKeywords({ title: o.title, brandName: o.brandName, category: o.category, discount: o.discount }),
        image: o.imageUrl || o.brandLogo,
        imageAlt: `${o.title} by ${o.brandName}`,
        breadcrumbs: [{ name: 'Home', path: '/' }, { name: 'Offers', path: '/offers' }, { name: o.title, path: `/offers/${o.$id}` }],
        jsonLd: buildOfferJsonLd(window.location.origin, {
          id: o.$id,
          title: o.title,
          description: offerDesc,
          brandName: o.brandName,
          discount: o.discount,
          validTill: o.validTill,
          imageUrl: o.imageUrl || o.brandLogo,
          category: o.category,
          active,
        }),
      }}
      right={<SaveButton type="offer" id={o.$id} title={o.title} subtitle={o.brandName} imageUrl={o.brandLogo} href={`/offers/${o.$id}`} className="rounded-full bg-surface !p-2" />}
    >
      <div className="overflow-hidden rounded-[24px] border border-line bg-white shadow-card">
        <div className="relative">
          <Thumb src={o.imageUrl || o.brandLogo} alt={o.title} className="h-64 w-full md:h-80" />
          <span className="absolute left-4 top-4 rounded-xl bg-gold px-3 py-2 text-base font-extrabold shadow-sm">{o.discount}</span>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-4 pb-4 pt-12">
            <Link to={`/brands/${o.brandId}`} className="flex items-center gap-3 hover:underline">
              <Thumb src={o.brandLogo} alt={o.brandName} className="h-12 w-12 rounded-xl border border-white/70 bg-white p-1 object-contain" />
              <span className="text-lg font-bold text-white">{o.brandName}</span>
            </Link>
          </div>
        </div>
        <div className="space-y-3 p-4">
          <h2 className="text-xl font-extrabold leading-tight">{o.title}</h2>
          <p className="text-sm leading-relaxed text-slate">{o.description || `${o.discount} offer from ${o.brandName}.`}</p>
          <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-3 text-xs text-slate">
            <Info size={16} className="shrink-0 text-pri-dark" />
            <span>{t('offers.validTill')} <strong className="text-ink">{shortDate(o.validTill)}</strong></span>
          </div>
        </div>
      </div>

      <section className="space-y-2 rounded-[18px] border border-line bg-white p-4">
        <h3 className="text-base font-bold">{t('offers.details')}</h3>
        <p className="whitespace-pre-line text-sm leading-relaxed text-slate">{o.description || `Explore this ${o.discount} offer directly with ${o.brandName}. Offer availability and eligibility may vary.`}</p>
      </section>

      {o.terms?.length ? (
        <section className="space-y-3 rounded-[18px] border border-line bg-white p-4">
          <h3 className="text-base font-bold">{t('offers.terms')}</h3>
          <ul className="list-disc space-y-2 pl-5 text-[13px] leading-relaxed text-slate">{o.terms.map((term) => <li key={term}>{term}</li>)}</ul>
        </section>
      ) : null}

      <div className="sticky bottom-16 z-20 rounded-2xl border border-line bg-white p-3 shadow-card">
        {!active ? (
          <Btn disabled>{t('offers.expired')}</Btn>
        ) : url ? (
          <Btn href={url}>{t('offers.claim')} <ExternalLink size={16} /></Btn>
        ) : (
          <Btn disabled>{t('offers.unavailable')}</Btn>
        )}
        <p className="mt-2 text-center text-[10px] text-slate">
          {active ? `You’ll continue to ${o.brandName} through its partner link. Check the brand’s terms before proceeding.` : 'This offer is no longer active.'}
        </p>
      </div>
      <div className="flex items-start gap-2 rounded-xl bg-surface p-3 text-[11px] leading-relaxed text-slate">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-pri-dark" />
        <span>Offer availability and redemption are subject to the brand's terms. FORWORD may earn a commission from eligible partner links.</span>
      </div>
    </Page>
  );
}

export function BrandDetail() {
  const { id = '' } = useParams();
  const brand = useAsync(() => getBrand(id), [id]);
  const offers = useAsync(() => getOffers({ brandId: id }), [id]);
  if (brand.loading) return <Page title="Brand" back><Skeleton rows={2} /></Page>;
  if (brand.error) return <Page title="Brand" back><ErrorState text={brand.error} onRetry={brand.reload} /></Page>;
  if (!brand.data) return <NotFound />;
  const b = brand.data;
  const brandDesc = b.description || `Browse live ${b.name} financial offers, discounts, and partner deals verified on FORWORD.`;
  const origin = window.location.origin;
  const brandSchemas: Record<string, unknown>[] = [
    buildBrandJsonLd(origin, { id: b.$id, name: b.name, description: brandDesc, logoUrl: b.logoUrl }),
    buildCollectionJsonLd(origin, { name: `${b.name} Offers`, description: brandDesc, path: `/brands/${b.$id}` }),
  ];
  if (offers.data?.length) {
    brandSchemas.push(
      buildItemListJsonLd(origin, {
        name: `${b.name} Active Offers`,
        path: `/brands/${b.$id}`,
        items: offers.data.map((item) => ({ name: item.title, path: `/offers/${item.$id}`, image: item.imageUrl || item.brandLogo })),
      }),
    );
  }
  return (
    <Page
      title={b.name}
      back
      tab
      seo={{
        title: `${b.name} Offers & Deals`,
        description: brandDesc,
        keywords: `${b.name} offers India, ${b.name} credit card discounts, ${b.name} bank deals, FORWORD`,
        image: b.logoUrl,
        imageAlt: b.name,
        breadcrumbs: [{ name: 'Home', path: '/' }, { name: 'Offers', path: '/offers' }, { name: b.name, path: `/brands/${b.$id}` }],
        jsonLd: brandSchemas,
      }}
    >
      <div className="flex flex-col items-center gap-2 rounded-card bg-mint p-4 text-center"><Thumb src={b.logoUrl} alt={`${b.name} logo`} className="h-16 w-16 rounded-2xl bg-white" /><h2 className="text-lg font-bold">{b.name}</h2>{b.description && <p className="text-xs text-slate">{b.description}</p>}</div>
      <Async state={offers} empty={<EmptyState icon="tag" title="No active offers" text="This brand has no live offers right now." />}>{(items) => <div className="space-y-3">{items.map((o) => <OfferCard key={o.$id} o={o} />)}</div>}</Async>
    </Page>
  );
}
