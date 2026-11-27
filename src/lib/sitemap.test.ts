import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  PRIVATE_NOINDEX_PATHS,
  buildImageSitemapXml,
  buildMainSitemapXml,
  buildNewsSitemapXml,
  buildSitemapIndexXml,
  getStaticPublicUrls,
} from './sitemap';
import { filterAuditEntries, runSeoAudit } from './seoAudit';
import type { Brand, News, Offer, Product } from '../types';

const NOW = Date.parse('2026-11-26T10:00:00.000Z');

const sampleNews: News[] = [
  {
    $id: 'n1',
    $createdAt: '2026-11-26T04:00:00.000Z',
    $updatedAt: '2026-11-26T05:00:00.000Z',
    title: 'RBI Keeps Repo Rate Unchanged for Home Loan Borrowers',
    slug: 'rbi-keeps-repo-rate-unchanged',
    summary: 'The Reserve Bank of India retained the benchmark repo rate, stabilizing home loan EMIs and bank FD yields.',
    body: 'The Reserve Bank of India Monetary Policy Committee voted to keep the benchmark repo rate steady, providing predictable EMIs for retail home loan borrowers and sustained fixed deposit interest rates for Indian savers across public and private banks.',
    imageUrl: '/demo/news-rbi.jpg',
    categoryName: 'Banking News',
    categorySlug: 'banking-news',
    publisher: 'FORWORD Desk',
    sourceUrl: 'https://www.rbi.org.in/',
    publishedAt: '2026-11-26T04:00:00.000Z',
    readTime: 4,
    status: 'approved',
  },
  {
    $id: 'n2',
    $createdAt: '2026-11-10T04:00:00.000Z',
    $updatedAt: '2026-11-10T04:00:00.000Z',
    title: 'Old Approved News Story Outside 48h Window',
    slug: 'old-approved-story',
    summary: 'Older news story should remain in main sitemap.xml but not in 48h sitemap-news.xml.',
    body: 'A comprehensive review of older financial policy updates published more than two weeks ago.',
    categoryName: 'Economy News',
    categorySlug: 'economy-news',
    publisher: 'FORWORD Desk',
    sourceUrl: 'https://www.forword.in/',
    publishedAt: '2026-11-10T04:00:00.000Z',
    readTime: 3,
    status: 'approved',
  },
  {
    $id: 'n3',
    $createdAt: '2026-11-26T06:00:00.000Z',
    $updatedAt: '2026-11-26T06:00:00.000Z',
    title: 'Draft Unpublished News Should Never Appear',
    slug: 'draft-unpublished-news',
    summary: 'Draft story must be excluded from all XML sitemaps.',
    body: 'Internal draft body.',
    categoryName: 'Banking News',
    categorySlug: 'banking-news',
    publisher: 'FORWORD Desk',
    sourceUrl: 'https://www.forword.in/',
    publishedAt: '2026-11-26T06:00:00.000Z',
    readTime: 2,
    status: 'draft',
  },
];

const sampleProducts: Product[] = [
  {
    $id: 'p1',
    $createdAt: '2026-11-01T00:00:00.000Z',
    $updatedAt: '2026-11-25T00:00:00.000Z',
    name: 'SBI Cashback Credit Card',
    slug: 'sbi-cashback-credit-card',
    type: 'credit_card',
    category: 'credit-cards',
    subcategory: 'cashback-credit-cards',
    bankName: 'SBI Card',
    bankLogo: '/demo/brand-sbi.svg',
    summary: 'Flat 5% online cashback credit card in India with transparent annual fee waiver.',
    facts: ['Annual fee|₹999 + GST'],
    applyUrl: 'https://www.sbicard.com/',
    verifiedAt: '2026-11-25T00:00:00.000Z',
    status: 'approved',
  },
];

