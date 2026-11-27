export const SITE_NAME = 'FORWORD';
export const PRIMARY_SITE_URL = 'https://forword.in';
export const CANONICAL_SITE_URL = 'https://www.forword.in';
export const DEFAULT_SITE_URL = CANONICAL_SITE_URL;
export const DEFAULT_TITLE = 'FORWORD – Indian Finance News, Products & Calculators';
export const DEFAULT_DESCRIPTION =
  'Make smarter money decisions in India with FORWORD. Read verified financial news, compare credit cards, loans & insurance, use calculators, and find offers.';
export const DEFAULT_KEYWORDS =
  'FORWORD, Indian finance, personal finance India, financial news India, credit card comparison, loan EMI calculator, SIP calculator, income tax calculator India, finance offers';
export const DEFAULT_OG_IMAGE_PATH = '/og-image.jpg';
export const DEFAULT_OG_IMAGE_ALT = 'FORWORD – Indian Finance News, Product Comparisons, Calculators & Offers';

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export interface SeoConfig {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalPath?: string;
  image?: string;
  imageAlt?: string;
  type?: 'website' | 'article';
  noIndex?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  author?: string;
  breadcrumbs?: BreadcrumbItem[];
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export function cleanText(value?: string | null): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatSeoTitle(pageTitle?: string): string {
  const cleaned = cleanText(pageTitle);
  if (!cleaned || cleaned.toLowerCase() === 'home' || cleaned.toLowerCase() === SITE_NAME.toLowerCase()) {
    return DEFAULT_TITLE;
  }
  if (cleaned.toLowerCase().includes(SITE_NAME.toLowerCase())) {
    return cleaned;
  }
  const suffix = ` | ${SITE_NAME}`;
  if (cleaned.length + suffix.length <= 65) {
    return `${cleaned}${suffix}`;
  }
  const clipped = cleaned.slice(0, 62 - suffix.length).replace(/\s+\S*$/, '').trim();
  return `${clipped || cleaned.slice(0, 58 - suffix.length)}…${suffix}`;
}

export function formatSeoDescription(description?: string, maxLength = 158): string {
  const cleaned = cleanText(description);
  if (!cleaned) return DEFAULT_DESCRIPTION;
  if (cleaned.length <= maxLength) return cleaned;
  const sliced = cleaned.slice(0, maxLength - 1);
  const boundary = sliced.replace(/\s+\S*$/, '').trim();
  return `${boundary || sliced.trim()}…`;
}

export function formatKeywords(terms: (string | undefined | null)[], maxCount = 8): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of terms) {
    const cleaned = cleanText(raw);
    if (!cleaned || cleaned.length < 2) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
    if (out.length >= maxCount) break;
  }
  return out.length ? out.join(', ') : DEFAULT_KEYWORDS;
}

/* ---------- Page-Specific Keyword SEO System ---------- */
const CATEGORY_KEYWORD_MAP: Record<string, string[]> = {
  'credit-cards': [
    'best credit cards in India',
    'credit card comparison India',
    'cashback credit cards',
    'lifetime free credit cards',
    'travel credit cards India',
    'RuPay UPI credit cards',
  ],
  banking: [
    'best savings account in India',
    'zero balance savings account',
    'bank interest rates India',
    'fixed deposit rates',
    'recurring deposit rates',
    'digital banking India',
  ],
  loans: [
    'personal loan interest rates India',
    'best personal loans',
    'home loan interest rates',
    'loan eligibility India',
    'car loan rates',
    'EMI comparison',
  ],
  insurance: [
    'health insurance India',
    'best term life insurance India',
    'family health insurance comparison',
    'car insurance online India',
    'claim settlement ratio',
  ],
  investments: [
    'mutual funds India',
    'SIP investment plans',
    'Nifty 50 index funds',
    'NPS Tier 1 tax benefits',
    'PPF interest rate',
    'stock market investing India',
  ],
  'tax-savings': [
    'income tax slabs India',
    'old vs new tax regime comparison',
    'tax saving investments Section 80C',
    'ITR filing guide India',
    'personal budget planning',
  ],
  'government-schemes': [
    'Indian government savings schemes',
    'PPF interest rate',
    'Sukanya Samriddhi Yojana',
    'Atal Pension Yojana',
    'PM Jan Dhan Yojana',
    'National Savings Certificate',
  ],
};

