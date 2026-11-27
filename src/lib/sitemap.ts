import { CALCS } from './calc';
import { CATEGORIES, NEWS_CATEGORIES, OFFER_CATEGORIES } from './menu';
import { CANONICAL_SITE_URL, buildArticleKeywords, cleanText, getCanonicalOrigin, resolveAbsoluteUrl, resolveCanonicalUrl } from './seo';
import type { Brand, News, Offer, Product } from '../types';

export interface SitemapUrlEntry {
  path: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority: string;
  lastmod?: string;
}

export interface ImageSitemapEntry {
  pagePath: string;
  imageUrl: string;
  title: string;
  caption?: string;
}

export interface DynamicSitemapRecords {
  news?: News[];
  products?: Product[];
  offers?: Offer[];
  brands?: Brand[];
}

export const PRIVATE_NOINDEX_PATHS: readonly string[] = [
  '/welcome',
  '/onboarding',
  '/language',
  '/notification-permission',
  '/login',
  '/login/mobile',
  '/verify-otp',
  '/verify-email',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/account-created',
  '/profile',
  '/profile/edit',
  '/profile/activity',
  '/profile/history',
  '/profile/recent',
  '/profile/reviews',
  '/settings',
  '/settings/language',
  '/settings/notifications',
  '/settings/privacy',
  '/settings/password',
  '/settings/cookies',
  '/rewards',
  '/rewards/read-earn',
  '/rewards/tasks',
  '/rewards/check-in',
  '/rewards/history',
  '/rewards/earnings',
  '/rewards/coins',
  '/wallet',
  '/wallet/withdraw',
  '/wallet/withdrawals',
  '/wallet/transactions',
  '/referral',
  '/referral/rewards',
  '/favorites',
  '/notifications',
  '/search',
  '/search/advanced',
  '/compare',
  '/menu',
  '/go/',
  '/offline',
  '/maintenance',
  '/admin/seo',
];

export function escapeXml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toIsoDate(value?: string): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

function isApprovedStatus(status?: string): boolean {
  return String(status ?? '').toLowerCase() === 'approved';
}

function isOfferCurrentlyValid(validTill?: string, now = Date.now()): boolean {
  if (!validTill) return true;
  const trimmed = validTill.trim();
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? new Date(`${trimmed}T23:59:59.999Z`).getTime()
    : new Date(trimmed).getTime();
  return !Number.isFinite(parsed) || parsed >= now;
}

/**
 * Returns every static/structural public indexable URL across FORWORD
 * (Core hubs, Categories, Subcategories, News categories, Offer categories,
 * Calculators, News feeds, and Trust/Legal pages).
 */