const sampleOffers: Offer[] = [
  {
    $id: 'o1',
    $createdAt: '2026-11-20T00:00:00.000Z',
    $updatedAt: '2026-11-20T00:00:00.000Z',
    title: '12% Off Domestic Flights',
    brandId: 'b1',
    brandName: 'HDFC Bank',
    brandLogo: '/demo/brand-hdfc.svg',
    description: 'Instant 12% discount on domestic flight bookings using eligible HDFC Bank credit cards.',
    discount: '12% OFF',
    validTill: '2026-12-31',
    externalUrl: 'https://www.hdfcbank.com/',
    category: 'travel',
    status: 'approved',
  },
  {
    $id: 'o2',
    $createdAt: '2025-01-01T00:00:00.000Z',
    $updatedAt: '2025-01-01T00:00:00.000Z',
    title: 'Expired Offer Must Be Excluded',
    brandId: 'b1',
    brandName: 'HDFC Bank',
    description: 'Expired promotional deal.',
    discount: '5% OFF',
    validTill: '2025-12-31',
    externalUrl: 'https://www.hdfcbank.com/',
    category: 'travel',
    status: 'approved',
  },
];

const sampleBrands: Brand[] = [
  {
    $id: 'b1',
    $createdAt: '2026-11-01T00:00:00.000Z',
    $updatedAt: '2026-11-01T00:00:00.000Z',
    name: 'HDFC Bank',
    logoUrl: '/demo/brand-hdfc.svg',
    description: 'Verified HDFC Bank credit card, savings account, and partner offers in India.',
    status: 'approved',
  },
];

test('static public URL catalog covers hubs, categories, subcategories, news, offers, calculators, and excludes private paths', () => {
  const staticUrls = getStaticPublicUrls();
  assert.ok(staticUrls.length >= 120, `Expected >= 120 static public URLs, got ${staticUrls.length}`);
  const paths = new Set(staticUrls.map((u) => u.path));
  assert.ok(paths.has('/'));
  assert.ok(paths.has('/credit-cards/cashback-credit-cards'));
  assert.ok(paths.has('/news/category/banking-news'));
  assert.ok(paths.has('/offers/category/travel'));
  assert.ok(paths.has('/calculators/emi-calculator'));
  assert.ok(paths.has('/faq'));

  for (const priv of PRIVATE_NOINDEX_PATHS) {
    assert.equal(paths.has(priv), false, `Private path ${priv} must never appear in public sitemap`);
  }
});

test('XML sitemap builders enforce approved status, 48h news window, active offers, and canonical domain', () => {
  const indexXml = buildSitemapIndexXml('https://forword.in', '2026-11-26T10:00:00.000Z');
  assert.match(indexXml, /https:\/\/www\.forword\.in\/sitemap\.xml/);
  assert.match(indexXml, /https:\/\/www\.forword\.in\/sitemap-news\.xml/);
  assert.match(indexXml, /https:\/\/www\.forword\.in\/sitemap-images\.xml/);

  const mainXml = buildMainSitemapXml(
    'https://www.forword.in',
    { news: sampleNews, products: sampleProducts, offers: sampleOffers, brands: sampleBrands },
    NOW,
  );
  assert.match(mainXml, /\/news\/rbi-keeps-repo-rate-unchanged/);
  assert.match(mainXml, /\/news\/old-approved-story/);
  assert.doesNotMatch(mainXml, /draft-unpublished-news/);
  assert.match(mainXml, /\/product\/sbi-cashback-credit-card/);
  assert.match(mainXml, /\/product\/sbi-cashback-credit-card\/guide/);
  assert.match(mainXml, /\/offers\/o1/);
  assert.doesNotMatch(mainXml, /\/offers\/o2/);
  assert.match(mainXml, /\/brands\/b1/);

  const newsXml = buildNewsSitemapXml('https://www.forword.in', sampleNews, NOW);
  assert.match(newsXml, /rbi-keeps-repo-rate-unchanged/);
  assert.doesNotMatch(newsXml, /old-approved-story/);
  assert.doesNotMatch(newsXml, /draft-unpublished-news/);

  const imgXml = buildImageSitemapXml(
    'https://www.forword.in',
    { news: sampleNews, products: sampleProducts, offers: sampleOffers },
    NOW,
  );
  assert.match(imgXml, /https:\/\/www\.forword\.in\/og-image\.jpg/);
  assert.match(imgXml, /https:\/\/www\.forword\.in\/demo\/news-rbi\.jpg/);
  assert.doesNotMatch(imgXml, /\/offers\/o2/);
});

