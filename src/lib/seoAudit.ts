import { CALCS } from './calc';
import { CATEGORIES, NEWS_CATEGORIES, OFFER_CATEGORIES } from './menu';
import {
  CANONICAL_SITE_URL,
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  buildArticleKeywords,
  buildCalculatorKeywords,
  buildCategoryKeywords,
  buildOfferCategoryKeywords,
  buildOfferKeywords,
  buildProductKeywords,
  buildSubcategoryKeywords,
  cleanText,
  formatSeoDescription,
  formatSeoTitle,
  resolveCanonicalUrl,
} from './seo';
import { PRIVATE_NOINDEX_PATHS } from './sitemap';
import type { Brand, Category, News, Offer, Product } from '../types';

export type SeoAuditFilter =
  | 'all'
  | 'news'
  | 'offers'
  | 'products'
  | 'credit-cards'
  | 'loans'
  | 'banking'
  | 'brands'
  | 'categories';

export const SEO_AUDIT_FILTERS: { id: SeoAuditFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'news', label: 'News' },
  { id: 'offers', label: 'Offers' },
  { id: 'products', label: 'Products' },
  { id: 'credit-cards', label: 'Credit Cards' },
  { id: 'loans', label: 'Loans' },
  { id: 'banking', label: 'Banking' },
  { id: 'brands', label: 'Brands' },
  { id: 'categories', label: 'Categories' },
];

export type SeoIssueCode =
  | 'missing_title'
  | 'duplicate_title'
  | 'title_length'
  | 'missing_description'
  | 'duplicate_description'
  | 'description_length'
  | 'missing_canonical'
  | 'missing_schema'
  | 'broken_link'
  | 'missing_image_alt'
  | 'expired_offer'
  | 'thin_content';

export interface SeoAuditIssue {
  severity: 'error' | 'warning';
  code: SeoIssueCode;
  message: string;
  fix: string;
}

export interface SeoAuditEntry {
  id: string;
  path: string;
  canonicalUrl: string;
  pageType: string;
  filterGroups: SeoAuditFilter[];
  source: 'static' | 'appwrite';
  indexable: boolean;
  title: string;
  description: string;
  keywords: string;
  schemaTypes: string[];
  hasImage: boolean;
  hasImageAlt: boolean;
  brokenLinkReasons: string[];
  issues: SeoAuditIssue[];
  recommendedTitle: string;
  recommendedDescription: string;
}

export interface SeoAuditSummary {
  auditedAt: string;
  totalPublicUrls: number;
  indexableUrls: number;
  noIndexUrls: number;
  missingTitles: number;
  duplicateTitles: number;
  missingDescriptions: number;
  duplicateDescriptions: number;
  missingCanonicals: number;
  missingSchema: number;
  brokenLinks: number;
  missingImageAlt: number;
  totalIssues: number;
  errorCount: number;
  warningCount: number;
  healthScore: number;
}

export interface SeoAuditReport {
  summary: SeoAuditSummary;
  entries: SeoAuditEntry[];
}

export interface SeoAuditInput {
  origin?: string;
  now?: number;
  news?: News[];
  products?: Product[];
  offers?: Offer[];
  brands?: Brand[];
  categories?: Category[];
}

const VALID_STATIC_PATHS = new Set<string>([
  '/',
  '/category',
  '/category/all',
  '/category/news',
  '/offers',
  '/calculators',
  '/about',
  '/contact',
  '/faq',
  '/help',
  '/disclosure',
  '/privacy',
  '/terms',
  ...['latest', 'trending', 'breaking', 'featured', 'top-stories'].map((f) => `/feed/${f}`),
  ...CATEGORIES.map((c) => `/category/${c.slug}`),
  ...CATEGORIES.flatMap((c) => c.subs.map((s) => `/${c.slug}/${s.slug}`)),
  ...NEWS_CATEGORIES.map((nc) => `/news/category/${nc.slug}`),
  ...OFFER_CATEGORIES.filter((oc) => oc.slug !== 'all').map((oc) => `/offers/category/${oc.slug}`),
  ...CALCS.map((c) => `/calculators/${c.slug}`),
]);

