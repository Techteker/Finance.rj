import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { CATEGORIES, findCat, type Cat } from '../lib/menu';
import { CALCS } from '../lib/calc';
import { getNews, getNewsCategories, getProducts } from '../lib/api';
import { useAsync } from '../hooks/useAsync';
import { useI18n } from '../hooks/i18n';
import { Page } from '../components/layout';
import { Icon, IconBadge } from '../components/Icon';
import { Async, Chips, EmptyState, ListRow, SectionHeader } from '../components/ui';
import { NewsCard, ProductCard } from '../components/cards';
import { buildCategoryKeywords, buildCollectionJsonLd, buildItemListJsonLd } from '../lib/seo';
import { NotFound } from './utility';
import { SearchBox } from './search';

function Tile({ to, icon, label }: { to: string; icon: string; label: string }) {
  return <Link to={to} className="flex flex-col items-center gap-2 rounded-card border border-line bg-white p-4 text-center"><IconBadge name={icon} size={48} /><span className="text-[13px] font-semibold leading-snug">{label}</span></Link>;
}

export function CategoryHub() {
  const { t, tCategory } = useI18n();
  const desc = 'Explore Indian finance categories on FORWORD: compare credit cards, savings accounts, loans, health & term insurance, investments, tax guides, and calculators.';
  return (
    <Page
      title={t('nav.category')}
      big
      tab
      wide
      seo={{
        title: 'Finance Categories – Cards, Loans & Insurance',
        description: desc,
        keywords: 'Indian finance categories, credit cards India, savings accounts, personal loans, health insurance, mutual funds, calculators, FORWORD',
        breadcrumbs: [{ name: 'Home', path: '/' }, { name: 'Categories', path: '/category' }],
        jsonLd: [
          buildCollectionJsonLd(window.location.origin, { name: 'FORWORD Finance Categories', description: desc, path: '/category' }),
          buildItemListJsonLd(window.location.origin, {
            name: 'FORWORD Financial Categories',
            path: '/category',
            items: [
              ...CATEGORIES.map((c) => ({ name: c.label, path: `/category/${c.slug}` })),
              { name: 'Financial Calculators', path: '/calculators' },
            ],
          }),
        ],
      }}
    >
      <SearchBox />
      <SectionHeader title={t('cat.exploreAll')} />
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {CATEGORIES.map((c) => <Tile key={c.slug} to={`/category/${c.slug}`} icon={c.icon} label={tCategory(c.slug, c.label)} />)}
        <Tile to="/calculators" icon="calc" label={t('cat.calculators')} />
      </div>
      <SectionHeader title={t('cat.newsCategories')} to="/category/news" />
    </Page>
  );
}

export function AllCategories() {
  const { t, tCategory, tCategoryDesc } = useI18n();
  const desc = 'Browse every financial category on FORWORD including credit cards, banking, loans, insurance, investments, tax planning, government schemes, and calculators.';
  return (
    <Page
      title={t('cat.allCategories')}
      back
      tab
      seo={{
        title: 'All Categories',
        description: desc,
        keywords: 'all finance categories India, banking directory, credit cards, loans, insurance, tax guides, government schemes, FORWORD',
        breadcrumbs: [{ name: 'Home', path: '/' }, { name: 'All Categories', path: '/category/all' }],
        jsonLd: [
          buildCollectionJsonLd(window.location.origin, { name: 'All Finance Categories – FORWORD', description: desc, path: '/category/all' }),
          buildItemListJsonLd(window.location.origin, {
            name: 'All Financial Categories',
            path: '/category/all',
            items: CATEGORIES.map((c) => ({ name: c.label, path: `/category/${c.slug}` })),
          }),
        ],
      }}
    >
      {[...CATEGORIES.map((c) => ({ to: `/category/${c.slug}`, icon: c.icon, label: tCategory(c.slug, c.label), sub: tCategoryDesc(c.slug, c.desc) })), { to: '/calculators', icon: 'calc', label: t('cat.calculators'), sub: t('cat.calculatorsSub') }]
        .map((c) => <ListRow key={c.to} to={c.to} icon={c.icon} title={c.label} sub={c.sub} />)}
    </Page>
  );
}