test('runSeoAudit detects clean static architecture and flags missing/duplicate metadata and broken links on dynamic records', () => {
  const cleanReport = runSeoAudit({ origin: 'https://www.forword.in', now: NOW });
  assert.ok(cleanReport.summary.totalPublicUrls >= 120);
  assert.equal(cleanReport.summary.missingTitles, 0);
  assert.equal(cleanReport.summary.duplicateTitles, 0);
  assert.equal(cleanReport.summary.missingDescriptions, 0);
  assert.equal(cleanReport.summary.duplicateDescriptions, 0);
  assert.equal(cleanReport.summary.missingCanonicals, 0);
  assert.equal(cleanReport.summary.missingSchema, 0);
  assert.equal(cleanReport.summary.brokenLinks, 0);
  assert.equal(cleanReport.summary.missingImageAlt, 0);
  assert.ok(cleanReport.summary.noIndexUrls >= PRIVATE_NOINDEX_PATHS.length);

  // Inject faulty Appwrite records to ensure auditor detects issues accurately
  const faultyReport = runSeoAudit({
    origin: 'https://www.forword.in',
    now: NOW,
    news: [
      ...sampleNews.slice(0, 1),
      {
        ...sampleNews[0],
        $id: 'n-dup',
        slug: 'duplicate-headline-slug',
        sourceUrl: 'javascript:alert(1)',
      },
      {
        ...sampleNews[0],
        $id: 'n-missing',
        slug: '',
        title: '',
        summary: '',
        imageUrl: '/demo/pic.jpg',
      },
    ],
    products: sampleProducts,
    offers: sampleOffers,
    brands: sampleBrands,
  });
  assert.ok(faultyReport.summary.duplicateTitles >= 2);
  assert.ok(faultyReport.summary.missingTitles >= 1);
  assert.ok(faultyReport.summary.missingDescriptions >= 1);
  assert.ok(faultyReport.summary.missingCanonicals >= 1);
  assert.ok(faultyReport.summary.brokenLinks >= 2);
  assert.ok(faultyReport.summary.missingImageAlt >= 1);

  // Verify category filters
  assert.ok(filterAuditEntries(faultyReport.entries, 'news').length > 0);
  assert.ok(filterAuditEntries(faultyReport.entries, 'credit-cards').length > 0);
  assert.ok(filterAuditEntries(faultyReport.entries, 'loans').length > 0);
  assert.ok(filterAuditEntries(faultyReport.entries, 'banking').length > 0);
  assert.ok(filterAuditEntries(faultyReport.entries, 'offers').length > 0);
  assert.ok(filterAuditEntries(faultyReport.entries, 'products').length > 0);
  assert.ok(filterAuditEntries(faultyReport.entries, 'brands').length > 0);
  assert.ok(filterAuditEntries(faultyReport.entries, 'categories').length > 0);
  assert.ok(filterAuditEntries(faultyReport.entries, 'all', { issuesOnly: true }).length >= 3);
});

test('generated public XML sitemaps and robots.txt exist, are valid XML, and use canonical www.forword.in URLs', () => {
  const pub = path.resolve(process.cwd(), 'public');
  const robots = fs.readFileSync(path.join(pub, 'robots.txt'), 'utf8');
  const indexXml = fs.readFileSync(path.join(pub, 'sitemap-index.xml'), 'utf8');
  const mainXml = fs.readFileSync(path.join(pub, 'sitemap.xml'), 'utf8');
  const newsXml = fs.readFileSync(path.join(pub, 'sitemap-news.xml'), 'utf8');
  const imagesXml = fs.readFileSync(path.join(pub, 'sitemap-images.xml'), 'utf8');

  assert.match(robots, /Disallow: \/admin/);
  assert.match(robots, /Disallow: \/compare/);
  assert.match(robots, /Sitemap: https:\/\/www\.forword\.in\/sitemap-index\.xml/);
  assert.match(indexXml, /<sitemapindex/);
  assert.match(indexXml, /https:\/\/www\.forword\.in\/sitemap-news\.xml/);
  assert.match(mainXml, /<urlset/);
  assert.match(mainXml, /https:\/\/www\.forword\.in\/credit-cards\/cashback-credit-cards/);
  assert.match(mainXml, /https:\/\/www\.forword\.in\/calculators\/emi-calculator/);
  assert.match(newsXml, /xmlns:news="http:\/\/www\.google\.com\/schemas\/sitemap-news\/0\.9"/);
  assert.match(imagesXml, /xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1"/);
});
