#!/usr/bin/env node
/**
 * FORWORD Automated Production Sitemap Generator
 *
 * Generates:
 *   - public/sitemap-index.xml
 *   - public/sitemap.xml
 *   - public/sitemap-news.xml    (Google News compliant: approved articles within last 48h)
 *   - public/sitemap-images.xml  (Google Image sitemap for approved media)
 *
 * Appwrite Integration:
 *   When APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_DATABASE_ID, and APPWRITE_API_KEY
 *   are set in the server/CI environment, fetches ONLY live approved documents (`status === 'approved'`)
 *   using pagination, excludes drafts/rejected items and expired offers, and NEVER injects demo data.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const SITE_URL = 'https://www.forword.in';

const COLLECTIONS = {
  news: 'news',
  products: 'products',
  offers: 'offers',
  brands: 'brands',
};

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function toIso(value) {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toISOString() : undefined;
}

function canonicalUrl(pathname) {
  const raw = String(pathname || '/').split(/[?#]/)[0] || '/';
  const norm = raw === '/' ? '/' : `/${raw.replace(/^\/+|\/+$/g, '')}`;
  return `${SITE_URL}${norm}`;
}

function absoluteMediaUrl(urlOrPath) {
  const val = cleanText(urlOrPath);
  if (!val) return `${SITE_URL}/og-image.jpg`;
  if (/^https?:\/\//i.test(val)) return val;
  if (/^[a-z][a-z0-9+.-]*:/i.test(val) || val.startsWith('//') || val.includes('\\')) {
    return `${SITE_URL}/og-image.jpg`;
  }
  return `${SITE_URL}/${val.replace(/^\/+/, '')}`;
}

function isOfferValid(validTill, now = Date.now()) {
  if (!validTill) return true;
  const trimmed = String(validTill).trim();
  const ts = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? new Date(`${trimmed}T23:59:59.999Z`).getTime()
    : new Date(trimmed).getTime();
  return !Number.isFinite(ts) || ts >= now;
}

/**
 * Extracts exact route slugs from src/lib/menu.ts and src/lib/calc.ts
 * so static sitemaps stay 100% synchronized with the React router & catalog.
 */
