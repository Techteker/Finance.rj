import { getAccessToken, isSupabaseConfigured, supabase, TABLES } from './supabase';
import { resolveStorageMediaUrl } from './appwrite';
import { safeInternalPath, safeMediaUrl } from './format';
import type {
  AppNotification,
  Brand,
  Category,
  FavType,
  Favorite,
  HistoryItem,
  News,
  Offer,
  Product,
  RewardEvent,
  Wallet,
  Withdrawal,
} from '../types';

const UNAVAILABLE = 'This service is temporarily unavailable. Please try again later.';
const NOT_CONFIGURED =
  'Live backend is not configured yet. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect to Supabase.';
const MAX_CACHE_ENTRIES = 100;
const PUBLIC_STATUSES = ['approved', 'published'] as const;

/** Error whose message is safe to display directly to end users. */
export class ApiError extends Error {
  readonly userSafe = true;
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export function isNotFoundError(e: unknown): boolean {
  const err = (e ?? {}) as { code?: number | string; status?: number; type?: string };
  const code = String(err.code ?? '');
  return (
    Number(err.code) === 404 ||
    Number(err.status) === 404 ||
    code === 'PGRST116' ||
    String(err.type || '').toLowerCase() === 'document_not_found'
  );
}

/** Converts unknown/Supabase/HTTP errors into safe, user-facing messages without leaking schema or backend details. */
export function formatApiError(e: unknown): string {
  if (e instanceof ApiError && e.message) return e.message;
  const err = (e ?? {}) as { code?: number | string; status?: number; type?: string; message?: string };
  const numCode = Number(err.status || err.code || 0);
  const pgCode = String(err.code || '').toUpperCase();
  const type = String(err.type || '').toLowerCase();

  if (numCode === 401 || type.includes('unauthorized') || type.includes('session') || pgCode === 'PGRST301') {
    return 'Your session has expired. Please sign in again.';
  }
  if (numCode === 403 || pgCode === '42501') {
    return 'You do not have permission to perform this action.';
  }
  if (numCode === 404 || type === 'document_not_found' || pgCode === 'PGRST116') {
    return 'The requested item could not be found.';
  }
  if (numCode === 409 || type.includes('already_exists') || pgCode === '23505') {
    return 'This item already exists or was already submitted.';
  }
  if (numCode === 429 || type.includes('rate_limit')) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (numCode >= 500) return UNAVAILABLE;

  const msg = String(err.message || '');
  const name = String((e as { name?: string })?.name || '');
  if (name === 'AbortError' || /timeout|timed out|etimedout/i.test(msg)) {
    return 'The request timed out. Please try again.';
  }
  if (/failed to fetch|networkerror|network request failed|load failed/i.test(msg)) {
    return 'Unable to connect right now. Check your internet connection and try again.';
  }
  return 'Something went wrong. Please try again.';
}

/** Sanitizes user search terms for safe PostgREST ilike filter construction (blocks filter injection). */
export function sanitizeSearchFilter(term: string): string {
  return term
    .replace(/[%_\\,()*"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

function requireDb() {
  if (!isSupabaseConfigured || !supabase) {
    throw new ApiError(NOT_CONFIGURED);
  }
  return supabase;
}

// Bounded in-memory cache with in-flight promise deduplication for public read queries.
const cache = new Map<string, { t: number; v: unknown }>();
const inflight = new Map<string, Promise<unknown>>();

export function clearApiCache(): void {
  cache.clear();
  inflight.clear();
}

export async function runCached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < ttlMs) return hit.v as T;
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;
  const req = fn()
    .then((v) => {
      if (cache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey !== undefined) cache.delete(oldestKey);
      }
      cache.set(key, { t: Date.now(), v });
      return v;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, req);
  return req;
}

/* ---------- Row Mappers (Supabase snake_case -> FORWORD domain models + Appwrite Storage URLs) ---------- */

type Row = Record<string, unknown>;

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}
function optStr(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}
function numVal(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
function strArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
  return [];
}

function mapCategory(r: Row): Category {
  return {
    $id: str(r.id),
    $createdAt: str(r.created_at),
    $updatedAt: str(r.updated_at || r.created_at),
    name: str(r.name),
    slug: str(r.slug),
    kind: r.kind === 'product' ? 'product' : 'news',
    icon: optStr(r.icon),
    sortOrder: numVal(r.sort_order),
    isTrending: Boolean(r.is_trending),
  };
}

function mapNews(r: Row): News {
  const imageFileId = optStr(r.image_file_id);
  const imageUrl = resolveStorageMediaUrl(optStr(r.image_url), imageFileId, 'news-images', { width: 960, quality: 82 });
  return {
    $id: str(r.id),
    $createdAt: str(r.created_at),
    $updatedAt: str(r.updated_at || r.created_at),
    title: str(r.title),
    slug: str(r.slug),
    summary: str(r.summary),
    body: str(r.body),
    imageUrl,
    imageFileId,
    categoryName: str(r.category_name, 'Finance'),
    categorySlug: str(r.category_slug, 'finance'),
    publisher: str(r.publisher, 'FORWORD Desk'),
    sourceUrl: str(r.source_url),
    author: optStr(r.author),
    publishedAt: str(r.published_at || r.created_at),
    readTime: numVal(r.read_time) ?? 3,
    status: str(r.status, 'published'),
    isSponsored: Boolean(r.is_sponsored),
    isBreaking: Boolean(r.is_breaking),
    isFeatured: Boolean(r.is_featured),
    views: numVal(r.views) ?? 0,
    relatedProductIds: strArray(r.related_product_ids),
  };
}

function mapProduct(r: Row, defaultCategory?: string): Product {
  const bankLogoFileId = optStr(r.bank_logo_file_id);
  const bankLogo = resolveStorageMediaUrl(optStr(r.bank_logo), bankLogoFileId, 'product-images', { width: 256, quality: 85 });
  const facts = strArray(r.facts);
  if (!facts.length) {
    if (numVal(r.annual_fee) !== undefined) facts.push(`Annual fee|₹${numVal(r.annual_fee)}`);
    if (numVal(r.joining_fee) !== undefined) facts.push(`Joining fee|₹${numVal(r.joining_fee)}`);
    if (numVal(r.interest_rate) !== undefined) facts.push(`Interest rate|${numVal(r.interest_rate)}% p.a.`);
    if (numVal(r.processing_fee) !== undefined) facts.push(`Processing fee|₹${numVal(r.processing_fee)}`);
    if (numVal(r.reward_rate) !== undefined) facts.push(`Reward rate|${numVal(r.reward_rate)}%`);
  }
  return {
    $id: str(r.id),
    $createdAt: str(r.created_at),
    $updatedAt: str(r.updated_at || r.created_at),
    name: str(r.name),
    slug: str(r.slug),
    type: str(r.type, defaultCategory ?? 'product'),
    category: str(r.category, defaultCategory ?? 'products'),
    subcategory: str(r.subcategory),
    bankName: str(r.bank_name),
    bankLogo,
    bankLogoFileId,
    summary: optStr(r.summary),
    facts,
    benefits: strArray(r.benefits),
    exclusions: strArray(r.exclusions),
    pros: strArray(r.pros),
    cons: strArray(r.cons),
    features: strArray(r.features),
    eligibility: optStr(r.eligibility),
    customerTypes: strArray(r.customer_types),
    feeValue: numVal(r.fee_value ?? r.annual_fee ?? r.interest_rate),
    rewardRate: numVal(r.reward_rate),
    cashbackRate: numVal(r.cashback_rate),
    editorialRank: numVal(r.editorial_rank) ?? 100,
    minIncome: numVal(r.min_income),
    minAge: numVal(r.min_age),
    maxAge: numVal(r.max_age),
    applyUrl: str(r.apply_url),
    verifiedAt: str(r.verified_at || r.updated_at || r.created_at),
    status: str(r.status, 'approved'),
    review: optStr(r.review),
    applySteps: strArray(r.apply_steps),
  };
}

function mapOffer(r: Row): Offer {
  const imageFileId = optStr(r.image_file_id);
  const imageUrl = resolveStorageMediaUrl(optStr(r.image_url), imageFileId, 'offer-banners', { width: 960, quality: 82 });
  const brandLogo = resolveStorageMediaUrl(optStr(r.brand_logo), undefined, 'brand-logos', { width: 256, quality: 85 });
  return {
    $id: str(r.id),
    $createdAt: str(r.created_at),
    $updatedAt: str(r.updated_at || r.created_at),
    title: str(r.title),
    brandId: str(r.brand_id),
    brandName: str(r.brand_name),
    brandLogo,
    imageUrl,
    imageFileId,
    description: str(r.description),
    discount: str(r.discount),
    couponCode: optStr(r.coupon_code),
    validTill: str(r.valid_till),
    terms: strArray(r.terms),
    externalUrl: str(r.external_url),
    category: str(r.category, 'all'),
    isExclusive: Boolean(r.is_exclusive),
    isTrending: Boolean(r.is_trending),
    status: str(r.status, 'approved'),
  };
}

function mapBrand(r: Row): Brand {
  const logoFileId = optStr(r.logo_file_id);
  return {
    $id: str(r.id),
    $createdAt: str(r.created_at),
    $updatedAt: str(r.updated_at || r.created_at),
    name: str(r.name),
    logoUrl: resolveStorageMediaUrl(optStr(r.logo_url), logoFileId, 'brand-logos', { width: 256, quality: 85 }),
    logoFileId,
    description: optStr(r.description),
    status: str(r.status, 'approved'),
  };
}

function mapFavorite(r: Row): Favorite {
  return {
    $id: str(r.id),
    $createdAt: str(r.created_at),
    $updatedAt: str(r.updated_at || r.created_at),
    userId: str(r.user_id),
    itemType: (str(r.item_type, 'news') as FavType),
    itemId: str(r.item_id),
    title: str(r.title),
    subtitle: optStr(r.subtitle),
    imageUrl: safeMediaUrl(optStr(r.image_url)),
    href: safeInternalPath(str(r.href)) ?? '/',
  };
}

function mapHistory(r: Row): HistoryItem {
  return {
    $id: str(r.id),
    $createdAt: str(r.created_at),
    $updatedAt: str(r.updated_at || r.created_at),
    userId: str(r.user_id),
    newsId: str(r.news_id),
    title: str(r.title),
    slug: str(r.slug),
    imageUrl: safeMediaUrl(optStr(r.image_url)),
    categoryName: optStr(r.category_name),
  };
}

function mapNotification(r: Row): AppNotification {
  const k = str(r.kind, 'system');
  const kind: AppNotification['kind'] =
    k === 'news' || k === 'offer' || k === 'reward' || k === 'system' ? k : 'system';
  return {
    $id: str(r.id),
    $createdAt: str(r.created_at),
    $updatedAt: str(r.updated_at || r.created_at),
    userId: optStr(r.user_id),
    title: str(r.title),
    body: optStr(r.body),
    kind,
    href: optStr(r.href),
  };
}

function dedupeBySlug<T extends { slug: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const k = item.slug.toLowerCase();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/* ---------- News ---------- */
export type FeedKind = 'latest' | 'trending' | 'breaking' | 'featured' | 'recommended' | 'top-stories';

export async function getNews(opts: { category?: string; kind?: FeedKind; limit?: number; offset?: number } = {}): Promise<News[]> {
  const db = requireDb();
  const safeLimit = Math.min(100, Math.max(1, Math.trunc(opts.limit ?? 20)));
  const safeOffset = Math.max(0, Math.trunc(opts.offset ?? 0));

  let query = db
    .from(TABLES.news)
    .select('*')
    .in('status', [...PUBLIC_STATUSES]);

  if (opts.category) {
    query = query.eq('category_slug', opts.category);
  }
  switch (opts.kind) {
    case 'trending':
    case 'top-stories':
      query = query.order('views', { ascending: false }).order('published_at', { ascending: false });
      break;
    case 'breaking':
      query = query.eq('is_breaking', true).order('published_at', { ascending: false });
      break;
    case 'featured':
      query = query.eq('is_featured', true).order('published_at', { ascending: false });
      break;
    case 'recommended':
      query = query.order('updated_at', { ascending: false });
      break;
    default:
      query = query.order('published_at', { ascending: false });
  }

  const { data, error } = await query.range(safeOffset, safeOffset + safeLimit - 1);
  if (error) throw error;
  return (data ?? []).map((row) => mapNews(row as Row));
}

export async function getNewsBySlug(slug: string): Promise<News | null> {
  const clean = slug.trim();
  if (!clean) return null;
  const db = requireDb();
  const { data, error } = await db
    .from(TABLES.news)
    .select('*')
    .in('status', [...PUBLIC_STATUSES])
    .eq('slug', clean)
    .maybeSingle();
  if (error) throw error;
  return data ? mapNews(data as Row) : null;
}

export const getNewsCategories = () =>
  runCached('news-cats', 10 * 60_000, async (): Promise<Category[]> => {
    const db = requireDb();
    const { data, error } = await db
      .from(TABLES.categories)
      .select('*')
      .eq('kind', 'news')
      .order('sort_order', { ascending: true })
      .limit(40);
    if (error) throw error;
    return (data ?? []).map((row) => mapCategory(row as Row));
  });

export const getTrendingTerms = () =>
  runCached('trend-terms', 10 * 60_000, async (): Promise<Category[]> => {
    const db = requireDb();
    const { data, error } = await db
      .from(TABLES.categories)
      .select('*')
      .eq('is_trending', true)
      .order('sort_order', { ascending: true })
      .limit(8);
    if (error) throw error;
    return (data ?? []).map((row) => mapCategory(row as Row));
  });

/* ---------- Products, Credit Cards & Loans ---------- */
export async function getProducts(o: { category: string; subcategory?: string; limit?: number; offset?: number }): Promise<Product[]> {
  const db = requireDb();
  const safeLimit = Math.min(100, Math.max(1, Math.trunc(o.limit ?? 50)));
  const safeOffset = Math.max(0, Math.trunc(o.offset ?? 0));

  let prodQuery = db
    .from(TABLES.products)
    .select('*')
    .in('status', [...PUBLIC_STATUSES])
    .eq('category', o.category)
    .order('editorial_rank', { ascending: true });
  if (o.subcategory) prodQuery = prodQuery.eq('subcategory', o.subcategory);

  const tasks: Promise<Product[]>[] = [
    Promise.resolve(
      prodQuery.range(safeOffset, safeOffset + safeLimit - 1).then(({ data, error }) => {
        if (error) throw error;
        return (data ?? []).map((r) => mapProduct(r as Row, o.category));
      }),
    ),
  ];

  // Also query dedicated credit_cards / loans tables when applicable so both tables stay unified
  if (o.category === 'credit-cards') {
    let ccQuery = db
      .from(TABLES.creditCards)
      .select('*')
      .in('status', [...PUBLIC_STATUSES])
      .order('editorial_rank', { ascending: true });
    if (o.subcategory) ccQuery = ccQuery.eq('subcategory', o.subcategory);
    tasks.push(
      Promise.resolve(
        ccQuery.range(safeOffset, safeOffset + safeLimit - 1).then(({ data, error }) => {
          if (error) return [];
          return (data ?? []).map((r) => mapProduct(r as Row, 'credit-cards'));
        }),
      ),
    );
  } else if (o.category === 'loans') {
    let loanQuery = db
      .from(TABLES.loans)
      .select('*')
      .in('status', [...PUBLIC_STATUSES])
      .order('editorial_rank', { ascending: true });
    if (o.subcategory) loanQuery = loanQuery.eq('subcategory', o.subcategory);
    tasks.push(
      Promise.resolve(
        loanQuery.range(safeOffset, safeOffset + safeLimit - 1).then(({ data, error }) => {
          if (error) return [];
          return (data ?? []).map((r) => mapProduct(r as Row, 'loans'));
        }),
      ),
    );
  }

  const results = await Promise.all(tasks);
  return dedupeBySlug(results.flat())
    .sort((a, b) => (a.editorialRank ?? 100) - (b.editorialRank ?? 100))
    .slice(0, safeLimit);
}

export const getProductBySlug = (slug: string) => {
  const clean = slug.trim();
  if (!clean) return Promise.resolve(null);
  return runCached(`product:${clean}`, 2 * 60_000, async (): Promise<Product | null> => {
    const db = requireDb();
    const { data: prod, error } = await db
      .from(TABLES.products)
      .select('*')
      .in('status', [...PUBLIC_STATUSES])
      .eq('slug', clean)
      .maybeSingle();
    if (error) throw error;
    if (prod) return mapProduct(prod as Row);

    const { data: cc } = await db
      .from(TABLES.creditCards)
      .select('*')
      .in('status', [...PUBLIC_STATUSES])
      .eq('slug', clean)
      .maybeSingle();
    if (cc) return mapProduct(cc as Row, 'credit-cards');

    const { data: loan } = await db
      .from(TABLES.loans)
      .select('*')
      .in('status', [...PUBLIC_STATUSES])
      .eq('slug', clean)
      .maybeSingle();
    return loan ? mapProduct(loan as Row, 'loans') : null;
  });
};

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  const clean = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean))).slice(0, 10);
  if (!clean.length) return [];
  const db = requireDb();

  const [pRes, ccRes, loanRes] = await Promise.all([
    db.from(TABLES.products).select('*').in('status', [...PUBLIC_STATUSES]).in('id', clean),
    db.from(TABLES.creditCards).select('*').in('status', [...PUBLIC_STATUSES]).in('id', clean),
    db.from(TABLES.loans).select('*').in('status', [...PUBLIC_STATUSES]).in('id', clean),
  ]);
  if (pRes.error) throw pRes.error;

  const combined = [
    ...(pRes.data ?? []).map((r) => mapProduct(r as Row)),
    ...(ccRes.data ?? []).map((r) => mapProduct(r as Row, 'credit-cards')),
    ...(loanRes.data ?? []).map((r) => mapProduct(r as Row, 'loans')),
  ];
  const byId = new Map(combined.map((item) => [item.$id, item]));
  return clean.map((id) => byId.get(id)).filter((x): x is Product => Boolean(x));
}