export function NewsCategoriesGrid() {
  const { t, tNewsCategory } = useI18n();
  const state = useAsync(getNewsCategories, []);
  const desc = 'Explore Indian financial news topics on FORWORD: business, personal finance, banking, stock market, economy, tax, mutual funds, startups, and global finance.';
  return (
    <Page
      title={t('cat.newsCategories')}
      back
      tab
      seo={{
        title: 'Indian Financial News Categories',
        description: desc,
        keywords: 'Indian financial news categories, business news India, banking news, stock market news, economy news, personal finance news, FORWORD',
        breadcrumbs: [{ name: 'Home', path: '/' }, { name: 'News Categories', path: '/category/news' }],
        jsonLd: [
          buildCollectionJsonLd(window.location.origin, { name: 'Indian Financial News Categories', description: desc, path: '/category/news' }),
          ...(state.data?.length
            ? [
                buildItemListJsonLd(window.location.origin, {
                  name: 'Indian Financial News Beats',
                  path: '/category/news',
                  items: state.data.map((c) => ({ name: c.name, path: `/news/category/${c.slug}` })),
                }),
              ]
            : []),
        ],
      }}
    >
      <Async state={state} empty={<EmptyState title={t('news.noNewsYet')} />}>
        {(items) => <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">{items.map((c) => <Tile key={c.slug} to={`/news/category/${c.slug}`} icon={c.icon || 'news'} label={tNewsCategory(c.slug, c.name)} />)}</div>}
      </Async>
    </Page>
  );
}

export function CategoryLanding() {
  const { slug } = useParams();
  const cat = findCat(slug);
  const nav = useNavigate();
  if (!cat) return <NotFound />;
  return <Landing key={cat.slug} cat={cat} go={(s: string) => nav(`/${cat.slug}/${s}`)} />;
}

function Landing({ cat, go }: { cat: Cat; go: (s: string) => void }) {
  const { t, tCategory, tCategoryDesc } = useI18n();
  const featured = useAsync(() => (cat.mode === 'products' ? getProducts({ category: cat.slug, limit: 3 }) : Promise.resolve([])), [cat.slug]);
  const news = useAsync(() => getNews({ category: cat.slug, limit: 3 }), [cat.slug]);
  const localizedLabel = tCategory(cat.slug, cat.label);
  const localizedDesc = tCategoryDesc(cat.slug, cat.desc);
  const catDesc = `${cat.label} in India on FORWORD: ${cat.desc} Compare top verified options, check eligibility, and read expert guides.`;
  return (
    <Page
      title={localizedLabel}
      back
      wide
      seo={{
        title: `${cat.label} in India – Compare & Guides`,
        description: catDesc,
        keywords: buildCategoryKeywords(cat.slug, cat.label),
        breadcrumbs: [{ name: 'Home', path: '/' }, { name: 'Categories', path: '/category' }, { name: cat.label, path: `/category/${cat.slug}` }],
        jsonLd: [
          buildCollectionJsonLd(window.location.origin, { name: `${cat.label} – FORWORD`, description: catDesc, path: `/category/${cat.slug}` }),
          buildItemListJsonLd(window.location.origin, {
            name: `${cat.label} Topics`,
            path: `/category/${cat.slug}`,
            items: cat.subs.map((s) => ({ name: s.label, path: `/${cat.slug}/${s.slug}` })),
          }),
        ],
      }}
      right={<Link to="/search" className="rounded-full bg-surface px-3 py-2 text-sm font-semibold">{t('nav.search')}</Link>}
    >
      <div className="flex items-center gap-3 rounded-card bg-mint p-4"><IconBadge name={cat.icon} size={52} /><div><h2 className="text-lg font-bold">{localizedLabel}</h2><p className="text-xs text-slate">{localizedDesc}</p></div></div>
      <Chips items={cat.subs.map((s) => s.label)} value={0} onChange={(i) => go(cat.subs[i].slug)} />
      {cat.mode === 'products' && (
        <>
          <SectionHeader title={t('cat.featuredProducts')} to={`/${cat.slug}/${cat.subs[0].slug}`} />
          <Async state={featured} empty={<p className="text-sm text-slate">{t('cat.noProducts')}</p>} skeleton={2}>
            {(items) => <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">{items.map((p) => <ProductCard key={p.$id} p={p} />)}</div>}
          </Async>
          <Link to={`/${cat.slug}/${cat.subs.find((s) => s.mode === 'compare')?.slug ?? cat.subs[0].slug}`} className="flex items-center gap-2 rounded-card bg-surface p-3.5 text-sm font-semibold"><Icon name="bars" className="text-pri-dark" />{t('cat.compareSideBySide')}</Link>
        </>
      )}
      <SectionHeader title={t('cat.guidesAndNews')} />
      <Async state={news} empty={<p className="text-sm text-slate">{t('cat.noStories')}</p>} skeleton={2}>{(items) => <div className="space-y-3">{items.map((n) => <NewsCard key={n.$id} n={n} />)}</div>}</Async>
    </Page>
  );
}

export function MenuDrawer() {
  const { t, tCategory } = useI18n();
  const [open, setOpen] = useState<string | null>('credit-cards');
  return (
    <Page title={t('nav.menu')} back tab seo={{ noIndex: true }}>
      {CATEGORIES.map((c) => (
        <div key={c.slug}>
          <ListRow icon={c.icon} title={tCategory(c.slug, c.label)} onClick={() => setOpen(open === c.slug ? null : c.slug)} right={open === c.slug ? <ChevronUp size={18} /> : <ChevronDown size={18} />} />
          {open === c.slug && <ul className="py-1 pl-14">{c.subs.map((s) => <li key={s.slug}><Link to={`/${c.slug}/${s.slug}`} className="block py-2 text-sm">{s.label}</Link></li>)}</ul>}
        </div>
      ))}
      <ListRow icon="calc" title={t('nav.financialTools')} to="/calculators" />
    </Page>
  );
}

export function CalculatorsHub() {
  const { t, tCalc } = useI18n();
  const desc = 'Free Indian financial calculators on FORWORD: calculate loan EMI, mutual fund SIP returns, FD & RD maturity, old vs new regime income tax, retirement corpus, and inflation.';
  return (
    <Page
      title={t('nav.financialTools')}
      back
      tab
      seo={{
        title: 'Financial Calculators India – EMI, SIP, FD & Tax',
        description: desc,
        keywords: 'Indian financial calculators, EMI calculator, SIP calculator, income tax calculator India, FD calculator, RD calculator, PPF calculator, FORWORD',
        breadcrumbs: [{ name: 'Home', path: '/' }, { name: 'Financial Calculators', path: '/calculators' }],
        jsonLd: [
          buildCollectionJsonLd(window.location.origin, { name: 'FORWORD Financial Calculators', description: desc, path: '/calculators' }),
          buildItemListJsonLd(window.location.origin, {
            name: 'Free Indian Financial Calculators',
            path: '/calculators',
            items: CALCS.map((c) => ({ name: c.title, path: `/calculators/${c.slug}` })),
          }),
        ],
      }}
    >
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">{CALCS.map((c) => <Tile key={c.slug} to={`/calculators/${c.slug}`} icon={c.icon} label={tCalc(c.slug, c.title).replace(' Calculator', '')} />)}</div>
    </Page>
  );
}