export function getStaticPublicUrls(): SitemapUrlEntry[] {
  const entries: SitemapUrlEntry[] = [
    // Core Hubs
    { path: '/', changefreq: 'daily', priority: '1.0' },
    { path: '/category', changefreq: 'weekly', priority: '0.9' },
    { path: '/category/all', changefreq: 'weekly', priority: '0.8' },
    { path: '/category/news', changefreq: 'daily', priority: '0.9' },
    { path: '/offers', changefreq: 'daily', priority: '0.9' },
    { path: '/calculators', changefreq: 'monthly', priority: '0.9' },
  ];

  // Product & Finance Categories + All Subcategories
  for (const cat of CATEGORIES) {
    entries.push({
      path: `/category/${cat.slug}`,
      changefreq: cat.slug === 'government-schemes' ? 'monthly' : 'weekly',
      priority: '0.8',
    });
    for (const sub of cat.subs) {
      entries.push({
        path: `/${cat.slug}/${sub.slug}`,
        changefreq: 'weekly',
        priority: '0.7',
      });
    }
  }

  // News Categories
  for (const nc of NEWS_CATEGORIES) {
    entries.push({
      path: `/news/category/${nc.slug}`,
      changefreq: 'daily',
      priority: '0.8',
    });
  }

  // Offer Categories (excluding 'all' which is /offers)
  for (const oc of OFFER_CATEGORIES) {
    if (oc.slug === 'all') continue;
    entries.push({
      path: `/offers/category/${oc.slug}`,
      changefreq: 'daily',
      priority: '0.7',
    });
  }

  // Financial Calculators
  for (const calc of CALCS) {
    entries.push({
      path: `/calculators/${calc.slug}`,
      changefreq: 'monthly',
      priority: '0.8',
    });
  }

  // Curated News Feeds
  for (const feed of ['latest', 'trending', 'breaking', 'featured', 'top-stories']) {
    entries.push({
      path: `/feed/${feed}`,
      changefreq: 'daily',
      priority: '0.7',
    });
  }

  // Trust, Support & Legal Pages
  entries.push(
    { path: '/about', changefreq: 'monthly', priority: '0.5' },
    { path: '/contact', changefreq: 'monthly', priority: '0.5' },
    { path: '/faq', changefreq: 'monthly', priority: '0.6' },
    { path: '/help', changefreq: 'monthly', priority: '0.5' },
    { path: '/disclosure', changefreq: 'monthly', priority: '0.5' },
    { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
    { path: '/terms', changefreq: 'yearly', priority: '0.3' },
  );

  // Deduplicate by normalized path
  const seen = new Set<string>();
  return entries.filter((e) => {
    const key = e.path.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildSitemapIndexXml(
  origin = CANONICAL_SITE_URL,
  lastmod = new Date().toISOString(),
): string {
  const base = getCanonicalOrigin(origin);
  const safeLastmod = toIsoDate(lastmod) ?? new Date().toISOString();
  const sitemaps = ['/sitemap.xml', '/sitemap-news.xml', '/sitemap-images.xml'];
  const rows = sitemaps
    .map(
      (file) =>
        `  <sitemap>\n    <loc>${escapeXml(`${base}${file}`)}</loc>\n    <lastmod>${escapeXml(safeLastmod)}</lastmod>\n  </sitemap>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows}\n</sitemapindex>\n`;
}

export function buildMainSitemapXml(
  origin = CANONICAL_SITE_URL,
  dynamicRecords: DynamicSitemapRecords = {},
  now = Date.now(),
): string {
  const base = getCanonicalOrigin(origin);
  const seen = new Set<string>();
  const rows: string[] = [];

  const pushEntry = (e: SitemapUrlEntry) => {
    const loc = resolveCanonicalUrl(base, e.path);
    if (seen.has(loc)) return;
    seen.add(loc);
    const mod = toIsoDate(e.lastmod);
    rows.push(
      `  <url><loc>${escapeXml(loc)}</loc>${mod ? `<lastmod>${escapeXml(mod)}</lastmod>` : ''}<changefreq>${e.changefreq}</changefreq><priority>${e.priority}</priority></url>`,
    );
  };

  for (const entry of getStaticPublicUrls()) pushEntry(entry);

  // Dynamic approved news articles
  for (const n of dynamicRecords.news ?? []) {
    if (!isApprovedStatus(n.status) || !cleanText(n.slug)) continue;
    pushEntry({
      path: `/news/${encodeURIComponent(n.slug.trim())}`,
      changefreq: 'weekly',
      priority: '0.8',
      lastmod: n.$updatedAt || n.publishedAt,
    });
  }

  // Dynamic approved products + application guides
  for (const p of dynamicRecords.products ?? []) {
    if (!isApprovedStatus(p.status) || !cleanText(p.slug)) continue;
    const slug = encodeURIComponent(p.slug.trim());
    pushEntry({
      path: `/product/${slug}`,
      changefreq: 'weekly',
      priority: '0.8',
      lastmod: p.verifiedAt || p.$updatedAt,
    });
    pushEntry({
      path: `/product/${slug}/guide`,
      changefreq: 'monthly',
      priority: '0.6',
      lastmod: p.verifiedAt || p.$updatedAt,
    });
  }

  // Dynamic approved active offers
  for (const o of dynamicRecords.offers ?? []) {
    if (!isApprovedStatus(o.status) || !cleanText(o.$id) || !isOfferCurrentlyValid(o.validTill, now)) continue;
    pushEntry({
      path: `/offers/${encodeURIComponent(o.$id.trim())}`,
      changefreq: 'daily',
      priority: '0.7',
      lastmod: o.$updatedAt || o.$createdAt,
    });
  }

  // Dynamic approved brands
  for (const b of dynamicRecords.brands ?? []) {
    if (!isApprovedStatus(b.status) || !cleanText(b.$id)) continue;
    pushEntry({
      path: `/brands/${encodeURIComponent(b.$id.trim())}`,
      changefreq: 'weekly',
      priority: '0.7',
      lastmod: b.$updatedAt || b.$createdAt,
    });
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join('\n')}\n</urlset>\n`;
}

/**
 * Generates Google News compliant XML sitemap (`sitemap-news.xml`).
 * Per Google News guidelines, includes only approved articles published within the last 48 hours
 * (up to 1,000 entries).
 */
export function buildNewsSitemapXml(
  origin = CANONICAL_SITE_URL,
  articles: News[] = [],
  now = Date.now(),
): string {
  const base = getCanonicalOrigin(origin);
  const cutoffMs = now - 48 * 60 * 60 * 1000;
  const eligible = articles
    .filter((n) => {
      if (!isApprovedStatus(n.status) || !cleanText(n.slug) || !cleanText(n.title)) return false;
      const pubTime = new Date(n.publishedAt).getTime();
      return Number.isFinite(pubTime) && pubTime >= cutoffMs;
    })
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 1000);

  const rows = eligible.map((n) => {
    const loc = resolveCanonicalUrl(base, `/news/${encodeURIComponent(n.slug.trim())}`);
    const pubDate = toIsoDate(n.publishedAt) ?? new Date(now).toISOString();
    const keywords = buildArticleKeywords({ title: n.title, categoryName: n.categoryName, publisher: n.publisher });
    return [
      '  <url>',
      `    <loc>${escapeXml(loc)}</loc>`,
      '    <news:news>',
      '      <news:publication>',
      '        <news:name>FORWORD</news:name>',
      '        <news:language>en</news:language>',
      '      </news:publication>',
      `      <news:publication_date>${escapeXml(pubDate)}</news:publication_date>`,
      `      <news:title>${escapeXml(cleanText(n.title))}</news:title>`,
      `      <news:keywords>${escapeXml(keywords)}</news:keywords>`,
      '    </news:news>',
      '  </url>',
    ].join('\n');
  });

  const body = rows.length ? `\n${rows.join('\n')}\n` : '\n';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${body}</urlset>\n`;
}

/**
 * Generates Google Image Sitemap XML (`sitemap-images.xml`) for approved editorial and product images.
 */
export function buildImageSitemapXml(
  origin = CANONICAL_SITE_URL,
  dynamicRecords: DynamicSitemapRecords = {},
  now = Date.now(),
): string {
  const base = getCanonicalOrigin(origin);
  const items: ImageSitemapEntry[] = [
    {
      pagePath: '/',
      imageUrl: '/og-image.jpg',
      title: 'FORWORD – Indian Finance News, Products & Calculators',
    },
  ];

  for (const n of dynamicRecords.news ?? []) {
    if (!isApprovedStatus(n.status) || !cleanText(n.slug) || !cleanText(n.imageUrl)) continue;
    items.push({
      pagePath: `/news/${encodeURIComponent(n.slug.trim())}`,
      imageUrl: n.imageUrl!,
      title: cleanText(n.title),
      caption: cleanText(n.summary),
    });
  }

  for (const p of dynamicRecords.products ?? []) {
    if (!isApprovedStatus(p.status) || !cleanText(p.slug) || !cleanText(p.bankLogo)) continue;
    items.push({
      pagePath: `/product/${encodeURIComponent(p.slug.trim())}`,
      imageUrl: p.bankLogo!,
      title: `${cleanText(p.name)} by ${cleanText(p.bankName)}`,
    });
  }

  for (const o of dynamicRecords.offers ?? []) {
    if (!isApprovedStatus(o.status) || !cleanText(o.$id) || !isOfferCurrentlyValid(o.validTill, now)) continue;
    const img = cleanText(o.imageUrl || o.brandLogo);
    if (!img) continue;
    items.push({
      pagePath: `/offers/${encodeURIComponent(o.$id.trim())}`,
      imageUrl: img,
      title: `${cleanText(o.title)} – ${cleanText(o.brandName)}`,
    });
  }

  const rows = items.map((entry) => {
    const loc = resolveCanonicalUrl(base, entry.pagePath);
    const imgLoc = resolveAbsoluteUrl(base, entry.imageUrl);
    return [
      '  <url>',
      `    <loc>${escapeXml(loc)}</loc>`,
      '    <image:image>',
      `      <image:loc>${escapeXml(imgLoc)}</image:loc>`,
      `      <image:title>${escapeXml(entry.title)}</image:title>`,
      ...(entry.caption ? [`      <image:caption>${escapeXml(entry.caption.slice(0, 180))}</image:caption>`] : []),
      '    </image:image>',
      '  </url>',
    ].join('\n');
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${rows.join('\n')}\n</urlset>\n`;
}
