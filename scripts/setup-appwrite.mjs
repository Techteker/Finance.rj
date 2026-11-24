/**
 * One-time backend setup for FORWORD (database "newsfeed_main").
 * Creates missing collections, attributes and indexes, and seeds the news category list.
 * It never deletes anything and skips what already exists.
 *
 * Usage (run on your machine, the API key stays out of the frontend):
 *   APPWRITE_ENDPOINT=... APPWRITE_PROJECT_ID=... APPWRITE_API_KEY=... npm run setup:appwrite
 * The API key needs: databases.read/write, collections.read/write, attributes.read/write, indexes.read/write, documents.read/write.
 */
import { Client, Databases, ID, Permission, Query, Role } from 'node-appwrite';

const { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, APPWRITE_DATABASE_ID = 'newsfeed_main' } = process.env;
if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) { console.error('Set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID and APPWRITE_API_KEY.'); process.exit(1); }

const db = new Databases(new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY));
const DB = APPWRITE_DATABASE_ID;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const safe = async (label, fn) => { try { await fn(); console.log('  +', label); } catch (e) { if (e.code === 409) console.log('  =', label, '(exists)'); else console.log('  !', label, e.message); } };

// type codes: s=string(size) t=long text i=integer f=float b=boolean d=datetime u=url ; "[]" suffix = array ; "*" suffix = required
const READ_PUBLIC = [Permission.read(Role.any())];
const OWNER = [Permission.create(Role.users())];
const ANY_CREATE = [Permission.create(Role.any())];