const OFFER_KEYWORD_MAP: Record<string, string[]> = {
  all: ['latest bank offers India', 'credit card offers', 'cashback deals India', 'brand discounts', 'online shopping offers'],
  bank: ['latest bank offers India', 'savings account offers', 'bank cashback deals', 'debit card discounts'],
  'credit-card': ['credit card offers India', 'credit card instant discount', 'cashback credit card deals', 'bank card offers'],
  shopping: ['online shopping bank offers', 'e-commerce card discounts', 'electronics instant discount India'],
  cashback: ['cashback offers India', 'gift voucher cashback', 'SmartBuy rewards', 'UPI cashback deals'],
  travel: ['flight booking credit card offers', 'MakeMyTrip bank discount', 'hotel card offers India'],
  food: ['Swiggy bank offers', 'dining credit card discounts', 'restaurant bill cashback India'],
  recharge: ['utility bill cashback offers', 'electricity bill credit card offer', 'mobile recharge cashback'],
  insurance: ['term insurance online discount', 'health insurance offers India', 'insurance renewal deals'],
  loan: ['zero processing fee home loan', 'personal loan offers India', 'loan balance transfer deals'],
  investment: ['zero brokerage demat offers', 'direct mutual fund SIP', 'investment platform offers India'],
  exclusive: ['exclusive finance offers India', 'verified bank partner deals', 'FORWORD exclusive offers'],
  trending: ['trending bank offers today', 'top credit card cashback deals', 'popular finance deals India'],
};

export function buildCategoryKeywords(slug: string, label: string): string {
  const mapped = CATEGORY_KEYWORD_MAP[slug] ?? [`${label} in India`, `compare ${label.toLowerCase()}`, `${label.toLowerCase()} rates`];
  return formatKeywords([...mapped, 'FORWORD']);
}

export function buildSubcategoryKeywords(catSlug: string, subLabel: string, catLabel: string): string {
  const cleanSub = cleanText(subLabel);
  const cleanCat = cleanText(catLabel);
  const base = CATEGORY_KEYWORD_MAP[catSlug] ?? [];
  return formatKeywords([
    `${cleanSub} India`,
    `${cleanSub} ${cleanCat}`,
    `compare ${cleanSub.toLowerCase()}`,
    ...base.slice(0, 3),
    'FORWORD',
  ]);
}

export function buildProductKeywords(product: {
  name: string;
  bankName: string;
  category: string;
  subcategory?: string;
}): string {
  const subText = product.subcategory ? product.subcategory.replace(/-/g, ' ') : '';
  const catText = product.category.replace(/-/g, ' ');
  return formatKeywords([
    product.name,
    `${product.name} review`,
    `${product.name} fees and benefits`,
    `${product.bankName} ${catText}`,
    subText ? `${subText} India` : undefined,
    `${product.name} eligibility`,
    'FORWORD',
  ]);
}

export function buildArticleKeywords(article: {
  title: string;
  categoryName: string;
  publisher?: string;
}): string {
  const cat = cleanText(article.categoryName);
  const titleWords = cleanText(article.title)
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !/^(with|from|that|this|what|your|here|into|over|have|more|will|just|than|they|them|after|about|means|their)$/i.test(w))
    .slice(0, 3);
  return formatKeywords([
    `${cat} India`,
    'Indian finance news',
    ...titleWords.map((w) => `${w} India`),
    'latest business news',
    article.publisher,
    'FORWORD',
  ]);
}

