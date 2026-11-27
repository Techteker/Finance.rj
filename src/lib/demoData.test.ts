import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  DEMO_BRANDS,
  DEMO_NEWS,
  DEMO_NOTIFICATIONS,
  DEMO_OFFERS,
  DEMO_PRODUCTS,
  DEMO_TRENDING_TERMS,
  findDemoBrandById,
  findDemoNewsBySlug,
  findDemoOfferById,
  findDemoProductBySlug,
  findDemoProductsByIds,
  queryDemoNews,
  queryDemoOffers,
  queryDemoProducts,
  searchDemoAll,
} from './demoData';
import { safeInternalPath, safeMediaUrl, safeUrl } from './format';
import { isOfferActive } from './api';
import { CATEGORIES, OFFER_CATEGORIES } from './menu';

const PUBLIC_DIR = path.resolve(process.cwd(), 'public');

function assertPublicAssetExists(mediaPath?: string) {
  assert.ok(mediaPath, 'mediaPath must be defined');
  assert.equal(safeMediaUrl(mediaPath), mediaPath, `mediaPath must pass safeMediaUrl: ${mediaPath}`);
  if (mediaPath.startsWith('/')) {
    const filePath = path.join(PUBLIC_DIR, mediaPath.slice(1));
    assert.ok(fs.existsSync(filePath), `public asset must exist on disk: ${mediaPath}`);
    assert.ok(fs.statSync(filePath).size > 100, `public asset must be non-empty: ${mediaPath}`);
  }
}

test('demo collections are populated with unique IDs and slugs', () => {
  assert.ok(DEMO_BRANDS.length >= 8);
  assert.ok(DEMO_PRODUCTS.length >= 16);
  assert.ok(DEMO_NEWS.length >= 14);
  assert.ok(DEMO_OFFERS.length >= 12);
  assert.ok(DEMO_TRENDING_TERMS.length >= 5);
  assert.ok(DEMO_NOTIFICATIONS.length >= 3);

  assert.equal(new Set(DEMO_BRANDS.map((b) => b.$id)).size, DEMO_BRANDS.length);
  assert.equal(new Set(DEMO_PRODUCTS.map((p) => p.$id)).size, DEMO_PRODUCTS.length);
  assert.equal(new Set(DEMO_PRODUCTS.map((p) => p.slug)).size, DEMO_PRODUCTS.length);
  assert.equal(new Set(DEMO_NEWS.map((n) => n.$id)).size, DEMO_NEWS.length);
  assert.equal(new Set(DEMO_NEWS.map((n) => n.slug)).size, DEMO_NEWS.length);
  assert.equal(new Set(DEMO_OFFERS.map((o) => o.$id)).size, DEMO_OFFERS.length);
});

test('all demo media assets exist in public/demo and all URLs are valid', () => {
  for (const b of DEMO_BRANDS) {
    assert.equal(b.status, 'approved');
    assertPublicAssetExists(b.logoUrl);
  }

  for (const p of DEMO_PRODUCTS) {
    assert.equal(p.status, 'approved');
    assertPublicAssetExists(p.bankLogo);
    assert.ok(safeUrl(p.applyUrl), `product applyUrl must be safe: ${p.slug}`);
    assert.ok(p.facts.length >= 3, `product must have facts: ${p.slug}`);
  }

  for (const n of DEMO_NEWS) {
    assert.equal(n.status, 'approved');
    assertPublicAssetExists(n.imageUrl);
    assert.ok(safeUrl(n.sourceUrl), `news sourceUrl must be safe: ${n.slug}`);
    for (const relId of n.relatedProductIds ?? []) {
      assert.ok(
        DEMO_PRODUCTS.some((p) => p.$id === relId),
        `relatedProductId ${relId} in ${n.slug} must exist in DEMO_PRODUCTS`,
      );
    }
  }

  for (const o of DEMO_OFFERS) {
    assert.equal(o.status, 'approved');
    assertPublicAssetExists(o.brandLogo);
    assertPublicAssetExists(o.imageUrl);
    assert.ok(safeUrl(o.externalUrl), `offer externalUrl must be safe: ${o.$id}`);
    assert.equal(isOfferActive(o.validTill), true, `demo offer must be active: ${o.$id}`);
    assert.ok(findDemoBrandById(o.brandId), `offer brandId must resolve to DEMO_BRANDS: ${o.brandId}`);
  }

  for (const notif of DEMO_NOTIFICATIONS) {
    if (notif.href) {
      assert.equal(safeInternalPath(notif.href), notif.href, `notification href must be safe internal path: ${notif.href}`);
    }
  }
});

test('every product category and offer category has local demo items', () => {
  const productCats = CATEGORIES.filter((c) => c.mode === 'products');
  for (const cat of productCats) {
    const items = queryDemoProducts({ category: cat.slug });
    assert.ok(items.length >= 2, `product category ${cat.slug} should have at least 2 demo products`);
  }

  for (const offerCat of OFFER_CATEGORIES) {
    const items = queryDemoOffers({ category: offerCat.slug });
    assert.ok(items.length >= 1, `offer category ${offerCat.slug} should have at least 1 demo offer`);
  }
});

test('queryDemoNews, queryDemoProducts, queryDemoOffers, and searchDemoAll filter accurately', () => {
  const featured = queryDemoNews({ kind: 'featured' });
  assert.ok(featured.length >= 1 && featured.every((n) => n.isFeatured));

  const breaking = queryDemoNews({ kind: 'breaking' });
  assert.ok(breaking.length >= 1 && breaking.every((n) => n.isBreaking));

  const trending = queryDemoNews({ kind: 'trending', limit: 5 });
  assert.equal(trending.length, 5);
  assert.ok((trending[0].views ?? 0) >= (trending[1].views ?? 0));

  const taxGuides = queryDemoNews({ category: 'tax-regime-comparison' });
  assert.ok(taxGuides.length >= 1);

  assert.ok(findDemoNewsBySlug(DEMO_NEWS[0].slug));
  assert.equal(findDemoNewsBySlug('non-existent-slug'), null);

  const ltfCards = queryDemoProducts({ category: 'credit-cards', subcategory: 'lifetime-free-credit-cards' });
  assert.ok(ltfCards.length >= 1 && ltfCards[0].feeValue === 0);

  const byIds = findDemoProductsByIds(['prod-sbi-cashback', 'prod-hdfc-millennia']);
  assert.equal(byIds.length, 2);
  assert.ok(findDemoProductBySlug('sbi-cashback-credit-card'));

  const hdfcOffers = queryDemoOffers({ brandId: 'brand-hdfc' });
  assert.ok(hdfcOffers.length >= 1 && hdfcOffers.every((o) => o.brandId === 'brand-hdfc'));
  assert.ok(findDemoOfferById('offer-hdfc-mmt-flights'));

  const search = searchDemoAll('HDFC');
  assert.ok(search.products.length >= 2);
  assert.ok(search.offers.length >= 2);
});