const SCHEMA = {
  categories: { perms: READ_PUBLIC, doc: false, attrs: { name: 's*', slug: 's*', kind: 's*', icon: 's', sortOrder: 'i', isTrending: 'b', parentSlug: 's', description: 's:500', productType: 's', mode: 's', status: 's' }, idx: [['slug', ['slug']], ['kind', ['kind']], ['parent', ['parentSlug']], ['status', ['status']]] },
  news: { perms: [], doc: true, attrs: { title: 's*:300', slug: 's*', summary: 't', body: 't', imageUrl: 'u', categoryName: 's', categorySlug: 's', publisher: 's*', sourceUrl: 'u', author: 's', publishedAt: 'd', readTime: 'i', status: 's*', isSponsored: 'b', isBreaking: 'b', isFeatured: 'b', views: 'i', 'relatedProductIds': 's[]' },
    idx: [['slug', ['slug']], ['status', ['status']], ['cat', ['categorySlug']], ['pub', ['publishedAt'], 'key', ['DESC']], ['views', ['views'], 'key', ['DESC']], ['title_ft', ['title'], 'fulltext']] },
  brands: { perms: [], doc: true, attrs: { name: 's*', logoUrl: 'u', description: 's:500', status: 's*' }, idx: [['status', ['status']]] },
  offers: { perms: [], doc: true, attrs: { title: 's*:300', brandId: 's*', brandName: 's', brandLogo: 'u', imageUrl: 'u', description: 't', discount: 's', couponCode: 's', validTill: 'd', terms: 's[]:500', externalUrl: 'u', category: 's', isExclusive: 'b', isTrending: 'b', status: 's*' },
    idx: [['status', ['status']], ['cat', ['category']], ['brand', ['brandId']], ['title_ft', ['title'], 'fulltext']] },
  products: { perms: [], doc: true, attrs: { name: 's*:200', slug: 's*', type: 's', category: 's*', subcategory: 's*', bankName: 's', bankLogo: 'u', summary: 't', facts: 's[]:200', benefits: 's[]:300', exclusions: 's[]:300', pros: 's[]:200', cons: 's[]:200', features: 's[]:300', eligibility: 't', customerTypes: 's[]', feeValue: 'f', rewardRate: 'f', cashbackRate: 'f', editorialRank: 'i', minIncome: 'f', minAge: 'i', maxAge: 'i', applyUrl: 'u', verifiedAt: 'd', status: 's*', review: 't', applySteps: 's[]:200' },
    idx: [['slug', ['slug']], ['cat_sub', ['category', 'subcategory']], ['status', ['status']], ['rank', ['editorialRank']], ['name_ft', ['name'], 'fulltext']] },
  product_reviews: { perms: [], doc: true, attrs: { productId: 's*', body: 't', verdict: 's', status: 's' }, idx: [['product', ['productId']]] },
  product_comparisons: { perms: [], doc: true, attrs: { title: 's', productIds: 's[]', status: 's' }, idx: [] },
  favorites: { perms: OWNER, doc: true, attrs: { userId: 's*', itemType: 's*', itemId: 's*', title: 's:300', subtitle: 's:300', imageUrl: 'u', href: 's:500' }, idx: [['user', ['userId']]] },
  reading_history: { perms: OWNER, doc: true, attrs: { userId: 's*', newsId: 's', title: 's:300', slug: 's', imageUrl: 'u', categoryName: 's' }, idx: [['user', ['userId']]] },
  calculators_history: { perms: OWNER, doc: true, attrs: { userId: 's*', slug: 's', inputs: 't', result: 't' }, idx: [['user', ['userId']]] },
  notifications: { perms: [], doc: true, attrs: { userId: 's', title: 's*:300', body: 's:500', kind: 's', href: 's:300' }, idx: [['user', ['userId']]] },
  users: { perms: [], doc: true, attrs: { name: 's', email: 's', phone: 's', avatar: 'u', bio: 't', verified: 'b', coins: 'i', balance: 'f', streak: 'i', lastCheckIn: 'd', referralCode: 's' }, idx: [['referral_unique', ['referralCode'], 'unique']] },
  reward_events: { perms: [], doc: true, attrs: { userId: 's*', kind: 's', label: 's', coins: 'i' }, idx: [['user', ['userId']]] },
  withdrawals: { perms: [], doc: true, attrs: { userId: 's*', amount: 'f', upiId: 's', status: 's' }, idx: [['user', ['userId']]] },
  referrals: { perms: [], doc: true, attrs: { referrerId: 's*', referredUserId: 's*', referralCode: 's*', status: 's*', createdAt: 'd', rewardedAt: 'd' }, idx: [['referred', ['referredUserId']], ['referrer_status', ['referrerId', 'status']]] },
  reports: { perms: ANY_CREATE, doc: false, attrs: { newsId: 's', reason: 's', userId: 's' }, idx: [] },
  contact_messages: { perms: ANY_CREATE, doc: false, attrs: { name: 's', email: 's', message: 't' }, idx: [] },
};

async function addAttr(col, key, code) {
  const req = code.includes('*'); const arr = code.includes('[]');
  const t = code[0]; const sz = Number((code.split(':')[1]) || 255);
  if (t === 's') return db.createStringAttribute(DB, col, key, sz, req, undefined, arr);
  if (t === 't') return db.createStringAttribute(DB, col, key, 20000, req, undefined, arr);
  if (t === 'i') return db.createIntegerAttribute(DB, col, key, req, undefined, undefined, undefined, arr);
  if (t === 'f') return db.createFloatAttribute(DB, col, key, req, undefined, undefined, undefined, arr);
  if (t === 'b') return db.createBooleanAttribute(DB, col, key, req, undefined, arr);
  if (t === 'd') return db.createDatetimeAttribute(DB, col, key, req, undefined, arr);
  if (t === 'u') return db.createUrlAttribute(DB, col, key, req, undefined, arr);
}

console.log('Database', DB);
await safe('database', () => db.create(DB, DB));
for (const [id, c] of Object.entries(SCHEMA)) {
  console.log(id);
  await safe('collection', () => db.createCollection(DB, id, id, c.perms, c.doc));
  for (const [k, code] of Object.entries(c.attrs)) await safe('attr ' + k, () => addAttr(id, k.replace('[]', ''), code));
}
console.log('Waiting for attributes to become available…');
await sleep(8000);
for (const [id, c] of Object.entries(SCHEMA)) {
  for (const [name, attrs, type = 'key', orders] of c.idx) await safe(`index ${id}.${name}`, () => db.createIndex(DB, id, name, type, attrs, orders));
}

