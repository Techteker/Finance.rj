import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CANONICAL_SITE_URL,
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  PRIMARY_SITE_URL,
  buildArticleKeywords,
  buildBrandJsonLd,
  buildBreadcrumbJsonLd,
  buildCalculatorJsonLd,
  buildCalculatorKeywords,
  buildCategoryKeywords,
  buildCollectionJsonLd,
  buildFaqJsonLd,
  buildHowToJsonLd,
  buildItemListJsonLd,
  buildNewsArticleJsonLd,
  buildOfferCategoryKeywords,
  buildOfferJsonLd,
  buildOfferKeywords,
  buildProductJsonLd,
  buildProductKeywords,
  buildSubcategoryKeywords,
  buildWebPageJsonLd,
  buildWebsiteJsonLd,
  formatKeywords,
  formatSeoDescription,
  formatSeoTitle,
  getCanonicalOrigin,
  resolveAbsoluteUrl,
  resolveCanonicalUrl,
} from './seo';

test('formatSeoTitle formats branded page titles without duplicating site name', () => {
  assert.equal(formatSeoTitle(), DEFAULT_TITLE);
  assert.equal(formatSeoTitle('Home'), DEFAULT_TITLE);
  assert.equal(formatSeoTitle('EMI Calculator'), 'EMI Calculator | FORWORD');
  assert.equal(formatSeoTitle('About FORWORD'), 'About FORWORD');

  const longTitle = 'A Very Long Indian Financial News Article Headline About Reserve Bank Policy Updates And Mortgage Rates';
  const formatted = formatSeoTitle(longTitle);
  assert.ok(formatted.endsWith(' | FORWORD'));
  assert.ok(formatted.length <= 65);
});

test('formatSeoDescription normalizes whitespace and truncates cleanly at word boundaries', () => {
  assert.equal(formatSeoDescription(''), DEFAULT_DESCRIPTION);
  assert.equal(formatSeoDescription('  Compare   credit cards  in India. '), 'Compare credit cards in India.');

  const longDesc =
    'Explore detailed comparisons of the best cashback credit cards, zero-balance savings accounts, low-interest personal loans, health insurance plans, and tax-saving mutual funds across India.';
  const clipped = formatSeoDescription(longDesc, 155);
  assert.ok(clipped.length <= 155);
  assert.ok(clipped.endsWith('…'));
  assert.ok(!clipped.includes('  '));
});

test('page-specific keyword builders deduplicate terms and return focused Indian finance keywords', () => {
  assert.equal(formatKeywords(['Credit Cards', 'credit cards', 'Cashback', '']), 'Credit Cards, Cashback');
  assert.match(buildCategoryKeywords('credit-cards', 'Credit Cards'), /best credit cards in India/i);
  assert.match(buildSubcategoryKeywords('loans', 'Personal Loans', 'Loans'), /Personal Loans India/i);
  assert.match(buildProductKeywords({ name: 'SBI Cashback Card', bankName: 'SBI Card', category: 'credit-cards', subcategory: 'cashback-credit-cards' }), /SBI Cashback Card review/i);
  assert.match(buildArticleKeywords({ title: 'RBI Policy Stance On Repo Rate', categoryName: 'Banking News', publisher: 'FORWORD Desk' }), /Banking News India/i);
  assert.match(buildOfferKeywords({ title: 'Flat 12% Off Flights', brandName: 'HDFC Bank', category: 'travel', discount: '12% OFF' }), /HDFC Bank offers/i);
  assert.match(buildOfferCategoryKeywords('travel'), /flight booking credit card offers/i);
  assert.match(buildCalculatorKeywords({ slug: 'emi-calculator', title: 'EMI Calculator' }), /EMI Calculator India/i);
});

test('resolveCanonicalUrl and resolveAbsoluteUrl normalize apex domain, paths, and URLs', () => {
  assert.equal(PRIMARY_SITE_URL, 'https://forword.in');
  assert.equal(CANONICAL_SITE_URL, 'https://www.forword.in');
  assert.equal(getCanonicalOrigin('https://forword.in'), 'https://www.forword.in');
  assert.equal(getCanonicalOrigin('https://www.forword.in/'), 'https://www.forword.in');
  assert.equal(resolveCanonicalUrl('https://forword.in', '/offers'), 'https://www.forword.in/offers');
  assert.equal(resolveCanonicalUrl('https://www.forword.in/', '/'), 'https://www.forword.in/');
  assert.equal(
    resolveCanonicalUrl('https://www.forword.in', '/calculators/emi-calculator/?ref=share#top'),
    'https://www.forword.in/calculators/emi-calculator',
  );
  assert.equal(resolveAbsoluteUrl('https://www.forword.in', '/og-image.jpg'), 'https://www.forword.in/og-image.jpg');
  assert.equal(resolveAbsoluteUrl('https://www.forword.in', 'https://cdn.example.com/pic.jpg'), 'https://cdn.example.com/pic.jpg');
  assert.equal(resolveAbsoluteUrl('https://www.forword.in', 'javascript:alert(1)'), 'https://www.forword.in/og-image.jpg');
});