export function buildOfferKeywords(offer: {
  title: string;
  brandName: string;
  category: string;
  discount?: string;
}): string {
  const mapped = OFFER_KEYWORD_MAP[offer.category] ?? OFFER_KEYWORD_MAP.all;
  return formatKeywords([
    `${offer.brandName} offers`,
    `${offer.brandName} ${offer.discount || 'discount'}`,
    offer.title,
    ...mapped.slice(0, 3),
    'FORWORD',
  ]);
}

export function buildOfferCategoryKeywords(slug: string): string {
  return formatKeywords([...(OFFER_KEYWORD_MAP[slug] ?? OFFER_KEYWORD_MAP.all), 'FORWORD']);
}

export function buildCalculatorKeywords(calc: { slug: string; title: string }): string {
  return formatKeywords([
    `${calc.title} India`,
    `online ${calc.title.toLowerCase()}`,
    `free ${calc.title.toLowerCase()}`,
    'financial calculators India',
    'personal finance tools',
    'FORWORD',
  ]);
}

export function getCanonicalOrigin(origin?: string): string {
  const raw = (origin ?? '').trim().replace(/\/+$/, '');
  if (!raw) return CANONICAL_SITE_URL;
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();
    if (host === 'forword.in' || host === 'www.forword.in') return CANONICAL_SITE_URL;
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return CANONICAL_SITE_URL;
  }
}

export function resolveCanonicalUrl(origin: string, pathname: string): string {
  const base = getCanonicalOrigin(origin);
  const rawPath = (pathname || '/').split(/[?#]/)[0] || '/';
  const normalizedPath = rawPath === '/' ? '/' : `/${rawPath.replace(/^\/+|\/+$/g, '')}`;
  return `${base}${normalizedPath}`;
}

export function resolveAbsoluteUrl(origin: string, urlOrPath?: string): string {
  const base = getCanonicalOrigin(origin);
  const val = cleanText(urlOrPath);
  if (!val) return `${base}${DEFAULT_OG_IMAGE_PATH}`;
  if (/^https?:\/\//i.test(val)) {
    try {
      const parsed = new URL(val);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : `${base}${DEFAULT_OG_IMAGE_PATH}`;
    } catch {
      return `${base}${DEFAULT_OG_IMAGE_PATH}`;
    }
  }
  // Reject non-http schemes (e.g. javascript:, data:) and protocol-relative/backslash paths
  if (/^[a-z][a-z0-9+.-]*:/i.test(val) || val.startsWith('//') || val.includes('\\')) {
    return `${base}${DEFAULT_OG_IMAGE_PATH}`;
  }
  return `${base}/${val.replace(/^\/+/, '')}`;
}

/* ---------- JSON-LD Structured Data Builders ---------- */
export function buildWebsiteJsonLd(origin: string): Record<string, unknown>[] {
  const base = getCanonicalOrigin(origin);
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITE_NAME,
      url: `${base}/`,
      logo: {
        '@type': 'ImageObject',
        url: `${base}/favicon.svg`,
      },
      sameAs: [],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: `${base}/`,
      description: DEFAULT_DESCRIPTION,
      inLanguage: 'en-IN',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${base}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: SITE_NAME,
      url: `${base}/`,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'All',
      inLanguage: 'en-IN',
      description: DEFAULT_DESCRIPTION,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'INR',
      },
    },
  ];
}

export function buildBreadcrumbJsonLd(origin: string, items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: resolveCanonicalUrl(origin, item.path),
    })),
  };
}