function extractStaticPublicEntries() {
  const menuSrc = fs.readFileSync(path.join(ROOT, 'src/lib/menu.ts'), 'utf8');
  const calcSrc = fs.readFileSync(path.join(ROOT, 'src/lib/calc.ts'), 'utf8');

  const entries = [
    { path: '/', changefreq: 'daily', priority: '1.0' },
    { path: '/category', changefreq: 'weekly', priority: '0.9' },
    { path: '/category/all', changefreq: 'weekly', priority: '0.8' },
    { path: '/category/news', changefreq: 'daily', priority: '0.9' },
    { path: '/offers', changefreq: 'daily', priority: '0.9' },
    { path: '/calculators', changefreq: 'monthly', priority: '0.9' },
  ];

  // Parse CATEGORIES blocks from src/lib/menu.ts
  const catSection = menuSrc.slice(menuSrc.indexOf('export const CATEGORIES'), menuSrc.indexOf('export const findCat'));
  const catBlockRe = /\{\s*slug:\s*'([^']+)'[\s\S]*?subs:\s*\[([\s\S]*?)\]\s*\}/g;
  for (const m of catSection.matchAll(catBlockRe)) {
    const catSlug = m[1];
    const subsBlock = m[2];
    entries.push({
      path: `/category/${catSlug}`,
      changefreq: catSlug === 'government-schemes' ? 'monthly' : 'weekly',
      priority: '0.8',
    });
    for (const sm of subsBlock.matchAll(/s\('([^']+)'/g)) {
      entries.push({
        path: `/${catSlug}/${sm[1]}`,
        changefreq: 'weekly',
        priority: '0.7',
      });
    }
  }

  // Parse NEWS_CATEGORIES slugs
  const newsSection = menuSrc.slice(menuSrc.indexOf('export const NEWS_CATEGORIES'));
  for (const m of newsSection.matchAll(/\['([a-z0-9-]+)',\s*'[^']+'\]/g)) {
    entries.push({
      path: `/news/category/${m[1]}`,
      changefreq: 'daily',
      priority: '0.8',
    });
  }

  // Parse OFFER_CATEGORIES slugs (excluding 'all')
  const offerSection = menuSrc.slice(menuSrc.indexOf('export const OFFER_CATEGORIES'), menuSrc.indexOf('export const NEWS_CATEGORIES'));
  for (const m of offerSection.matchAll(/slug:\s*'([a-z0-9-]+)'/g)) {
    if (m[1] === 'all') continue;
    entries.push({
      path: `/offers/category/${m[1]}`,
      changefreq: 'daily',
      priority: '0.7',
    });
  }

  // Parse CALCS slugs from src/lib/calc.ts
  for (const m of calcSrc.matchAll(/slug:\s*'([a-z0-9-]+)'/g)) {
    entries.push({
      path: `/calculators/${m[1]}`,
      changefreq: 'monthly',
      priority: '0.8',
    });
  }

  // Curated News Feeds
  for (const feed of ['latest', 'trending', 'breaking', 'featured', 'top-stories']) {
    entries.push({ path: `/feed/${feed}`, changefreq: 'daily', priority: '0.7' });
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

  // Deduplicate
  const seen = new Set();
  return entries.filter((e) => {
    const key = e.path.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchApprovedFromSupabase() {
  const url = cleanText(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
  const key = cleanText(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

  if (!url || !key) {
    return {
      connected: false,
      reason: 'Supabase credentials not present in environment; generated static catalog routes only (zero demo records injected).',
      news: [],
      products: [],
      offers: [],
      brands: [],
    };
  }

  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  async function listAllApproved(table) {
    const out = [];
    for (let page = 0; page < 50; page++) {
      const from = page * 100;
      const to = from + 99;
      const { data, error } = await sb
        .from(table)
        .select('*')
        .in('status', ['approved', 'published'])
        .range(from, to);
      if (error) return out;
      const rows = data || [];
      out.push(...rows);
      if (rows.length < 100) break;
    }
    return out;
  }

  const [newsRaw, productsRaw, ccRaw, loansRaw, offersRaw, brandsRaw] = await Promise.all([
    listAllApproved('news'),
    listAllApproved('products'),
    listAllApproved('credit_cards'),
    listAllApproved('loans'),
    listAllApproved('offers'),
    listAllApproved('brands'),
  ]);

  const news = newsRaw.map((n) => ({
    $id: n.id,
    $createdAt: n.created_at,
    $updatedAt: n.updated_at || n.created_at,
    slug: n.slug,
    title: n.title,
    summary: n.summary,
    imageUrl: n.image_url,
    publishedAt: n.published_at || n.created_at,
    status: 'approved',
  }));
  const products = [...productsRaw, ...ccRaw, ...loansRaw].map((p) => ({
    $id: p.id,
    $createdAt: p.created_at,
    $updatedAt: p.updated_at || p.created_at,
    slug: p.slug,
    name: p.name,
    bankName: p.bank_name,
    bankLogo: p.bank_logo,
    verifiedAt: p.verified_at || p.updated_at,
    status: 'approved',
  }));
  const offers = offersRaw.map((o) => ({
    $id: o.id,
    $createdAt: o.created_at,
    $updatedAt: o.updated_at || o.created_at,
    title: o.title,
    brandName: o.brand_name,
    brandLogo: o.brand_logo,
    imageUrl: o.image_url,
    validTill: o.valid_till,
    status: 'approved',
  }));
  const brands = brandsRaw.map((b) => ({
    $id: b.id,
    $createdAt: b.created_at,
    $updatedAt: b.updated_at || b.created_at,
    name: b.name,
    logoUrl: b.logo_url,
    status: 'approved',
  }));

  return { connected: true, news, products, offers, brands };
}

async function main() {
  const now = Date.now();
  const isoNow = new Date(now).toISOString();
  const staticEntries = extractStaticPublicEntries();
  const dynamic = await fetchApprovedFromSupabase();

  // 1. Main Sitemap (sitemap.xml)
  const seenUrls = new Set();
  const mainRows = [];
  const pushMain = (e) => {
    const loc = canonicalUrl(e.path);
    if (seenUrls.has(loc)) return;
    seenUrls.add(loc);
    const mod = toIso(e.lastmod);
    mainRows.push(
      `  <url><loc>${escapeXml(loc)}</loc>${mod ? `<lastmod>${escapeXml(mod)}</lastmod>` : ''}<changefreq>${e.changefreq}</changefreq><priority>${e.priority}</priority></url>`,
    );
  };

  for (const e of staticEntries) pushMain(e);

  for (const n of dynamic.news) {
    if (String(n.status).toLowerCase() !== 'approved' || !cleanText(n.slug)) continue;
    pushMain({
      path: `/news/${encodeURIComponent(cleanText(n.slug))}`,
      changefreq: 'weekly',
      priority: '0.8',
      lastmod: n.$updatedAt || n.publishedAt,
    });
  }

  for (const p of dynamic.products) {
    if (String(p.status).toLowerCase() !== 'approved' || !cleanText(p.slug)) continue;
    const slug = encodeURIComponent(cleanText(p.slug));
    pushMain({ path: `/product/${slug}`, changefreq: 'weekly', priority: '0.8', lastmod: p.verifiedAt || p.$updatedAt });
    pushMain({ path: `/product/${slug}/guide`, changefreq: 'monthly', priority: '0.6', lastmod: p.verifiedAt || p.$updatedAt });
  }

  for (const o of dynamic.offers) {
    if (String(o.status).toLowerCase() !== 'approved' || !cleanText(o.$id) || !isOfferValid(o.validTill, now)) continue;
    pushMain({ path: `/offers/${encodeURIComponent(cleanText(o.$id))}`, changefreq: 'daily', priority: '0.7', lastmod: o.$updatedAt || o.$createdAt });
  }

  for (const b of dynamic.brands) {
    if (String(b.status).toLowerCase() !== 'approved' || !cleanText(b.$id)) continue;
    pushMain({ path: `/brands/${encodeURIComponent(cleanText(b.$id))}`, changefreq: 'weekly', priority: '0.7', lastmod: b.$updatedAt || b.$createdAt });
  }

  const mainXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${mainRows.join('\n')}\n</urlset>\n`;

  // 2. Google News Sitemap (sitemap-news.xml — approved articles published within last 48h)
  const cutoff = now - 48 * 60 * 60 * 1000;
  const newsRows = dynamic.news
    .filter((n) => {
      if (String(n.status).toLowerCase() !== 'approved' || !cleanText(n.slug) || !cleanText(n.title)) return false;
      const ts = new Date(n.publishedAt).getTime();
      return Number.isFinite(ts) && ts >= cutoff;
    })
    .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)))
    .slice(0, 1000)
    .map((n) => {
      const loc = canonicalUrl(`/news/${encodeURIComponent(cleanText(n.slug))}`);
      const pubDate = toIso(n.publishedAt) || isoNow;
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
        '    </news:news>',
        '  </url>',
      ].join('\n');
    });
  const newsXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:news="http://www.google.com/schemas/sitemap-news/9"`.replace('/9', '/0.9') +
    (newsRows.length ? `>\n${newsRows.join('\n')}\n</urlset>\n` : `>\n</urlset>\n`);

  // 3. Google Image Sitemap (sitemap-images.xml)
  const imageItems = [
    {
      path: '/',
      imageUrl: '/og-image.jpg',
      title: 'FORWORD – Indian Finance News, Products & Calculators',
    },
  ];
  for (const n of dynamic.news) {
    if (String(n.status).toLowerCase() === 'approved' && cleanText(n.slug) && cleanText(n.imageUrl)) {
      imageItems.push({ path: `/news/${encodeURIComponent(cleanText(n.slug))}`, imageUrl: n.imageUrl, title: cleanText(n.title), caption: cleanText(n.summary) });
    }
  }
  for (const p of dynamic.products) {
    if (String(p.status).toLowerCase() === 'approved' && cleanText(p.slug) && cleanText(p.bankLogo)) {
      imageItems.push({ path: `/product/${encodeURIComponent(cleanText(p.slug))}`, imageUrl: p.bankLogo, title: `${cleanText(p.name)} by ${cleanText(p.bankName)}` });
    }
  }
  for (const o of dynamic.offers) {
    if (String(o.status).toLowerCase() === 'approved' && cleanText(o.$id) && isOfferValid(o.validTill, now)) {
      const img = cleanText(o.imageUrl || o.brandLogo);
      if (img) imageItems.push({ path: `/offers/${encodeURIComponent(cleanText(o.$id))}`, imageUrl: img, title: `${cleanText(o.title)} – ${cleanText(o.brandName)}` });
    }
  }
  const imageRows = imageItems.map((item) => [
    '  <url>',
    `    <loc>${escapeXml(canonicalUrl(item.path))}</loc>`,
    '    <image:image>',
    `      <image:loc>${escapeXml(absoluteMediaUrl(item.imageUrl))}</image:loc>`,
    `      <image:title>${escapeXml(item.title)}</image:title>`,
    ...(item.caption ? [`      <image:caption>${escapeXml(item.caption.slice(0, 180))}</image:caption>`] : []),
    '    </image:image>',
    '  </url>',
  ].join('\n'));
  const imageXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${imageRows.join('\n')}\n</urlset>\n`;

  // 4. Sitemap Index (sitemap-index.xml)
  const indexXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...['/sitemap.xml', '/sitemap-news.xml', '/sitemap-images.xml'].map(
      (file) => `  <sitemap>\n    <loc>${escapeXml(`${SITE_URL}${file}`)}</loc>\n    <lastmod>${escapeXml(isoNow)}</lastmod>\n  </sitemap>`,
    ),
    '</sitemapindex>',
    '',
  ].join('\n');

  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap-index.xml'), indexXml, 'utf8');
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), mainXml, 'utf8');
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap-news.xml'), newsXml, 'utf8');
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap-images.xml'), imageXml, 'utf8');

  console.log(`[FORWORD SEO] Generated sitemaps in public/:`);
  console.log(`  - sitemap-index.xml (3 child sitemaps)`);
  console.log(`  - sitemap.xml (${mainRows.length} URLs)`);
  console.log(`  - sitemap-news.xml (${newsRows.length} recent news URLs)`);
  console.log(`  - sitemap-images.xml (${imageRows.length} image entries)`);
  if (!dynamic.connected) {
    console.log(`  - Appwrite status: ${dynamic.reason}`);
  } else {
    console.log(`  - Appwrite status: connected (${dynamic.news.length} news, ${dynamic.products.length} products, ${dynamic.offers.length} offers, ${dynamic.brands.length} brands)`);
  }
}

main().catch((err) => {
  console.error('[FORWORD SEO] Sitemap generation failed:', err);
  process.exit(1);
});
