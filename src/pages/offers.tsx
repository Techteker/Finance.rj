import { useState } from 'react';
import { Check, Copy, ExternalLink, Info, Search, ShieldCheck, Tag } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { OFFER_CATEGORIES } from '../lib/menu';
import { getBrand, getOffer, getOffers } from '../lib/api';
import { safeUrl, shortDate } from '../lib/format';
import { useAsync } from '../hooks/useAsync';
import { useToast } from '../hooks/app';
import { Page } from '../components/layout';
import { Async, Btn, Chips, EmptyState, ErrorState, SectionHeader, Skeleton, useCopy } from '../components/ui';
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
      <div className="space-y-1">
        <h2 className="text-lg font-bold">Discover offers</h2>
        <p className="text-xs text-slate">Handpicked deals, vouchers and rewards from popular brands.</p>
      </div>
      <label className="flex items-center gap-2.5 rounded-[14px] border border-line bg-surface px-3.5 py-3">
        <Search size={20} className="text-slate" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search offers & brands" aria-label="Search offers" className="flex-1 bg-transparent text-sm outline-none" />
      </label>
      <Chips items={OFFER_CATEGORIES.map((c) => c.label)} value={idx} onChange={nav} />
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold">{categoryLabel}</h3>
          <p className="text-[11px] text-slate">Browse available deals</p>
        </div>
        {shown && <span className="rounded-full bg-mint px-2.5 py-1 text-[11px] font-semibold text-pri-dark">{shown.length} offers</span>}
      </div>
      <Async state={{ ...state, data: shown }} empty={<EmptyState icon="tag" title="No offers right now" text="Fresh offers will appear here. Check back soon." action={<Btn to="/category">Browse categories</Btn>} />}>
        {(items) => <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">{items.map((o) => <OfferCard key={o.$id} o={o} />)}</div>}
      </Async>
    </Page>
  );
}

export function OfferDetail() {
  const { id = '' } = useParams();
  const state = useAsync(() => getOffer(id), [id]);
  const { done, copy } = useCopy();
  const toast = useToast();
  const o = state.data;
  if (state.loading) return <Page title="Offer" back><Skeleton rows={2} /></Page>;
  if (state.error || !o) return state.error ? <Page title="Offer" back><ErrorState text={state.error} onRetry={state.reload} /></Page> : <NotFound />;
  const url = safeUrl(o.externalUrl);

  return (
    <Page title="Offer details" back right={<SaveButton type="offer" id={o.$id} title={o.title} subtitle={o.brandName} imageUrl={o.imageUrl} href={`/offers/${o.$id}`} className="rounded-full bg-surface !p-2" />} cta={url ? <Btn href={url}>Claim offer <ExternalLink size={15} /></Btn> : undefined}>
      <div className="overflow-hidden rounded-[22px] border border-line bg-white shadow-card">
        <div className="relative">
          <Thumb src={o.imageUrl} alt={o.title} className="h-52 w-full md:h-72" />
          <span className="absolute left-3 top-3 rounded-xl bg-gold px-3 py-1.5 text-sm font-extrabold shadow-sm">{o.discount}</span>
          <span className="absolute bottom-3 left-3 rounded-lg bg-black/65 px-2.5 py-1 text-[11px] font-semibold text-white">{o.brandName}</span>
        </div>
        <div className="space-y-2.5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-bold leading-tight">{o.title}</h2>
              <Link to={`/brands/${o.brandId}`} className="mt-1 inline-block text-sm font-semibold text-pri-dark">{o.brandName}</Link>
            </div>
            <span className="rounded-xl bg-mint p-2 text-pri-dark"><Tag size={19} /></span>
          </div>
          <p className="text-sm leading-relaxed text-slate">{o.description || 'Explore this offer from the brand and review the applicable terms before claiming.'}</p>
          <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5 text-xs text-slate">
            <Info size={15} className="shrink-0 text-pri-dark" />
            <span>Valid till <strong className="text-ink">{shortDate(o.validTill)}</strong></span>
          </div>
          {o.couponCode && (
            <button onClick={async () => { if (await copy(o.couponCode!)) toast.show('Coupon code copied'); }} className="flex w-full items-center justify-between rounded-xl border border-dashed border-pri bg-mint px-3.5 py-3 text-sm font-bold text-pri-dark">
              <span><span className="mb-0.5 block text-[10px] font-medium text-slate">COUPON CODE</span>{o.couponCode}</span>
              <span className="flex items-center gap-1.5">{done ? <Check size={18} /> : <Copy size={18} />}{done ? 'Copied' : 'Copy'}</span>
            </button>
          )}
        </div>
      </div>

      <section className="space-y-3 rounded-[18px] border border-line bg-white p-4">
        <SectionHeader title="What's inside" />
        <p className="text-sm leading-relaxed text-slate">{o.description || `${o.discount} offer from ${o.brandName}.`}</p>
      </section>

      <section className="space-y-3 rounded-[18px] border border-line bg-white p-4">
        <SectionHeader title="How to redeem" />
        <ol className="space-y-3">
          <li className="flex gap-3 text-sm"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mint text-xs font-bold text-pri-dark">1</span><span className="pt-0.5 text-slate">Tap <strong className="text-ink">Claim offer</strong> to visit the partner website, if a link is available.</span></li>
          <li className="flex gap-3 text-sm"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mint text-xs font-bold text-pri-dark">2</span><span className="pt-0.5 text-slate">Apply the coupon code at checkout when one is provided.</span></li>
          <li className="flex gap-3 text-sm"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mint text-xs font-bold text-pri-dark">3</span><span className="pt-0.5 text-slate">Check the offer validity and terms before completing your purchase.</span></li>
        </ol>
      </section>

      {o.terms?.length ? (
        <section className="space-y-3 rounded-[18px] border border-line bg-white p-4">
          <SectionHeader title="Terms & conditions" />
          <ul className="list-disc space-y-2 pl-5 text-[13px] leading-relaxed text-slate">{o.terms.map((t) => <li key={t}>{t}</li>)}</ul>
        </section>
      ) : null}
      <div className="flex items-start gap-2 rounded-xl bg-surface p-3 text-[11px] leading-relaxed text-slate">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-pri-dark" />
        <span>Offer availability and redemption are subject to the brand's terms. FORWORD does not guarantee third-party offer fulfilment.</span>
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