export function buildNewsArticleJsonLd(
  origin: string,
  article: {
    title: string;
    summary?: string;
    body?: string;
    slug: string;
    imageUrl?: string;
    publishedAt: string;
    updatedAt?: string;
    author?: string;
    publisher: string;
    categoryName?: string;
    keywords?: string;
  },
): Record<string, unknown> {
  const url = resolveCanonicalUrl(origin, `/news/${article.slug}`);
  const wordCount = article.body ? cleanText(article.body).split(/\s+/).filter(Boolean).length : undefined;
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: cleanText(article.title),
    description: formatSeoDescription(article.summary || article.title),
    url,
    image: [resolveAbsoluteUrl(origin, article.imageUrl)],
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    inLanguage: 'en-IN',
    isAccessibleForFree: true,
    articleSection: article.categoryName || 'Finance',
    keywords: article.keywords || buildArticleKeywords({ title: article.title, categoryName: article.categoryName || 'Finance', publisher: article.publisher }),
    author: {
      '@type': article.author ? 'Person' : 'Organization',
      name: article.author || article.publisher || SITE_NAME,
    },
    publisher: {
      '@type': 'Organization',
      name: article.publisher || SITE_NAME,
      url: `${getCanonicalOrigin(origin)}/`,
      logo: {
        '@type': 'ImageObject',
        url: resolveAbsoluteUrl(origin, '/favicon.svg'),
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
  };
  if (wordCount && wordCount > 0) schema.wordCount = wordCount;
  return schema;
}

export function buildProductJsonLd(
  origin: string,
  product: {
    name: string;
    slug: string;
    bankName: string;
    category: string;
    summary?: string;
    bankLogo?: string;
    feeValue?: number;
    facts?: string[];
  },
): Record<string, unknown> {
  const url = resolveCanonicalUrl(origin, `/product/${product.slug}`);
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'FinancialProduct',
    name: cleanText(product.name),
    description: formatSeoDescription(
      product.summary || `Compare ${product.name} from ${product.bankName} on FORWORD — check fees, benefits, and eligibility.`,
    ),
    brand: {
      '@type': 'Brand',
      name: product.bankName,
    },
    provider: {
      '@type': 'FinancialService',
      name: product.bankName,
    },
    category: product.category.replace(/-/g, ' '),
    image: resolveAbsoluteUrl(origin, product.bankLogo),
    url,
  };
  // Include Offer only when an actual verified numeric fee/premium exists (never invent prices).
  if (typeof product.feeValue === 'number' && Number.isFinite(product.feeValue) && product.feeValue >= 0 && product.category !== 'loans') {
    schema.offers = {
      '@type': 'Offer',
      price: String(product.feeValue),
      priceCurrency: 'INR',
      availability: 'https://schema.org/InStock',
      url,
    };
  }
  if (product.facts?.length) {
    const props = product.facts
      .map((row) => row.split('|'))
      .filter((parts) => parts.length >= 2 && cleanText(parts[0]) && cleanText(parts[1]))
      .slice(0, 6)
      .map(([name, value]) => ({
        '@type': 'PropertyValue',
        name: cleanText(name),
        value: cleanText(value),
      }));
    if (props.length) schema.additionalProperty = props;
  }
  return schema;
}

export function buildOfferJsonLd(
  origin: string,
  offer: {
    id: string;
    title: string;
    description?: string;
    brandName: string;
    discount?: string;
    validTill?: string;
    imageUrl?: string;
    category?: string;
    active?: boolean;
  },
): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Offer',
    name: cleanText(offer.title),
    description: formatSeoDescription(offer.description || `${offer.discount ?? 'Exclusive'} offer from ${offer.brandName} on FORWORD.`),
    validThrough: offer.validTill || undefined,
    availability: offer.active === false ? 'https://schema.org/Discontinued' : 'https://schema.org/InStock',
    seller: {
      '@type': 'Organization',
      name: offer.brandName,
    },
    image: resolveAbsoluteUrl(origin, offer.imageUrl),
    url: resolveCanonicalUrl(origin, `/offers/${offer.id}`),
    priceCurrency: 'INR',
  };
  if (offer.category) schema.category = offer.category.replace(/-/g, ' ');
  return schema;
}