/* ---------- Offers & Brands ---------- */
export function isOfferActive(validTill?: string, now = Date.now()): boolean {
  if (!validTill) return true;
  const trimmed = validTill.trim();
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? new Date(`${trimmed}T23:59:59.999Z`).getTime()
    : new Date(trimmed).getTime();
  return !Number.isFinite(parsed) || parsed >= now;
}

export async function getOffers(o: { category?: string; brandId?: string; limit?: number; offset?: number } = {}): Promise<Offer[]> {
  const db = requireDb();
  const safeLimit = Math.min(100, Math.max(1, Math.trunc(o.limit ?? 50)));
  const safeOffset = Math.max(0, Math.trunc(o.offset ?? 0));

  let query = db
    .from(TABLES.offers)
    .select('*')
    .in('status', [...PUBLIC_STATUSES])
    .order('created_at', { ascending: false });

  if (o.brandId) query = query.eq('brand_id', o.brandId);
  if (o.category === 'exclusive') query = query.eq('is_exclusive', true);
  else if (o.category === 'trending') query = query.eq('is_trending', true);
  else if (o.category && o.category !== 'all') query = query.eq('category', o.category);

  const { data, error } = await query.range(safeOffset, safeOffset + safeLimit - 1);
  if (error) throw error;
  return (data ?? []).map((r) => mapOffer(r as Row)).filter((x) => isOfferActive(x.validTill));
}

