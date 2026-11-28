import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Flag, Link2, Share2 } from 'lucide-react';
import { addHistory, formatApiError, getNews, getNewsBySlug, getNewsCategories, getNotifications, getProductsByIds, reportArticle, type FeedKind } from '../lib/api';
import { safeInternalPath, safeStorageGet, safeStorageSet, safeUrl, shortDate, timeAgo } from '../lib/format';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../hooks/auth';
import { useToast } from '../hooks/app';
import { useI18n } from '../hooks/i18n';
import type { TranslationKey } from '../lib/i18n';
import { Page } from '../components/layout';
import { Async, Btn, Chips, EmptyState, ErrorState, ListRow, Segmented, Sheet, SectionHeader, Skeleton } from '../components/ui';
import { FeaturedCard, NewsCard, ProductCard, SaveButton, Thumb } from '../components/cards';
import {
  buildArticleKeywords,
  buildCollectionJsonLd,
  buildItemListJsonLd,
  buildNewsArticleJsonLd,
  buildWebsiteJsonLd,
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
} from '../lib/seo';
import { Prose, headings, slugify } from '../components/Prose';
import type { News } from '../types';

const FeedList = ({ state, emptyText }: { state: { data?: News[]; loading: boolean; error?: string; reload: () => void }; emptyText: string }) => {
  const { t } = useI18n();
  return (
    <Async state={state} empty={<EmptyState title={t('news.noNewsYet')} text={emptyText} action={<Btn onClick={state.reload}>{t('common.refresh')}</Btn>} />}>
      {(items) => <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">{items.map((n) => <NewsCard key={n.$id} n={n} />)}</div>}
    </Async>
  );
};

const NEWS_PAGE_SIZE = 20;

export function Home() {
  const { t, tNewsCategory } = useI18n();
  const cats = useAsync(getNewsCategories, []);
  const [i, setI] = useState(0);
  const [items, setItems] = useState<News[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [refreshKey, setRefreshKey] = useState(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const list = cats.data ?? [];
  const slug = i > 0 ? list[i - 1]?.slug : undefined;

  useEffect(() => {
    setItems([]);
    setOffset(0);
    setHasMore(true);
    setError(undefined);
    setLoading(true);
  }, [slug]);

  useEffect(() => {
    let active = true;
    if (offset > 0 && !hasMore) return;
    setLoading(true);
    setError(undefined);
    getNews({ category: slug, limit: NEWS_PAGE_SIZE, offset })
      .then((page) => {
        if (!active) return;
        setItems((previous) => {
          const combined = offset === 0 ? page : [...previous, ...page];
          const seen = new Set<string>();
          return combined.filter((item) => {
            if (seen.has(item.$id)) return false;
            seen.add(item.$id);
            return true;
          });
        });
        setHasMore(page.length === NEWS_PAGE_SIZE);
      })
      .catch((reason: unknown) => {
        if (active) setError(formatApiError(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [slug, offset, refreshKey]);

  useEffect(() => {
    const target = sentinelRef.current;
    if (!target || !hasMore || loading || error) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setOffset((current) => current + NEWS_PAGE_SIZE);
        }
      },
      { rootMargin: '500px 0px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loading, error, items.length]);

  const reload = () => {
    setItems([]);
    setOffset(0);
    setHasMore(true);
    setRefreshKey((value) => value + 1);
  };
  const first = !slug ? items[0] : undefined;
  const origin = window.location.origin;
  const homeSchemas: Record<string, unknown>[] = [...buildWebsiteJsonLd(origin)];
  if (items.length) {
    homeSchemas.push(
      buildItemListJsonLd(origin, {
        name: 'Top Indian Finance News Stories',
        path: '/',
        items: items.slice(0, 10).map((item) => ({ name: item.title, path: `/news/${item.slug}`, image: item.imageUrl })),
      }),
    );
  }
  return (
    <Page
      title={t('nav.home')}
      logo
      tab
      wide
      seo={{
        title: 'Home',
        description: DEFAULT_DESCRIPTION,
        keywords: DEFAULT_KEYWORDS,
        jsonLd: homeSchemas,
      }}
    >
      <h1 className="sr-only">FORWORD – Indian Finance News, Product Comparisons, Calculators &amp; Offers</h1>
      {list.length > 0 && <Chips items={[t('common.all'), ...list.map((c) => tNewsCategory(c.slug, c.name))]} value={i} onChange={setI} />}
      {first && <FeaturedCard n={first} />}
      {(!first || items.length > 1) && (
        <FeedList
          state={{ data: first ? items.slice(1) : items, loading: loading && items.length === 0, error, reload }}
          emptyText={t('news.categoryEmpty')}
        />
      )}
      {error && items.length > 0 && (
        <div className="py-3 text-center text-sm text-slate" role="status">
          {error}{' '}
          <button type="button" onClick={reload} className="font-semibold text-pri-dark underline">Retry</button>
        </div>
      )}
      {hasMore && <div ref={sentinelRef} className="h-8 w-full" aria-hidden="true" />}
      {loading && items.length > 0 && (
        <p className="py-3 text-center text-xs text-slate" role="status" aria-live="polite">Loading more stories…</p>
      )}
      {!hasMore && items.length > 0 && (
        <p className="py-3 text-center text-xs text-slate">You’re all caught up.</p>
      )}
    </Page>
  );
}

const FEED_KEYS: Record<string, TranslationKey> = {
  latest: 'news.latest',
  trending: 'news.trending',
  breaking: 'news.breaking',
  featured: 'news.featured',
  recommended: 'news.recommended',
  'top-stories': 'news.topStories',
};
const FEEDS_EN: Record<string, string> = { latest: 'Latest News', trending: 'Trending News', breaking: 'Breaking News', featured: 'Featured News', recommended: 'Recommended News', 'top-stories': 'Top Stories' };
export function NewsFeed() {
  const { t } = useI18n();
  const { kind = 'latest' } = useParams();
  const k = (kind in FEEDS_EN ? kind : 'latest') as FeedKind;
  const pageSize = k === 'top-stories' ? 10 : 20;
  const [limit, setLimit] = useState(pageSize);
  useEffect(() => { setLimit(pageSize); }, [k, pageSize]);
  const state = useAsync(() => getNews({ kind: k, limit }), [k, limit]);
  const hasMore = (state.data?.length ?? 0) >= limit;
  const seoLabel = FEEDS_EN[k];
  const label = t(FEED_KEYS[k]);
  const desc = `Read ${seoLabel.toLowerCase()} on Indian banking, personal finance, stock markets, RBI updates, and economy on FORWORD.`;
  const origin = window.location.origin;
  const feedSchemas: Record<string, unknown>[] = [
    buildCollectionJsonLd(origin, { name: `${seoLabel} – FORWORD`, description: desc, path: `/feed/${k}` }),
  ];
  if (state.data?.length) {
    feedSchemas.push(
      buildItemListJsonLd(origin, {
        name: `${seoLabel} – FORWORD`,
        path: `/feed/${k}`,
        items: state.data.slice(0, 15).map((item) => ({ name: item.title, path: `/news/${item.slug}`, image: item.imageUrl })),
      }),
    );
  }
  return (
    <Page
      title={label}
      back
      seo={{
        title: seoLabel,
        description: desc,
        keywords: `${seoLabel} India, Indian business news, RBI policy news, personal finance headlines, FORWORD`,
        breadcrumbs: [{ name: 'Home', path: '/' }, { name: seoLabel, path: `/feed/${k}` }],
        jsonLd: feedSchemas,
      }}
    >
      <FeedList state={state} emptyText={t('news.feedEmpty')} />
      {hasMore && !state.loading && (
        <Btn variant="outline" onClick={() => setLimit((prev) => prev + pageSize)}>
          Load more stories
        </Btn>
      )}
    </Page>
  );
}

export function NewsCategory() {
  const { t, tNewsCategory } = useI18n();
  const { slug = '' } = useParams();
  const cats = useAsync(getNewsCategories, []);
  const enName = cats.data?.find((c) => c.slug === slug)?.name ?? 'News';
  const name = tNewsCategory(slug, enName);
  const [tIdx, setT] = useState(0);
  useEffect(() => { setT(0); }, [slug]);
  const feedKind: FeedKind = tIdx === 1 ? 'trending' : 'latest';
  const state = useAsync(() => getNews({ category: slug, kind: feedKind }), [slug, feedKind]);
  const desc = `Latest ${enName} stories, explainers, and verified Indian finance updates curated with publisher attribution on FORWORD.`;
  const origin = window.location.origin;
  const catSchemas: Record<string, unknown>[] = [
    buildCollectionJsonLd(origin, { name: enName, description: desc, path: `/news/category/${slug}` }),
  ];
  if (state.data?.length) {
    catSchemas.push(
      buildItemListJsonLd(origin, {
        name: `${enName} – FORWORD`,
        path: `/news/category/${slug}`,
        items: state.data.slice(0, 15).map((item) => ({ name: item.title, path: `/news/${item.slug}`, image: item.imageUrl })),
      }),
    );
  }
  return (
    <Page
      title={name}
      back
      seo={{
        title: enName,
        description: desc,
        keywords: `${enName} India, latest ${enName.toLowerCase()}, Indian financial news, market analysis, FORWORD`,
        breadcrumbs: [{ name: 'Home', path: '/' }, { name: 'News', path: '/category/news' }, { name: enName, path: `/news/category/${slug}` }],
        jsonLd: catSchemas,
      }}
    >
      <Chips items={[t('news.tabLatest'), t('news.tabPopular'), t('news.tabExplainers'), t('news.tabGuides')]} value={tIdx} onChange={setT} />
      <FeedList state={state} emptyText={t('news.categoryEmpty')} />
    </Page>
  );
}

export function Article() {
  const { slug = '' } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const state = useAsync(() => getNewsBySlug(slug), [slug]);
  const n = state.data;
  const related = useAsync(() => (n ? getNews({ category: n.categorySlug, limit: 5 }) : Promise.resolve([])), [n?.$id]);
  const products = useAsync(() => getProductsByIds(n?.relatedProductIds ?? []), [n?.$id]);
  const [report, setReport] = useState(false);

  useEffect(() => {
    if (!n || !user) return;
    const key = `forword:read:${n.$id}`;
    if (safeStorageGet('session', key)) return;
    safeStorageSet('session', key, '1');
    addHistory(user.$id, n).catch(() => {});
  }, [n?.$id, user?.$id]);

  if (state.loading) return <Page title="Article" back><Skeleton rows={3} /></Page>;
  if (state.error) return <Page title="Article" back><ErrorState text={state.error} onRetry={state.reload} /></Page>;
  if (!n) return <Page title="Story not found" back seo={{ noIndex: true }}><EmptyState icon="news" title="Story not found" text="It may have been removed or is not published yet." action={<Btn to="/">Go to Home</Btn>} /></Page>;

  const toc = headings(n.body);
  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: n.title, url }); return; } catch { /* cancelled or blocked */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.show('Link copied');
    } catch {
      toast.show('Could not copy link automatically.');
    }
  };
  const more = (related.data ?? []).filter((x) => x.$id !== n.$id).slice(0, 4);
  const articleKeywords = buildArticleKeywords({ title: n.title, categoryName: n.categoryName, publisher: n.publisher });
  return (
    <Page
      title={n.title}
      back
      seo={{
        description: n.summary || `${n.title} — Read verified ${n.categoryName} coverage on FORWORD.`,
        keywords: articleKeywords,
        type: 'article',
        image: n.imageUrl,
        imageAlt: n.title,
        publishedTime: n.publishedAt,
        modifiedTime: n.$updatedAt || n.publishedAt,
        section: n.categoryName,
        author: n.author || n.publisher,
        breadcrumbs: [
          { name: 'Home', path: '/' },
          { name: n.categoryName, path: `/news/category/${n.categorySlug}` },
          { name: n.title, path: `/news/${n.slug}` },
        ],
        jsonLd: buildNewsArticleJsonLd(window.location.origin, {
          title: n.title,
          summary: n.summary,
          body: n.body,
          slug: n.slug,
          imageUrl: n.imageUrl,
          publishedAt: n.publishedAt,
          updatedAt: n.$updatedAt,
          author: n.author,
          publisher: n.publisher,
          categoryName: n.categoryName,
          keywords: articleKeywords,
        }),
      }}
      right={<><button onClick={share} aria-label="Share article" className="rounded-full bg-surface p-2"><Share2 size={20} /></button><SaveButton type="news" id={n.$id} title={n.title} subtitle={n.publisher} imageUrl={n.imageUrl} href={`/news/${n.slug}`} className="rounded-full bg-surface !p-2" /></>}
    >
      <article className="space-y-4">
        <nav aria-label="Breadcrumb" className="text-xs text-slate"><Link to="/">Home</Link> / <Link to={`/news/category/${n.categorySlug}`}>{n.categoryName}</Link></nav>
        {n.isSponsored && <p className="rounded-[10px] bg-gold/20 px-3 py-2.5 text-xs font-medium text-[#8A5A00]">Sponsored content. Clearly separate from our news reporting.</p>}
        <div className="flex items-center gap-2 text-[11px]"><span className="rounded-[10px] bg-mint px-2.5 py-1 font-semibold text-pri-dark">{n.categoryName}</span><span className="text-slate">{n.isSponsored ? 'Sponsored' : 'News report · Not sponsored'}</span></div>
        <h2 className="text-[26px] font-bold leading-tight">{n.title}</h2>
        <p className="text-base text-slate">{n.summary}</p>
        <Thumb src={n.imageUrl} alt={n.title} className="h-52 w-full rounded-2xl md:h-80" />
        <p className="text-xs text-slate">{n.publisher}{n.author ? ` · ${n.author}` : ''} · Published {shortDate(n.publishedAt)}{n.$updatedAt !== n.$createdAt ? ` · Updated ${shortDate(n.$updatedAt)}` : ''} · {n.readTime} min read</p>
        {toc.length >= 3 && (
          <nav aria-label="Table of contents" className="rounded-2xl bg-surface p-4"><h3 className="mb-2 text-sm font-bold">In this article</h3>
            <ul className="space-y-1.5">{toc.map((h) => <li key={h}><a href={`#${slugify(h)}`} className="text-sm text-pri-dark underline">{h}</a></li>)}</ul></nav>
        )}
        <Prose body={n.body} />
        {(() => {
          const sourceHref = safeUrl(n.sourceUrl);
          return (
            <p className="text-xs text-slate">
              Source:{' '}
              {sourceHref ? (
                <a href={sourceHref} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 underline">
                  <Link2 size={12} />
                  {n.publisher}
                </a>
              ) : (
                <span>{n.publisher}</span>
              )}
            </p>
          );
        })()}
        <button onClick={() => setReport(true)} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate"><Flag size={14} />Report this article</button>
      </article>
      {(products.data?.length ?? 0) > 0 && <><SectionHeader title="Related products" /><p className="text-[11px] text-slate">Partner links may earn FORWORD a commission and never affect our reporting.</p>{products.data!.map((p) => <ProductCard key={p.$id} p={p} />)}</>}
      {more.length > 0 && <><SectionHeader title="Related news" />{more.map((x) => <NewsCard key={x.$id} n={x} />)}</>}
      <ReportSheet open={report} onClose={() => setReport(false)} newsId={n.$id} />
    </Page>
  );
}

function ReportSheet({ open, onClose, newsId }: { open: boolean; onClose: () => void; newsId: string }) {
  const { user } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const send = async (reason: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await reportArticle(newsId, reason, user?.$id);
      toast.show('Thanks. We will review this article.');
    } catch (e) {
      toast.show(formatApiError(e));
    } finally {
      setBusy(false);
      onClose();
    }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Report this article">
      {['Inaccurate information', 'Duplicate story', 'Looks like an advertisement', 'Other'].map((r) => <ListRow key={r} icon="help" title={r} onClick={() => send(r)} />)}
    </Sheet>
  );
}

export function Notifications() {
  const { user } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [tab, setTab] = useState(0);
  const state = useAsync(() => getNotifications(user?.$id), [user?.$id]);
  const kinds = [null, 'news', 'offer', 'reward'];
  const iconOf = { news: 'news', offer: 'tag', reward: 'coin', system: 'bell' } as const;
  return (
    <Page title={t('nav.notifications')} back seo={{ noIndex: true, description: 'Manage your FORWORD financial news, offers, and rewards alerts.' }} right={<Link to="/settings/notifications" className="rounded-full bg-surface px-3 py-2 text-sm font-semibold">{t('nav.settings')}</Link>}>
      <Segmented items={[t('common.all'), t('news.tabNews'), t('news.tabOffers'), t('news.tabRewards')]} value={tab} onChange={setTab} />
      <Async state={{ ...state, data: state.data?.filter((x) => !kinds[tab] || x.kind === kinds[tab]) }} empty={<EmptyState icon="bell" title={t('news.allCaughtUp')} text={t('news.newAlertsHere')} />}>
        {(items) => <div>{items.map((x) => {
          const target = safeInternalPath(x.href);
          return <ListRow key={x.$id} icon={iconOf[x.kind]} title={x.title} sub={`${x.body ?? ''} ${timeAgo(x.$createdAt)}`.trim()} onClick={target ? () => nav(target) : undefined} right="none" />;
        })}</div>}
      </Async>
    </Page>
  );
}
