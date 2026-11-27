import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import { searchAll, getTrendingTerms } from '../lib/api';
import { CALCS } from '../lib/calc';
import { CATEGORIES } from '../lib/menu';
import { useAsync, useDebounced, useLocalList } from '../hooks/useAsync';
import { useI18n } from '../hooks/i18n';
import { Page } from '../components/layout';
import { Btn, Chips, EmptyState, ErrorState, Field, ListRow, SectionHeader, Skeleton } from '../components/ui';
import { NewsCard, OfferCard, ProductCard } from '../components/cards';

export function SearchBox() {
  const nav = useNavigate();
  const { t } = useI18n();
  return (
    <button onClick={() => nav('/search')} className="flex w-full items-center gap-2.5 rounded-[14px] border border-line bg-surface px-3.5 py-3 text-left text-sm text-slate"><SearchIcon size={20} />{t('search.boxPlaceholder')}</button>
  );
}

export function SearchPage() {
  const { t, tCategory, tCalc } = useI18n();
  const [sp, setSp] = useSearchParams();
  const q = sp.get('q') ?? '';
  const [input, setInput] = useState(q);
  useEffect(() => { setInput(q); }, [q]);
  const debounced = useDebounced(input, 350);
  const [tab, setTab] = useState(0);
  const [recent, addRecent, clearRecent] = useLocalList('forword:recent-searches');
  const trending = useAsync(getTrendingTerms, []);
  const trimmedQ = q.trim();
  const active = trimmedQ.length >= 2 && input.trim() === trimmedQ ? trimmedQ : debounced.trim().length >= 2 ? debounced.trim() : '';
  const res = useAsync(() => (active ? searchAll(active) : Promise.resolve(null)), [active]);
  const calcs = active ? CALCS.filter((c) => c.title.toLowerCase().includes(active.toLowerCase()) || tCalc(c.slug, c.title).toLowerCase().includes(active.toLowerCase())) : [];
  const cats = active ? CATEGORIES.filter((c) => c.label.toLowerCase().includes(active.toLowerCase()) || tCategory(c.slug, c.label).toLowerCase().includes(active.toLowerCase()) || c.subs.some((s) => s.label.toLowerCase().includes(active.toLowerCase()))) : [];
  const submit = (e?: FormEvent) => { e?.preventDefault(); if (input.trim().length >= 2) { addRecent(input.trim()); setSp({ q: input.trim() }); } };
  const d = res.data;
  const total = (d?.news.length ?? 0) + (d?.products.length ?? 0) + (d?.offers.length ?? 0) + calcs.length + cats.length;
  const tabs = [t('common.all'), t('news.tabNews'), t('search.tabProducts'), t('nav.offers'), t('news.tabGuides'), t('search.tabCalculators')];
  return (
    <Page title={active ? `${t('nav.search')}: ${active}` : t('nav.search')} back wide seo={{ noIndex: true, description: 'Search Indian financial news, credit cards, loans, offers, and money calculators on FORWORD.' }} right={<Btn to="/search/advanced" variant="ghost" full={false} className="!px-2 !py-1.5 text-sm">{t('common.advanced')}</Btn>}>
      <form onSubmit={submit} role="search"><Field label={t('nav.search')} autoFocus value={input} onChange={(e) => setInput(e.target.value)} icon={<SearchIcon size={18} />} placeholder={t('search.placeholder')} /></form>
      {!active ? (
        <>
          {recent.length > 0 && <><div className="flex items-center justify-between"><h2 className="text-[17px] font-bold">{t('search.recent')}</h2><button type="button" onClick={clearRecent} className="text-[13px] font-semibold text-pri-dark">{t('common.clear')}</button></div>{recent.map((r) => <ListRow key={r} icon="clock" title={r} onClick={() => { setInput(r); setSp({ q: r }); }} right="none" />)}</>}
          {(trending.data?.length ?? 0) > 0 && <><SectionHeader title={t('search.trending')} /><div className="flex flex-wrap gap-2">{trending.data!.map((item) => <button type="button" key={item.$id} onClick={() => { setInput(item.name); setSp({ q: item.name }); }} className="rounded-full border border-line bg-surface px-3.5 py-2 text-[13px] font-medium">{item.name}</button>)}</div></>}
        </>
      ) : res.loading ? <Skeleton rows={3} /> : res.error ? <ErrorState text={res.error} onRetry={res.reload} /> : total === 0 ? (
        <EmptyState icon="news" title={t('search.noResults')} text={t('search.noResultsText')} action={<Btn to="/category">{t('common.browseCategories')}</Btn>} />
      ) : (
        <>
          <Chips items={tabs} value={tab} onChange={setTab} />
          {[0, 1].includes(tab) && (d?.news ?? []).map((n) => <NewsCard key={n.$id} n={n} />)}
          {[0, 2].includes(tab) && (d?.products ?? []).map((p) => <ProductCard key={p.$id} p={p} />)}
          {[0, 3].includes(tab) && (d?.offers ?? []).map((o) => <OfferCard key={o.$id} o={o} />)}
          {[0, 4].includes(tab) && cats.map((c) => <ListRow key={c.slug} to={`/category/${c.slug}`} icon={c.icon} title={tCategory(c.slug, c.label)} sub={t('nav.category')} />)}
          {[0, 5].includes(tab) && calcs.map((c) => <ListRow key={c.slug} to={`/calculators/${c.slug}`} icon={c.icon} title={tCalc(c.slug, c.title)} sub={t('cat.calculators')} />)}
        </>
      )}
    </Page>
  );
}

export function AdvancedSearch() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [kw, setKw] = useState('');
  return (
    <Page title={t('search.advancedTitle')} back seo={{ noIndex: true }} cta={<Btn disabled={kw.trim().length < 2} onClick={() => nav(`/search?q=${encodeURIComponent(kw.trim())}`)}>{t('search.showResults')}</Btn>}>
      <Field label={t('search.keyword')} value={kw} onChange={(e) => setKw(e.target.value)} icon={<SearchIcon size={18} />} placeholder={t('nav.search')} />
      <p className="text-sm text-slate">Use the tabs on the results page to narrow by news, products, offers, guides or calculators.</p>
    </Page>
  );
}