const NEWS_CATS = ['Business News', 'Personal Finance', 'Banking News', 'Stock Market News', 'Economy News', 'Tax News', 'Cryptocurrency News', 'Mutual Fund News', 'Insurance News', 'Credit Card News', 'Loan News', 'Investment News', 'Government Schemes', 'Startup News', 'Technology & Fintech News', 'Real Estate News', 'Gold & Silver News', 'Global Finance News'];
const slug = (s) => s.toLowerCase().replace(/&/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
let i = 0;
for (const name of NEWS_CATS) {
  const categorySlug = slug(name);
  const sortOrder = i++;
  await safe('news category ' + name, async () => {
    const existing = await db.listDocuments(DB, 'categories', [
      Query.equal('slug', categorySlug),
      Query.equal('kind', 'news'),
      Query.limit(1)
    ]);
    if (existing.total > 0) {
      console.log('  =', 'news category ' + name, '(already seeded)');
      return;
    }
    await db.createDocument(DB, 'categories', ID.unique(), {
      name,
      slug: categorySlug,
      kind: 'news',
      sortOrder
    });
  });
}
const PRODUCT_CATS = [
  { name: 'Credit Cards', slug: 'credit-cards', icon: 'credit-card', productType: 'credit_card', mode: 'products', description: 'Compare credit cards, fees, rewards and eligibility.', subs: [
    ['best-credit-cards', 'Best Credit Cards'], ['beginner-credit-cards', 'For Beginners'], ['student-credit-cards', 'For Students'], ['lifetime-free-credit-cards', 'Lifetime Free'], ['cashback-credit-cards', 'Cashback'], ['travel-credit-cards', 'Travel'], ['fuel-credit-cards', 'Fuel'], ['shopping-credit-cards', 'Shopping'], ['rewards-credit-cards', 'Rewards'], ['business-credit-cards', 'Business'], ['premium-credit-cards', 'Premium'], ['rupay-credit-cards', 'RuPay'], ['credit-card-eligibility', 'Eligibility', 'eligibility'], ['credit-card-comparison', 'Compare Cards', 'compare']
  ] },
  { name: 'Banking', slug: 'banking', icon: 'bank', productType: 'bank_account', mode: 'products', description: 'Explore savings accounts, deposits and banking services.', subs: [
    ['best-savings-accounts', 'Best Savings Accounts'], ['zero-balance-accounts', 'Zero Balance Accounts'], ['salary-accounts', 'Salary Accounts'], ['senior-citizen-accounts', 'Senior Citizen Accounts'], ['digital-savings-accounts', 'Digital Savings Accounts'], ['fixed-deposits', 'Fixed Deposits'], ['recurring-deposits', 'Recurring Deposits'], ['small-finance-banks', 'Small Finance Banks'], ['current-accounts', 'Current Accounts']
  ] },
  { name: 'Loans', slug: 'loans', icon: 'home', productType: 'loan', mode: 'products', description: 'Compare loan products, rates and eligibility.', subs: [
    ['personal-loans', 'Personal Loans'], ['home-loans', 'Home Loans'], ['business-loans', 'Business Loans'], ['education-loans', 'Education Loans'], ['gold-loans', 'Gold Loans'], ['car-loans', 'Car Loans'], ['two-wheeler-loans', 'Two Wheeler Loans'], ['loan-against-property', 'Loan Against Property'], ['loan-eligibility', 'Loan Eligibility', 'eligibility'], ['loan-comparison', 'Compare Loans', 'compare']
  ] },
  { name: 'Insurance', slug: 'insurance', icon: 'shield', productType: 'insurance', mode: 'products', description: 'Compare health, life, motor and travel insurance.', subs: [
    ['health-insurance', 'Health Insurance'], ['term-life-insurance', 'Term Life Insurance'], ['life-insurance', 'Life Insurance'], ['car-insurance', 'Car Insurance'], ['bike-insurance', 'Bike Insurance'], ['travel-insurance', 'Travel Insurance'], ['family-health-insurance', 'Family Health Insurance'], ['senior-citizen-insurance', 'Senior Citizen Insurance'], ['insurance-comparison', 'Compare Insurance', 'compare']
  ] },
  { name: 'Investments', slug: 'investments', icon: 'trending-up', productType: 'investment', mode: 'products', description: 'Explore investment products and long-term savings options.', subs: [
    ['mutual-funds', 'Mutual Funds'], ['sip', 'SIP'], ['index-funds', 'Index Funds'], ['etfs', 'ETFs'], ['stocks', 'Stocks'], ['bonds', 'Bonds'], ['government-securities', 'Government Securities'], ['nps', 'NPS'], ['ppf', 'PPF'], ['epf', 'EPF'], ['fixed-deposits', 'Fixed Deposits'], ['gold-investments', 'Gold Investments']
  ] },
  { name: 'Tax Saving', slug: 'tax-savings', icon: 'file-text', mode: 'guides', description: 'Tax planning guides, deductions and calculators.', subs: [
    ['income-tax', 'Income Tax'], ['tax-saving-investments', 'Tax Saving Investments'], ['tax-regime-comparison', 'Tax Regime Comparison', 'compare'], ['tax-calculators', 'Tax Calculators'], ['itr-guides', 'ITR Guides'], ['budget-planning', 'Budget Planning']
  ] },
  { name: 'Government Schemes', slug: 'government-schemes', icon: 'landmark', productType: 'scheme', mode: 'guides', description: 'Government-backed savings and social security schemes.', subs: [
    ['pm-jan-dhan-yojana', 'PM Jan Dhan Yojana'], ['pmjjby', 'PMJJBY'], ['pmsby', 'PMSBY'], ['atal-pension-yojana', 'Atal Pension Yojana'], ['sukanya-samriddhi-yojana', 'Sukanya Samriddhi Yojana'], ['public-provident-fund', 'Public Provident Fund'], ['national-savings-certificate', 'National Savings Certificate'], ['other-government-schemes', 'Other Government Schemes']
  ] }
];
const OFFER_CATS = [
  ['banking', 'Banking'], ['cards', 'Cards'], ['loans', 'Loans'], ['insurance', 'Insurance'],
  ['investments', 'Investments'], ['tax-saving', 'Tax Saving'], ['travel', 'Travel'],
  ['shopping', 'Shopping'], ['fuel', 'Fuel'], ['cashback', 'Cashback'],
  ['electronics', 'Electronics'], ['education', 'Education']
];
async function ensureCategory(data) {
  const queries = [Query.equal('kind', data.kind), Query.equal('slug', data.slug)];
  if (data.parentSlug) queries.push(Query.equal('parentSlug', data.parentSlug));
  const existing = await db.listDocuments(DB, 'categories', [...queries, Query.limit(1)]);
  if (existing.total > 0) return;
  await db.createDocument(DB, 'categories', ID.unique(), data);
}
let productOrder = 0;
for (const cat of PRODUCT_CATS) {
  await safe('product category ' + cat.name, () => ensureCategory({
    name: cat.name, slug: cat.slug, kind: 'product', icon: cat.icon,
    sortOrder: productOrder++, description: cat.description, productType: cat.productType || '',
    mode: cat.mode, status: 'approved'
  }));
  let subOrder = 0;
  for (const sub of cat.subs) {
    await safe('subcategory ' + sub[1], () => ensureCategory({
      name: sub[1], slug: sub[0], kind: 'subcategory', parentSlug: cat.slug,
      icon: cat.icon, sortOrder: subOrder++, mode: sub[2] || cat.mode,
      status: 'approved'
    }));
  }
}
let offerOrder = 0;
for (const [slugValue, name] of OFFER_CATS) {
  await safe('offer category ' + name, () => ensureCategory({
    name, slug: slugValue, kind: 'offer', sortOrder: offerOrder++, status: 'approved'
  }));
}
console.log('Done. See README for permissions notes and the rewards function.');