function isValidHttpOrLocalUrl(url?: string): boolean {
  const val = cleanText(url);
  if (!val) return false;
  if (val.startsWith('/') && !val.startsWith('//')) return true;
  try {
    const parsed = new URL(val);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function isSlugUrlSafe(slug?: string): boolean {
  const clean = cleanText(slug);
  return clean.length >= 2 && /^[a-z0-9][a-z0-9-_]*$/i.test(clean);
}

function isOfferExpired(validTill?: string, now = Date.now()): boolean {
  if (!validTill) return false;
  const trimmed = validTill.trim();
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? new Date(`${trimmed}T23:59:59.999Z`).getTime()
    : new Date(trimmed).getTime();
  return Number.isFinite(parsed) && parsed < now;
}

function categoryGroupsFor(slug: string): SeoAuditFilter[] {
  const groups: SeoAuditFilter[] = ['categories'];
  if (slug === 'credit-cards') groups.push('credit-cards');
  else if (slug === 'loans') groups.push('loans');
  else if (slug === 'banking') groups.push('banking');
  return groups;
}

function productGroupsFor(categorySlug: string): SeoAuditFilter[] {
  const groups: SeoAuditFilter[] = ['products'];
  if (categorySlug === 'credit-cards') groups.push('credit-cards');
  else if (categorySlug === 'loans') groups.push('loans');
  else if (categorySlug === 'banking') groups.push('banking');
  return groups;
}

function buildStaticEntries(origin: string): SeoAuditEntry[] {
  const out: SeoAuditEntry[] = [];
  const push = (
    path: string,
    pageType: string,
    filterGroups: SeoAuditFilter[],
    title: string,
    description: string,
    keywords: string,
    schemaTypes: string[],
  ) => {
    const canonicalUrl = resolveCanonicalUrl(origin, path);
    const formattedTitle = formatSeoTitle(title);
    const formattedDesc = formatSeoDescription(description);
    out.push({
      id: `static:${path}`,
      path,
      canonicalUrl,
      pageType,
      filterGroups,
      source: 'static',
      indexable: true,
      title: formattedTitle,
      description: formattedDesc,
      keywords,
      schemaTypes,
      hasImage: true,
      hasImageAlt: true,
      brokenLinkReasons: [],
      issues: [],
      recommendedTitle: formattedTitle,
      recommendedDescription: formattedDesc,
    });
  };

  push(
    '/',
    'Homepage',
    ['news', 'categories'],
    DEFAULT_TITLE,
    DEFAULT_DESCRIPTION,
    'FORWORD, Indian finance news, credit card comparison India, loan EMI calculator, SIP calculator, bank offers India',
    ['Organization', 'WebSite', 'WebApplication', 'ItemList'],
  );

  push(
    '/category',
    'Category Hub',
    ['categories'],
    'Browse Financial Categories',
    'Explore Indian financial products, news categories, banking guides, tax planning, and calculators on FORWORD.',
    'Indian financial categories, credit cards, loans, banking, insurance, investments, government schemes, FORWORD',
    ['CollectionPage', 'ItemList', 'BreadcrumbList'],
  );

  push(
    '/category/all',
    'All Categories Directory',
    ['categories'],
    'All Finance Categories & Topics',
    'Complete directory of credit cards, banking, loans, insurance, investments, tax & savings, and Indian government schemes.',
    'all finance categories India, banking products directory, personal finance topics, FORWORD',
    ['CollectionPage', 'ItemList', 'BreadcrumbList'],
  );

  push(
    '/category/news',
    'News Categories Hub',
    ['news', 'categories'],
    'Indian Finance News Categories',
    'Browse 18 verified Indian financial news beats including markets, banking, RBI policy, personal finance, tax, and economy.',
    'Indian finance news categories, RBI news, stock market news India, banking news, personal finance news, FORWORD',
    ['CollectionPage', 'ItemList', 'BreadcrumbList'],
  );

  push(
    '/offers',
    'Offers Hub',
    ['offers'],
    'Bank, Credit Card & Brand Offers in India',
    'Discover verified Indian bank deals, credit card instant discounts, cashback promotions, and exclusive partner offers on FORWORD.',
    buildOfferCategoryKeywords('all'),
    ['CollectionPage', 'ItemList', 'BreadcrumbList'],
  );

  push(
    '/calculators',
    'Calculators Hub',
    ['categories'],
    'Free Indian Financial Calculators',
    'Calculate loan EMI, SIP returns, income tax under Old vs New regime, FD, RD, PPF, NPS, HRA, and gratuity online on FORWORD.',
    'Indian financial calculators, EMI calculator, SIP calculator, income tax calculator India, FD calculator, PPF calculator, FORWORD',
    ['CollectionPage', 'ItemList', 'BreadcrumbList'],
  );

  // 7 Finance Categories & all 68+ Subcategories
  for (const cat of CATEGORIES) {
    const groups = categoryGroupsFor(cat.slug);
    push(
      `/category/${cat.slug}`,
      'Category Landing',
      groups,
      `${cat.label} in India – Compare & Guides`,
      `Compare ${cat.label.toLowerCase()} options in India on FORWORD. Explore ${cat.subs.slice(0, 4).map((s) => s.label).join(', ')} and verified comparisons.`,
      buildCategoryKeywords(cat.slug, cat.label),
      ['CollectionPage', 'ItemList', 'BreadcrumbList'],
    );
    for (const sub of cat.subs) {
      const subGroups: SeoAuditFilter[] = [...groups];
      const effectiveMode = sub.mode ?? cat.mode;
      if (effectiveMode === 'products' && !subGroups.includes('products')) subGroups.push('products');
      const schemaTypes =
        effectiveMode === 'eligibility'
          ? ['WebPage', 'BreadcrumbList']
          : effectiveMode === 'compare'
            ? ['CollectionPage', 'BreadcrumbList']
            : ['CollectionPage', 'ItemList', 'BreadcrumbList'];
      push(
        `/${cat.slug}/${sub.slug}`,
        effectiveMode === 'guides' ? 'Category Guide' : effectiveMode === 'eligibility' ? 'Eligibility Tool' : 'Subcategory Listing',
        subGroups,
        `${sub.label} – ${cat.label} India`,
        `Compare and research ${sub.label.toLowerCase()} under ${cat.label.toLowerCase()} in India with verified fee schedules, benefits, and eligibility on FORWORD.`,
        buildSubcategoryKeywords(cat.slug, sub.label, cat.label),
        schemaTypes,
      );
    }
  }

  // 18 News Categories
  for (const nc of NEWS_CATEGORIES) {
    push(
      `/news/category/${nc.slug}`,
      'News Category',
      ['news', 'categories'],
      `${nc.name} News India`,
      `Read the latest ${nc.name.toLowerCase()} news, policy updates, and financial analysis in India on FORWORD.`,
      `${nc.name} news India, latest ${nc.name.toLowerCase()} updates, Indian financial news, FORWORD`,
      ['CollectionPage', 'ItemList', 'BreadcrumbList'],
    );
  }

  // 12 Offer Categories (excluding 'all')
  for (const oc of OFFER_CATEGORIES) {
    if (oc.slug === 'all') continue;
    push(
      `/offers/category/${oc.slug}`,
      'Offer Category',
      ['offers', 'categories'],
      `${oc.label} Offers & Deals in India`,
      `Explore verified ${oc.label.toLowerCase()} bank offers, instant discounts, cashback codes, and partner deals across India on FORWORD.`,
      buildOfferCategoryKeywords(oc.slug),
      ['CollectionPage', 'ItemList', 'BreadcrumbList'],
    );
  }

  // 12 Financial Calculators
  for (const calc of CALCS) {
    push(
      `/calculators/${calc.slug}`,
      'Financial Calculator',
      ['categories'],
      `${calc.title} India – Free Online Tool`,
      `${calc.desc} Free online ${calc.title.toLowerCase()} for India on FORWORD with instant breakdown and clear assumptions.`,
      buildCalculatorKeywords(calc),
      ['WebApplication', 'BreadcrumbList'],
    );
  }

  // 5 News Feeds
  const feedDescriptions: Record<string, string> = {
    latest: 'Latest verified Indian financial news, RBI announcements, market updates, and personal finance stories on FORWORD.',
    trending: 'Most-read trending financial news and money stories across India right now on FORWORD.',
    breaking: 'Breaking business, banking, stock market, and RBI monetary policy alerts in India on FORWORD.',
    featured: 'Editor-picked deep dives and featured Indian personal finance analysis from the FORWORD newsroom.',
    'top-stories': 'Top Indian finance, economy, banking, and investing headlines curated daily on FORWORD.',
  };
  for (const [slug, desc] of Object.entries(feedDescriptions)) {
    const label = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    push(
      `/feed/${slug}`,
      'News Feed',
      ['news'],
      `${label} Finance News India`,
      desc,
      `${label.toLowerCase()} finance news India, business headlines India, FORWORD`,
      ['CollectionPage', 'ItemList', 'BreadcrumbList'],
    );
  }

  // Trust, Support & Legal Pages
  const trustPages: [string, string, string, string, string[]][] = [
    ['/about', 'About FORWORD – Indian Personal Finance Platform', 'Learn how FORWORD helps Indians compare credit cards, loans, banking, insurance, and track verified financial news.', 'about FORWORD, Indian personal finance editorial standards', ['AboutPage', 'Organization', 'BreadcrumbList']],
    ['/contact', 'Contact FORWORD – Editorial & Support Desk', 'Reach the FORWORD team for editorial corrections, partnership queries, support requests, and privacy inquiries.', 'contact FORWORD, finance support India, editorial desk', ['ContactPage', 'BreadcrumbList']],
    ['/faq', 'Frequently Asked Questions – FORWORD', 'Answers to common questions about FORWORD product comparisons, calculators, news sourcing, and account safety.', 'FORWORD FAQ, credit card comparison FAQ, financial calculators FAQ', ['FAQPage', 'BreadcrumbList']],
    ['/help', 'Help & Support Center – FORWORD', 'Get help with FORWORD product comparisons, financial calculators, news feeds, and account settings.', 'FORWORD help center, user support India', ['WebPage', 'BreadcrumbList']],
    ['/disclosure', 'Affiliate & Editorial Disclosure – FORWORD', 'Read FORWORD’s transparent editorial independence policy and affiliate partner disclosure for financial products.', 'FORWORD affiliate disclosure, editorial independence policy', ['WebPage', 'BreadcrumbList']],
    ['/privacy', 'Privacy Policy – FORWORD', 'Understand how FORWORD collects, protects, and manages your personal data and preferences.', 'FORWORD privacy policy, data protection India', ['WebPage', 'BreadcrumbList']],
    ['/terms', 'Terms of Service – FORWORD', 'Review the terms and conditions governing the use of FORWORD news, comparisons, offers, and calculators.', 'FORWORD terms of service, legal disclaimer', ['WebPage', 'BreadcrumbList']],
  ];
  for (const [path, title, desc, keywords, schemas] of trustPages) {
    push(path, 'Trust & Legal', ['categories'], title, desc, keywords, schemas);
  }

  return out;
}

/**
 * Pure automated SEO auditor evaluating static public architecture + live Appwrite published records.
 */
export function runSeoAudit(input: SeoAuditInput = {}): SeoAuditReport {
  const origin = input.origin || CANONICAL_SITE_URL;
  const now = input.now ?? Date.now();
  const auditedAt = new Date(now).toISOString();

  const entries: SeoAuditEntry[] = [...buildStaticEntries(origin)];
  const brandIds = new Set((input.brands ?? []).map((b) => b.$id));

  // Audit dynamic published News Articles
  for (const n of input.news ?? []) {
    const rawSlug = cleanText(n.slug);
    const path = rawSlug ? `/news/${rawSlug}` : '';
    const rawTitle = cleanText(n.title);
    const rawDesc = cleanText(n.summary);
    const recTitle = formatSeoTitle(rawTitle || 'Finance News Article');
    const recDesc = formatSeoDescription(rawDesc || `${rawTitle} – Read verified Indian finance news on FORWORD.`);
    const brokenLinkReasons: string[] = [];
    if (!isSlugUrlSafe(rawSlug)) brokenLinkReasons.push('Invalid or missing URL slug');
    if (n.sourceUrl && !isValidHttpOrLocalUrl(n.sourceUrl)) brokenLinkReasons.push('Invalid sourceUrl');
    if (n.categorySlug && !VALID_STATIC_PATHS.has(`/news/category/${n.categorySlug}`)) {
      brokenLinkReasons.push(`Unknown news category slug: ${n.categorySlug}`);
    }

    const entry: SeoAuditEntry = {
      id: `news:${n.$id}`,
      path,
      canonicalUrl: path ? resolveCanonicalUrl(origin, path) : '',
      pageType: 'News Article',
      filterGroups: ['news'],
      source: 'appwrite',
      indexable: n.status === 'approved',
      title: rawTitle ? formatSeoTitle(rawTitle) : '',
      description: rawDesc ? formatSeoDescription(rawDesc) : '',
      keywords: buildArticleKeywords({ title: rawTitle || 'Finance News', categoryName: n.categoryName || 'Finance', publisher: n.publisher }),
      schemaTypes: ['NewsArticle', 'BreadcrumbList'],
      hasImage: Boolean(cleanText(n.imageUrl)),
      hasImageAlt: Boolean(rawTitle),
      brokenLinkReasons,
      issues: [],
      recommendedTitle: recTitle,
      recommendedDescription: recDesc,
    };

    if (cleanText(n.body).length < 180) {
      entry.issues.push({
        severity: 'warning',
        code: 'thin_content',
        message: 'Article body is short (< 180 characters), which may limit Google News & Search value.',
        fix: 'Expand original reporting, key takeaways, and verified data points in Appwrite.',
      });
    }
    entries.push(entry);
  }

  // Audit dynamic published Products
  for (const p of input.products ?? []) {
    const rawSlug = cleanText(p.slug);
    const path = rawSlug ? `/product/${rawSlug}` : '';
    const rawName = cleanText(p.name);
    const rawDesc = cleanText(p.summary);
    const recTitle = formatSeoTitle(rawName ? `${rawName} – ${p.bankName}` : 'Financial Product');
    const recDesc = formatSeoDescription(
      rawDesc || `Compare ${rawName} by ${p.bankName} — fees, benefits, eligibility, and verified facts on FORWORD.`,
    );
    const brokenLinkReasons: string[] = [];
    if (!isSlugUrlSafe(rawSlug)) brokenLinkReasons.push('Invalid or missing product slug');
    if (!isValidHttpOrLocalUrl(p.applyUrl)) brokenLinkReasons.push('Missing or invalid partner applyUrl');
    if (p.category && !VALID_STATIC_PATHS.has(`/category/${p.category}`)) {
      brokenLinkReasons.push(`Unknown product category: ${p.category}`);
    }

    entries.push({
      id: `product:${p.$id}`,
      path,
      canonicalUrl: path ? resolveCanonicalUrl(origin, path) : '',
      pageType: 'Financial Product',
      filterGroups: productGroupsFor(p.category),
      source: 'appwrite',
      indexable: p.status === 'approved',
      title: rawName ? formatSeoTitle(`${rawName} – ${p.bankName}`) : '',
      description: rawDesc ? formatSeoDescription(rawDesc) : '',
      keywords: buildProductKeywords({ name: rawName || 'Product', bankName: p.bankName, category: p.category, subcategory: p.subcategory }),
      schemaTypes: ['FinancialProduct', 'BreadcrumbList'],
      hasImage: Boolean(cleanText(p.bankLogo)),
      hasImageAlt: Boolean(rawName || p.bankName),
      brokenLinkReasons,
      issues: [],
      recommendedTitle: recTitle,
      recommendedDescription: recDesc,
    });
  }

  // Audit dynamic published Offers
  for (const o of input.offers ?? []) {
    const rawId = cleanText(o.$id);
    const path = rawId ? `/offers/${rawId}` : '';
    const rawTitle = cleanText(o.title);
    const rawDesc = cleanText(o.description);
    const expired = isOfferExpired(o.validTill, now);
    const brokenLinkReasons: string[] = [];
    if (!isValidHttpOrLocalUrl(o.externalUrl)) brokenLinkReasons.push('Missing or invalid external offer URL');
    if (brandIds.size > 0 && o.brandId && !brandIds.has(o.brandId)) {
      brokenLinkReasons.push(`Referenced brandId "${o.brandId}" not found in published brands`);
    }

    const entry: SeoAuditEntry = {
      id: `offer:${o.$id}`,
      path,
      canonicalUrl: path ? resolveCanonicalUrl(origin, path) : '',
      pageType: 'Partner Offer',
      filterGroups: ['offers'],
      source: 'appwrite',
      indexable: o.status === 'approved' && !expired,
      title: rawTitle ? formatSeoTitle(`${rawTitle} – ${o.brandName}`) : '',
      description: rawDesc ? formatSeoDescription(rawDesc) : '',
      keywords: buildOfferKeywords({ title: rawTitle || 'Offer', brandName: o.brandName, category: o.category, discount: o.discount }),
      schemaTypes: ['Offer', 'BreadcrumbList'],
      hasImage: Boolean(cleanText(o.imageUrl || o.brandLogo)),
      hasImageAlt: Boolean(rawTitle || o.brandName),
      brokenLinkReasons,
      issues: [],
      recommendedTitle: formatSeoTitle(`${rawTitle} – ${o.brandName} Offer`),
      recommendedDescription: formatSeoDescription(rawDesc || `${o.discount} offer from ${o.brandName}. Check validity and terms on FORWORD.`),
    };
    if (expired) {
      entry.issues.push({
        severity: 'warning',
        code: 'expired_offer',
        message: `Offer expired on ${o.validTill} and should be archived or refreshed.`,
        fix: 'Update validTill in Appwrite if renewed, or archive the document so expired offers stay out of sitemaps.',
      });
    }
    entries.push(entry);
  }

  // Audit dynamic published Brands
  for (const b of input.brands ?? []) {
    const rawId = cleanText(b.$id);
    const path = rawId ? `/brands/${rawId}` : '';
    const rawName = cleanText(b.name);
    const rawDesc = cleanText(b.description);
    entries.push({
      id: `brand:${b.$id}`,
      path,
      canonicalUrl: path ? resolveCanonicalUrl(origin, path) : '',
      pageType: 'Brand Page',
      filterGroups: ['brands'],
      source: 'appwrite',
      indexable: b.status === 'approved',
      title: rawName ? formatSeoTitle(`${rawName} Offers & Deals`) : '',
      description: rawDesc ? formatSeoDescription(rawDesc) : '',
      keywords: `${rawName} offers India, ${rawName} credit card deals, ${rawName} bank offers, FORWORD`,
      schemaTypes: ['Organization', 'ItemList', 'BreadcrumbList'],
      hasImage: Boolean(cleanText(b.logoUrl)),
      hasImageAlt: Boolean(rawName),
      brokenLinkReasons: rawId ? [] : ['Missing brand document ID'],
      issues: [],
      recommendedTitle: formatSeoTitle(`${rawName} Offers & Partner Deals`),
      recommendedDescription: formatSeoDescription(rawDesc || `Explore verified ${rawName} offers, cashback deals, and financial products on FORWORD.`),
    });
  }

  // Evaluate duplicates across indexable entries
  const titleCounts = new Map<string, number>();
  const descCounts = new Map<string, number>();
  for (const e of entries) {
    if (!e.indexable) continue;
    const tKey = cleanText(e.title).toLowerCase();
    const dKey = cleanText(e.description).toLowerCase();
    if (tKey) titleCounts.set(tKey, (titleCounts.get(tKey) ?? 0) + 1);
    if (dKey) descCounts.set(dKey, (descCounts.get(dKey) ?? 0) + 1);
  }

  let missingTitles = 0;
  let duplicateTitles = 0;
  let missingDescriptions = 0;
  let duplicateDescriptions = 0;
  let missingCanonicals = 0;
  let missingSchema = 0;
  let brokenLinks = 0;
  let missingImageAlt = 0;
  let errorCount = 0;
  let warningCount = 0;

  for (const e of entries) {
    const t = cleanText(e.title);
    const d = cleanText(e.description);

    if (!t) {
      missingTitles++;
      e.issues.push({
        severity: 'error',
        code: 'missing_title',
        message: 'Page is missing an SEO title.',
        fix: `Set title to: "${e.recommendedTitle}"`,
      });
    } else {
      if (e.indexable && (titleCounts.get(t.toLowerCase()) ?? 0) > 1) {
        duplicateTitles++;
        e.issues.push({
          severity: 'error',
          code: 'duplicate_title',
          message: `Duplicate SEO title detected across multiple URLs: "${t}".`,
          fix: 'Differentiate the page title by adding the bank name, subcategory, or primary benefit.',
        });
      }
      if (t.length < 20 || t.length > 68) {
        e.issues.push({
          severity: 'warning',
          code: 'title_length',
          message: `SEO title length is ${t.length} chars (ideal 25–65 chars).`,
          fix: 'Adjust the title so the primary keyword appears cleanly without search snippet truncation.',
        });
      }
    }

    if (!d) {
      missingDescriptions++;
      e.issues.push({
        severity: 'error',
        code: 'missing_description',
        message: 'Page is missing a meta description.',
        fix: `Set meta description to: "${e.recommendedDescription}"`,
      });
    } else {
      if (e.indexable && (descCounts.get(d.toLowerCase()) ?? 0) > 1) {
        duplicateDescriptions++;
        e.issues.push({
          severity: 'error',
          code: 'duplicate_description',
          message: 'Duplicate meta description detected on another indexable URL.',
          fix: 'Write a unique 120–158 character summary tailored specifically to this page.',
        });
      }
      if (d.length < 60 || d.length > 165) {
        e.issues.push({
          severity: 'warning',
          code: 'description_length',
          message: `Meta description length is ${d.length} chars (ideal 70–158 chars).`,
          fix: 'Refine summary length to 110–158 characters for clean SERP display.',
        });
      }
    }

    if (!cleanText(e.canonicalUrl)) {
      missingCanonicals++;
      e.issues.push({
        severity: 'error',
        code: 'missing_canonical',
        message: 'Canonical URL could not be resolved.',
        fix: 'Ensure the record has a valid URL-safe slug so a self-referencing canonical tag is generated.',
      });
    }

    if (!e.schemaTypes.length) {
      missingSchema++;
      e.issues.push({
        severity: 'error',
        code: 'missing_schema',
        message: 'No Schema.org JSON-LD structured data is attached.',
        fix: 'Attach the matching Schema.org type (NewsArticle, FinancialProduct, Offer, WebApplication, or CollectionPage).',
      });
    }

    if (e.brokenLinkReasons.length > 0) {
      brokenLinks += e.brokenLinkReasons.length;
      for (const reason of e.brokenLinkReasons) {
        e.issues.push({
          severity: 'error',
          code: 'broken_link',
          message: reason,
          fix: 'Correct the slug, category reference, or outbound HTTPS URL in Appwrite.',
        });
      }
    }

    if (e.hasImage && !e.hasImageAlt) {
      missingImageAlt++;
      e.issues.push({
        severity: 'warning',
        code: 'missing_image_alt',
        message: 'Primary image is missing descriptive alt text.',
        fix: 'Ensure the document title/name is populated so image alt text renders accurately.',
      });
    }

    for (const issue of e.issues) {
      if (issue.severity === 'error') errorCount++;
      else warningCount++;
    }
  }

  const indexableUrls = entries.filter((e) => e.indexable).length;
  const noIndexUrls = PRIVATE_NOINDEX_PATHS.length + entries.filter((e) => !e.indexable).length;
  const totalIssues = errorCount + warningCount;
  const penalty = Math.min(100, errorCount * 5 + warningCount * 2);
  const healthScore = Math.max(0, 100 - penalty);

  return {
    summary: {
      auditedAt,
      totalPublicUrls: entries.length,
      indexableUrls,
      noIndexUrls,
      missingTitles,
      duplicateTitles,
      missingDescriptions,
      duplicateDescriptions,
      missingCanonicals,
      missingSchema,
      brokenLinks,
      missingImageAlt,
      totalIssues,
      errorCount,
      warningCount,
      healthScore,
    },
    entries,
  };
}

export function filterAuditEntries(
  entries: SeoAuditEntry[],
  filter: SeoAuditFilter,
  opts: { issuesOnly?: boolean; query?: string } = {},
): SeoAuditEntry[] {
  const q = cleanText(opts.query).toLowerCase();
  return entries.filter((entry) => {
    if (filter !== 'all' && !entry.filterGroups.includes(filter)) return false;
    if (opts.issuesOnly && entry.issues.length === 0) return false;
    if (q) {
      const hay = `${entry.path} ${entry.title} ${entry.pageType} ${entry.schemaTypes.join(' ')}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