test('JSON-LD builders produce valid Schema.org structured data without fake ratings or prices', () => {
  const origin = 'https://www.forword.in';

  const site = buildWebsiteJsonLd(origin);
  assert.equal(site.length, 3);
  assert.equal(site[0]['@type'], 'Organization');
  assert.equal(site[1]['@type'], 'WebSite');
  assert.equal(site[2]['@type'], 'WebApplication');

  const article = buildNewsArticleJsonLd(origin, {
    title: 'RBI Holds Repo Rate Steady',
    summary: 'What the policy decision means for home loan EMIs and FD rates.',
    body: 'The Reserve Bank of India kept the repo rate unchanged for retail borrowers across India.',
    slug: 'rbi-holds-repo-rate',
    publishedAt: '2026-11-20T08:00:00Z',
    publisher: 'FORWORD Desk',
    categoryName: 'Banking News',
  });
  assert.equal(article['@type'], 'NewsArticle');
  assert.equal(article.isAccessibleForFree, true);
  assert.equal(article.wordCount, 15);
  assert.equal((article.mainEntityOfPage as { '@id': string })['@id'], 'https://www.forword.in/news/rbi-holds-repo-rate');

  const product = buildProductJsonLd(origin, {
    name: 'Millennia Credit Card',
    slug: 'millennia-credit-card',
    bankName: 'HDFC Bank',
    category: 'credit-cards',
    feeValue: 1000,
    facts: ['Annual fee|₹1,000 + GST', 'Cashback|5% online'],
  });
  assert.equal(product['@type'], 'FinancialProduct');
  assert.equal(product.url, 'https://www.forword.in/product/millennia-credit-card');
  assert.equal((product.offers as { price: string }).price, '1000');
  assert.equal((product.additionalProperty as unknown[]).length, 2);
  assert.equal('aggregateRating' in product, false);

  const loanWithoutPrice = buildProductJsonLd(origin, {
    name: 'HDFC Home Loan',
    slug: 'hdfc-home-loan',
    bankName: 'HDFC Bank',
    category: 'loans',
    feeValue: 8.7,
  });
  assert.equal('offers' in loanWithoutPrice, false);

  const offer = buildOfferJsonLd(origin, {
    id: 'off123',
    title: '10% Instant Discount on Flights',
    brandName: 'MakeMyTrip',
    discount: '10% OFF',
    validTill: '2026-12-31',
    category: 'travel',
    active: true,
  });
  assert.equal(offer['@type'], 'Offer');
  assert.equal(offer.validThrough, '2026-12-31');
  assert.equal(offer.availability, 'https://schema.org/InStock');

  const brand = buildBrandJsonLd(origin, { id: 'hdfc-bank', name: 'HDFC Bank' });
  assert.equal(brand['@type'], 'Organization');
  assert.equal(brand.url, 'https://www.forword.in/brands/hdfc-bank');

  const itemList = buildItemListJsonLd(origin, {
    name: 'Top Credit Cards',
    path: '/credit-cards/best-credit-cards',
    items: [{ name: 'SBI Cashback', path: '/product/sbi-cashback-credit-card' }],
  });
  assert.equal(itemList['@type'], 'ItemList');
  assert.equal(itemList.numberOfItems, 1);

  const calc = buildCalculatorJsonLd(origin, {
    slug: 'sip-calculator',
    title: 'SIP Calculator',
    desc: 'Future value of a monthly investment.',
  });
  assert.equal(calc['@type'], 'WebApplication');
  assert.equal(calc.applicationCategory, 'FinanceApplication');

  const faq = buildFaqJsonLd([['How does FORWORD earn?', 'Affiliate commissions never affect rankings.']]);
  assert.equal(faq['@type'], 'FAQPage');
  assert.equal((faq.mainEntity as unknown[]).length, 1);

  const crumbs = buildBreadcrumbJsonLd(origin, [
    { name: 'Home', path: '/' },
    { name: 'Credit Cards', path: '/category/credit-cards' },
  ]);
  assert.equal(crumbs['@type'], 'BreadcrumbList');
  assert.equal((crumbs.itemListElement as { position: number }[])[1].position, 2);

  const col = buildCollectionJsonLd(origin, {
    name: 'Credit Cards',
    description: 'Compare fees, rewards and eligibility.',
    path: '/category/credit-cards',
  });
  assert.equal(col['@type'], 'CollectionPage');

  const wp = buildWebPageJsonLd(origin, { name: 'About FORWORD', description: 'About us', path: '/about', type: 'AboutPage' });
  assert.equal(wp['@type'], 'AboutPage');

  const howTo = buildHowToJsonLd(origin, {
    name: 'How to Apply',
    description: 'Steps to apply',
    path: '/product/test/guide',
    steps: ['Check eligibility', 'Submit KYC'],
  });
  assert.equal(howTo['@type'], 'HowTo');
  assert.equal((howTo.step as unknown[]).length, 2);
});
