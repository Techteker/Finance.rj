import { useState } from 'react';
import { ExternalLink, Info, Search, ShieldCheck } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { OFFER_CATEGORIES } from '../lib/menu';
import { getBrand, getOffer, getOffers } from '../lib/api';
import { safeUrl, shortDate } from '../lib/format';
import { useAsync } from '../hooks/useAsync';
import { Page } from '../components/layout';
import { Async, Btn, Chips, EmptyState, ErrorState, Skeleton } from '../components/ui';
import { OfferCard, SaveButton, Thumb } from '../components/cards';
import { NotFound } from './utility';

export function Offers() {
  const { cat = 'all' } = useParams();
  const idx = Math.max(0, OFFER_CATEGORIES.findIndex((c) => c.slug === cat));
  const [q, setQ] = useState('');
  const state = useAsync(() => getOffers({ category: OFFER_CATEGORIES[idx].slug }), [idx]);
  const shown = state.data?.filter((o) => !q || (o.title + o.brandName).toLowerCase().includes(q.toLowerCase()));
  const navigate = useNavigate();
  const nav = (i: number) => navigate(i === 0 ? '/offers' : `/offers/category/${OFFER_CATEGORIES[i].slug}`);
  const categoryLabel = OFFER_CATEGORIES[idx]?.label ?? 'All offers';

  return (
    <Page title="Offers" big tab wide>
      <Chips items={OFFER_CATEGORIES.map((c) => c.label)} value={idx} onChange={nav} />
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold">{categoryLabel}</h3>
          <p className="text-[11px] text-slate">Browse available deals</p>
        </div>
        {shown && <span className="rounded-full bg-mint px-2.5 py-1 text-[11px] font-semibold text-pri-dark">{shown.length} offers</span>}
      </div>
      <Async state={{ ...state, data: shown }} empty={<EmptyState icon="tag" title="No offers right now" text="Fresh offers will appear here. Check back soon." action={<Btn to="/category">Browse categories</Btn>} />}>
        {(items) => <div className="grid grid-cols-2 gap-3">{items.map((o) => <OfferCard key={o.$id} o={o} />)}</div>}
      </Async>
    </Page>
  );
}

export function OfferDetail() {
  const { id = '' } = useParams();
  const state = useAsync(() => getOffer(id), [id]);
  const o = state.data;
  if (state.loading) return <Page title="Offer" back><Skeleton rows={2} /></Page>;
  if (state.error || !o) return state.error ? <Page title="Offer" back><ErrorState text={state.error} onRetry={state.reload} /></Page> : <NotFound />;
  const url = safeUrl(o.externalUrl);

  return (
    <Page title="Offer details" back right={<SaveButton type="offer" id={o.$id} title={o.title} subtitle={o.brandName} imageUrl={o.brandLogo} href={`/offers/${o.$id}`} className="rounded-full bg-surface !p-2" />}>
      <div className="overflow-hidden rounded-[24px] border border-line bg-white shadow-card">
        <div className="relative">
          <Thumb src={o.imageUrl || o.brandLogo} alt={o.title} className="h-64 w-full md:h-80" />
          <span className="absolute left-4 top-4 rounded-xl bg-gold px-3 py-2 text-base font-extrabold shadow-sm">{o.discount}</span>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-4 pb-4 pt-12">
            <div className="flex items-center gap-3">
              <Thumb src={o.brandLogo} alt={o.brandName} className="h-12 w-12 rounded-xl border border-white/70 bg-white p-1 object-contain" />
              <span className="text-lg font-bold text-white">{o.brandName}</span>
            </div>
          </div>
        </div>
        <div className="space-y-3 p-4">
          <h2 className="text-xl font-extrabold leading-tight">{o.title}</h2>
          <p className="text-sm leading-relaxed text-slate">{o.description || `${o.discount} offer from ${o.brandName}.`}</p>
          <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-3 text-xs text-slate">
            <Info size={16} className="shrink-0 text-pri-dark" />
            <span>Valid till <strong className="text-ink">{shortDate(o.validTill)}</strong></span>
          </div>
        </div>
      </div>

      <section className="space-y-2 rounded-[18px] border border-line bg-white p-4">
        <h3 className="text-base font-bold">Offer details</h3>
        <p className="whitespace-pre-line text-sm leading-relaxed text-slate">{o.description || `Explore this ${o.discount} offer directly with ${o.brandName}. Offer availability and eligibility may vary.`}</p>
      </section>

      {o.terms?.length ? (
        <section className="space-y-3 rounded-[18px] border border-line bg-white p-4">
          <h3 className="text-base font-bold">Terms & conditions</h3>
          <ul className="list-disc space-y-2 pl-5 text-[13px] leading-relaxed text-slate">{o.terms.map((t) => <li key={t}>{t}</li>)}</ul>
        </section>
      ) : null}

      <div className="sticky bottom-16 z-20 rounded-2xl border border-line bg-white p-3 shadow-card">
        {url ? (
          <Btn href={url}>Claim Offer <ExternalLink size={16} /></Btn>
        ) : (
          <Btn disabled>Claim link unavailable</Btn>
        )}
        <p className="mt-2 text-center text-[10px] text-slate">You’ll continue to {o.brandName} through its partner link. Check the brand’s terms before proceeding.</p>
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
  if (brand.error || !brand.data) return <NotFound />;
  const b = brand.data;
  return (
    <Page title={b.name} back tab>
      <div className="flex flex-col items-center gap-2 rounded-card bg-mint p-4 text-center"><Thumb src={b.logoUrl} className="h-16 w-16 rounded-2xl bg-white" /><h2 className="text-lg font-bold">{b.name}</h2>{b.description && <p className="text-xs text-slate">{b.description}</p>}</div>
      <Async state={offers} empty={<EmptyState icon="tag" title="No active offers" text="This brand has no live offers right now." />}>{(items) => <div className="space-y-3">{items.map((o) => <OfferCard key={o.$id} o={o} />)}</div>}</Async>
    </Page>
  );
}