export function buildBrandJsonLd(
  origin: string,
  brand: { id: string; name: string; description?: string; logoUrl?: string },
): Record<string, unknown> {
  const url = resolveCanonicalUrl(origin, `/brands/${brand.id}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: cleanText(brand.name),
    description: formatSeoDescription(brand.description || `${brand.name} financial products and verified partner offers on FORWORD.`),
    logo: resolveAbsoluteUrl(origin, brand.logoUrl),
    url,
  };
}

export function buildItemListJsonLd(
  origin: string,
  opts: { name: string; path: string; items: { name: string; path: string; image?: string }[] },
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: cleanText(opts.name),
    url: resolveCanonicalUrl(origin, opts.path),
    numberOfItems: opts.items.length,
    itemListElement: opts.items.slice(0, 20).map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: cleanText(item.name),
      url: resolveCanonicalUrl(origin, item.path),
      ...(item.image ? { image: resolveAbsoluteUrl(origin, item.image) } : {}),
    })),
  };
}

export function buildCalculatorJsonLd(
  origin: string,
  calc: { slug: string; title: string; desc: string },
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: `${calc.title} – ${SITE_NAME}`,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'All',
    inLanguage: 'en-IN',
    url: resolveCanonicalUrl(origin, `/calculators/${calc.slug}`),
    description: formatSeoDescription(
      `${calc.desc} Free online ${calc.title.toLowerCase()} for India on FORWORD with instant breakdown and clear assumptions.`,
    ),
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'INR',
    },
  };
}

export function buildFaqJsonLd(faqs: readonly [string, string][]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(([q, a]) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: a,
      },
    })),
  };
}

export function buildCollectionJsonLd(
  origin: string,
  opts: { name: string; description: string; path: string },
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: opts.name,
    description: formatSeoDescription(opts.description),
    url: resolveCanonicalUrl(origin, opts.path),
    inLanguage: 'en-IN',
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: `${getCanonicalOrigin(origin)}/`,
    },
  };
}

export function buildWebPageJsonLd(
  origin: string,
  opts: { name: string; description: string; path: string; type?: 'WebPage' | 'AboutPage' | 'ContactPage' },
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': opts.type ?? 'WebPage',
    name: cleanText(opts.name),
    description: formatSeoDescription(opts.description),
    url: resolveCanonicalUrl(origin, opts.path),
    inLanguage: 'en-IN',
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: `${getCanonicalOrigin(origin)}/`,
    },
  };
}

export function buildHowToJsonLd(
  origin: string,
  opts: { name: string; description: string; path: string; steps: string[] },
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: cleanText(opts.name),
    description: formatSeoDescription(opts.description),
    url: resolveCanonicalUrl(origin, opts.path),
    step: opts.steps.map((text, idx) => ({
      '@type': 'HowToStep',
      position: idx + 1,
      text: cleanText(text),
    })),
  };
}

function upsertMeta(attr: 'name' | 'property', key: string, content?: string) {
  const selector = `meta[${attr}="${key}"]`;
  const existing = document.head.querySelector<HTMLMetaElement>(selector);
  if (!content) {
    existing?.remove();
    return;
  }
  if (existing) {
    existing.setAttribute('content', content);
    return;
  }
  const el = document.createElement('meta');
  el.setAttribute(attr, key);
  el.setAttribute('content', content);
  document.head.appendChild(el);
}

function upsertCanonical(href: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

const DYNAMIC_LD_ID = 'forword-dynamic-jsonld';

function upsertJsonLd(schemas: Record<string, unknown>[]) {
  const existing = document.getElementById(DYNAMIC_LD_ID);
  if (!schemas.length) {
    existing?.remove();
    return;
  }
  const payload = schemas.length === 1 ? schemas[0] : { '@context': 'https://schema.org', '@graph': schemas.map(({ ['@context']: _ctx, ...rest }) => rest) };
  const script = existing ?? document.createElement('script');
  script.id = DYNAMIC_LD_ID;
  script.setAttribute('type', 'application/ld+json');
  script.textContent = JSON.stringify(payload).replace(/</g, '\\u003c');
  if (!existing) {
    document.head.appendChild(script);
  }
}

function getVerificationToken(key: 'VITE_GOOGLE_SITE_VERIFICATION' | 'VITE_BING_SITE_VERIFICATION'): string | undefined {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
  const val = cleanText(env[key]);
  return val || undefined;
}

export function applySeo(cfg: SeoConfig = {}) {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const origin = getCanonicalOrigin(window.location.origin);
  const pathname = cfg.canonicalPath ?? window.location.pathname;
  const fullTitle = formatSeoTitle(cfg.title);
  const fullDesc = formatSeoDescription(cfg.description);
  const canonicalUrl = resolveCanonicalUrl(origin, pathname);
  const imageUrl = resolveAbsoluteUrl(origin, cfg.image);
  const imageAlt = cleanText(cfg.imageAlt) || (cfg.title ? `${cleanText(cfg.title)} – ${SITE_NAME}` : DEFAULT_OG_IMAGE_ALT);
  const ogType = cfg.type ?? 'website';
  const robots = cfg.noIndex
    ? 'noindex, nofollow'
    : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

  document.title = fullTitle;
  upsertCanonical(canonicalUrl);

  upsertMeta('name', 'description', fullDesc);
  upsertMeta('name', 'keywords', cfg.keywords || DEFAULT_KEYWORDS);
  upsertMeta('name', 'robots', robots);
  upsertMeta('name', 'googlebot', cfg.noIndex ? 'noindex, nofollow' : 'index, follow');

  // Optional Search Console & Bing Webmaster verification tokens
  const googleVerify = getVerificationToken('VITE_GOOGLE_SITE_VERIFICATION');
  if (googleVerify) upsertMeta('name', 'google-site-verification', googleVerify);
  const bingVerify = getVerificationToken('VITE_BING_SITE_VERIFICATION');
  if (bingVerify) upsertMeta('name', 'msvalidate.01', bingVerify);

  // OpenGraph
  upsertMeta('property', 'og:type', ogType);
  upsertMeta('property', 'og:site_name', SITE_NAME);
  upsertMeta('property', 'og:locale', 'en_IN');
  upsertMeta('property', 'og:title', fullTitle);
  upsertMeta('property', 'og:description', fullDesc);
  upsertMeta('property', 'og:url', canonicalUrl);
  upsertMeta('property', 'og:image', imageUrl);
  upsertMeta('property', 'og:image:alt', imageAlt);

  // Article-specific OpenGraph tags
  upsertMeta('property', 'article:published_time', ogType === 'article' ? cfg.publishedTime : undefined);
  upsertMeta('property', 'article:modified_time', ogType === 'article' ? cfg.modifiedTime : undefined);
  upsertMeta('property', 'article:section', ogType === 'article' ? cfg.section : undefined);
  upsertMeta('property', 'article:author', ogType === 'article' ? cfg.author : undefined);

  // Twitter / X Cards
  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', fullTitle);
  upsertMeta('name', 'twitter:description', fullDesc);
  upsertMeta('name', 'twitter:image', imageUrl);
  upsertMeta('name', 'twitter:image:alt', imageAlt);

  // JSON-LD Structured Data
  const graphs: Record<string, unknown>[] = [];
  if (cfg.jsonLd) {
    if (Array.isArray(cfg.jsonLd)) graphs.push(...cfg.jsonLd);
    else graphs.push(cfg.jsonLd);
  } else if (!cfg.noIndex && pathname === '/') {
    graphs.push(...buildWebsiteJsonLd(origin));
  }
  if (cfg.breadcrumbs && cfg.breadcrumbs.length > 0) {
    graphs.push(buildBreadcrumbJsonLd(origin, cfg.breadcrumbs));
  }
  upsertJsonLd(graphs);
}