export async function getOffer(id: string): Promise<Offer | null> {
  const cleanId = id.trim();
  if (!cleanId) return null;
  const db = requireDb();
  const { data, error } = await db
    .from(TABLES.offers)
    .select('*')
    .in('status', [...PUBLIC_STATUSES])
    .eq('id', cleanId)
    .maybeSingle();
  if (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
  return data ? mapOffer(data as Row) : null;
}

export async function getBrand(id: string): Promise<Brand | null> {
  const cleanId = id.trim();
  if (!cleanId) return null;
  const db = requireDb();
  const { data, error } = await db
    .from(TABLES.brands)
    .select('*')
    .in('status', [...PUBLIC_STATUSES])
    .eq('id', cleanId)
    .maybeSingle();
  if (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
  return data ? mapBrand(data as Row) : null;
}

/* ---------- Search ---------- */
export async function searchAll(term: string) {
  const clean = sanitizeSearchFilter(term);
  if (clean.length < 2) return { news: [] as News[], products: [] as Product[], offers: [] as Offer[] };
  return runCached('search:' + clean.toLowerCase(), 2 * 60_000, async () => {
    const db = requireDb();
    const pattern = `%${clean}%`;
    const [newsRes, prodRes, ccRes, loanRes, offerRes] = await Promise.all([
      db
        .from(TABLES.news)
        .select('*')
        .in('status', [...PUBLIC_STATUSES])
        .or(`title.ilike.${pattern},summary.ilike.${pattern},category_name.ilike.${pattern}`)
        .order('published_at', { ascending: false })
        .limit(10),
      db
        .from(TABLES.products)
        .select('*')
        .in('status', [...PUBLIC_STATUSES])
        .or(`name.ilike.${pattern},bank_name.ilike.${pattern},summary.ilike.${pattern}`)
        .order('editorial_rank', { ascending: true })
        .limit(10),
      db
        .from(TABLES.creditCards)
        .select('*')
        .in('status', [...PUBLIC_STATUSES])
        .or(`name.ilike.${pattern},bank_name.ilike.${pattern},summary.ilike.${pattern}`)
        .order('editorial_rank', { ascending: true })
        .limit(8),
      db
        .from(TABLES.loans)
        .select('*')
        .in('status', [...PUBLIC_STATUSES])
        .or(`name.ilike.${pattern},bank_name.ilike.${pattern},summary.ilike.${pattern}`)
        .order('editorial_rank', { ascending: true })
        .limit(8),
      db
        .from(TABLES.offers)
        .select('*')
        .in('status', [...PUBLIC_STATUSES])
        .or(`title.ilike.${pattern},brand_name.ilike.${pattern},description.ilike.${pattern}`)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    if (newsRes.error) throw newsRes.error;
    if (prodRes.error) throw prodRes.error;
    if (offerRes.error) throw offerRes.error;

    const products = dedupeBySlug([
      ...(prodRes.data ?? []).map((r) => mapProduct(r as Row)),
      ...(ccRes.data ?? []).map((r) => mapProduct(r as Row, 'credit-cards')),
      ...(loanRes.data ?? []).map((r) => mapProduct(r as Row, 'loans')),
    ]).slice(0, 12);

    return {
      news: (newsRes.data ?? []).map((r) => mapNews(r as Row)),
      products,
      offers: (offerRes.data ?? []).map((r) => mapOffer(r as Row)).filter((x) => isOfferActive(x.validTill)),
    };
  });
}

/* ---------- Saved Articles / Favorites (RLS user-owned rows) ---------- */
export async function getFavorites(userId: string): Promise<Favorite[]> {
  const clean = userId.trim();
  if (!clean) return [];
  const db = requireDb();
  const { data, error } = await db
    .from(TABLES.savedArticles)
    .select('*')
    .eq('user_id', clean)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map((r) => mapFavorite(r as Row));
}

export async function addFavorite(
  userId: string,
  f: { itemType: FavType; itemId: string; title: string; subtitle?: string; imageUrl?: string; href: string },
): Promise<Favorite> {
  const db = requireDb();
  const safeHref = safeInternalPath(f.href) ?? '/';
  const safeImg = safeMediaUrl(f.imageUrl) ?? null;

  const { data, error } = await db
    .from(TABLES.savedArticles)
    .upsert(
      {
        user_id: userId,
        item_type: f.itemType,
        item_id: f.itemId.trim().slice(0, 64),
        title: f.title.trim().slice(0, 300),
        subtitle: f.subtitle?.trim().slice(0, 300) ?? null,
        image_url: safeImg,
        href: safeHref,
      },
      { onConflict: 'user_id,item_type,item_id' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return mapFavorite(data as Row);
}

export async function removeFavorite(docId: string): Promise<void> {
  const cleanId = docId.trim();
  if (!cleanId) return;
  const db = requireDb();
  const { error } = await db.from(TABLES.savedArticles).delete().eq('id', cleanId);
  if (error && !isNotFoundError(error)) throw error;
}

/* ---------- User Activity / Reading History, Notifications, Reports, Messages ---------- */
export async function getHistory(userId: string): Promise<HistoryItem[]> {
  const clean = userId.trim();
  if (!clean) return [];
  const db = requireDb();
  const { data, error } = await db
    .from(TABLES.userActivity)
    .select('*')
    .eq('user_id', clean)
    .eq('activity_type', 'read')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((r) => mapHistory(r as Row));
}

export async function addHistory(userId: string, n: News): Promise<void> {
  if (!isSupabaseConfigured || !supabase || !userId.trim()) return;
  const { error } = await supabase.from(TABLES.userActivity).insert({
    user_id: userId,
    activity_type: 'read',
    news_id: n.$id,
    title: n.title.trim().slice(0, 300),
    slug: n.slug,
    image_url: safeMediaUrl(n.imageUrl) ?? null,
    category_name: n.categoryName,
  });
  if (error) throw error;
}

export async function clearHistory(userId: string): Promise<void> {
  const clean = userId.trim();
  if (!clean) return;
  const db = requireDb();
  const { error } = await db
    .from(TABLES.userActivity)
    .delete()
    .eq('user_id', clean)
    .eq('activity_type', 'read');
  if (error) throw error;
}

export async function getNotifications(userId?: string): Promise<AppNotification[]> {
  const db = requireDb();
  let query = db
    .from(TABLES.notifications)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(40);
  if (userId && userId.trim()) {
    query = query.or(`user_id.eq.${userId.trim()},user_id.is.null`);
  } else {
    query = query.is('user_id', null);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((r) => mapNotification(r as Row));
}

export async function reportArticle(newsId: string, reason: string, userId?: string): Promise<void> {
  const db = requireDb();
  const cleanId = newsId.trim().slice(0, 64);
  const cleanReason = reason.trim().slice(0, 200);
  if (!cleanId || !cleanReason) throw new ApiError('Invalid report details.');
  const { error } = await db.from(TABLES.reports).insert({
    news_id: cleanId,
    reason: cleanReason,
    user_id: userId?.trim() || null,
  });
  if (error) throw error;
}

export async function sendMessage(m: { name: string; email: string; message: string }, userId?: string): Promise<void> {
  const db = requireDb();
  const name = m.name.trim().slice(0, 120);
  const email = m.email.trim().slice(0, 254);
  const message = m.message.trim().slice(0, 5000);
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 5) {
    throw new ApiError('Please fill in a valid name, email, and message.');
  }
  const { error } = await db.from(TABLES.contactMessages).insert({
    user_id: userId?.trim() || null,
    name,
    email,
    message,
  });
  if (error) throw error;
}

export async function saveCalc(userId: string, slug: string, inputs: unknown, result: unknown): Promise<void> {
  if (!isSupabaseConfigured || !supabase || !userId.trim()) return;
  const { error } = await supabase.from(TABLES.calculatorHistory).insert({
    user_id: userId,
    slug,
    inputs,
    result,
  });
  if (error) throw error;
}

/* ---------- Rewards & Wallet (server-side verified via /api/rewards) ---------- */
export const getWallet = async () => (await rewardsAction('wallet')) as unknown as Wallet;
export const getRewardEvents = async () => ((await rewardsAction('events')) as { documents: RewardEvent[] }).documents;
export const getWithdrawals = async () => ((await rewardsAction('withdrawals')) as { documents: Withdrawal[] }).documents;

export async function rewardsAction(
  action: 'wallet' | 'events' | 'withdrawals' | 'check-in' | 'start-read' | 'read' | 'apply-referral' | 'withdraw',
  payload: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  if (!isSupabaseConfigured) {
    throw new ApiError('Rewards service is temporarily unavailable.');
  }
  const token = await getAccessToken();
  if (!token) {
    throw new ApiError('Your session has expired. Please sign in again.');
  }

  const res = await fetch('/api/rewards', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  let body: Record<string, unknown> = {};
  try {
    const parsed = await res.json();
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      body = parsed as Record<string, unknown>;
    }
  } catch {
    throw new ApiError('Rewards service is temporarily unavailable.');
  }

  if (!res.ok) {
    const msg =
      typeof body.error === 'string' && body.error.trim()
        ? body.error.trim()
        : 'Could not complete this action.';
    throw new ApiError(msg);
  }
  return body;
}

/* ---------- Live Supabase SEO Audit Fetcher (never injects demo data) ---------- */
export interface LiveSeoAuditRecords {
  configured: boolean;
  news: News[];
  products: Product[];
  offers: Offer[];
  brands: Brand[];
  categories: Category[];
  error?: string;
}

export async function getLiveSeoAuditRecords(): Promise<LiveSeoAuditRecords> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      configured: false,
      news: [],
      products: [],
      offers: [],
      brands: [],
      categories: [],
    };
  }
  try {
    const [newsRes, prodRes, ccRes, loanRes, offersRes, brandsRes, catsRes] = await Promise.all([
      supabase.from(TABLES.news).select('*').in('status', [...PUBLIC_STATUSES]).order('published_at', { ascending: false }).limit(100),
      supabase.from(TABLES.products).select('*').in('status', [...PUBLIC_STATUSES]).order('editorial_rank', { ascending: true }).limit(100),
      supabase.from(TABLES.creditCards).select('*').in('status', [...PUBLIC_STATUSES]).order('editorial_rank', { ascending: true }).limit(100),
      supabase.from(TABLES.loans).select('*').in('status', [...PUBLIC_STATUSES]).order('editorial_rank', { ascending: true }).limit(100),
      supabase.from(TABLES.offers).select('*').in('status', [...PUBLIC_STATUSES]).order('created_at', { ascending: false }).limit(100),
      supabase.from(TABLES.brands).select('*').in('status', [...PUBLIC_STATUSES]).limit(100),
      supabase.from(TABLES.categories).select('*').order('sort_order', { ascending: true }).limit(100),
    ]);

    const firstErr = newsRes.error || prodRes.error || offersRes.error || brandsRes.error || catsRes.error;
    if (firstErr) throw firstErr;

    const products = dedupeBySlug([
      ...(prodRes.data ?? []).map((r) => mapProduct(r as Row)),
      ...(ccRes.data ?? []).map((r) => mapProduct(r as Row, 'credit-cards')),
      ...(loanRes.data ?? []).map((r) => mapProduct(r as Row, 'loans')),
    ]);

    return {
      configured: true,
      news: (newsRes.data ?? []).map((r) => mapNews(r as Row)),
      products,
      offers: (offersRes.data ?? []).map((r) => mapOffer(r as Row)),
      brands: (brandsRes.data ?? []).map((r) => mapBrand(r as Row)),
      categories: (catsRes.data ?? []).map((r) => mapCategory(r as Row)),
    };
  } catch (e) {
    return {
      configured: true,
      news: [],
      products: [],
      offers: [],
      brands: [],
      categories: [],
      error: formatApiError(e),
    };
  }
}
