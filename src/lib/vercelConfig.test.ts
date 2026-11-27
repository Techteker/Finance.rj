import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

interface VercelConfig {
  framework: string;
  buildCommand: string;
  outputDirectory: string;
  redirects?: { source: string; has?: { type: string; value: string }[]; destination: string; permanent?: boolean }[];
  rewrites: { source: string; destination: string }[];
  headers: { source: string; headers: { key: string; value: string }[] }[];
}

const configPath = path.resolve(process.cwd(), 'vercel.json');
const vercel = JSON.parse(fs.readFileSync(configPath, 'utf8')) as VercelConfig;

test('vercel.json configures Vite build, dist output, and canonical 301 redirect', () => {
  assert.equal(vercel.framework, 'vite');
  assert.equal(vercel.buildCommand, 'npm run build');
  assert.equal(vercel.outputDirectory, 'dist');
  const apexRedirect = vercel.redirects?.find((r) => r.has?.some((h) => h.type === 'host' && h.value === 'forword.in'));
  assert.ok(apexRedirect, 'Expected permanent 301 redirect from forword.in to www.forword.in');
  assert.equal(apexRedirect.destination, 'https://www.forword.in/:path*');
  assert.equal(apexRedirect.permanent, true);
});

test('vercel.json SPA rewrite matches app routes and preserves static SEO/asset files', () => {
  assert.equal(vercel.rewrites.length, 1);
  const { source, destination } = vercel.rewrites[0];
  assert.equal(destination, '/index.html');

  const re = new RegExp(`^${source}$`);
  // Deep SPA routes must rewrite to /index.html
  assert.equal(re.test('/'), true);
  assert.equal(re.test('/calculators/emi-calculator'), true);
  assert.equal(re.test('/category/credit-cards'), true);
  assert.equal(re.test('/credit-cards/best-credit-cards'), true);
  assert.equal(re.test('/news/rbi-repo-rate-update'), true);
  assert.equal(re.test('/settings/privacy'), true);
  assert.equal(re.test('/admin/seo'), true);

  // Static assets and SEO files must NOT be rewritten to /index.html
  assert.equal(re.test('/assets/index-abc123.js'), false);
  assert.equal(re.test('/demo/news-rbi.jpg'), false);
  assert.equal(re.test('/favicon.svg'), false);
  assert.equal(re.test('/og-image.jpg'), false);
  assert.equal(re.test('/robots.txt'), false);
  assert.equal(re.test('/sitemap-index.xml'), false);
  assert.equal(re.test('/sitemap.xml'), false);
  assert.equal(re.test('/sitemap-news.xml'), false);
  assert.equal(re.test('/sitemap-images.xml'), false);
});

test('vercel.json includes security headers and immutable asset caching', () => {
  const globalHeaders = vercel.headers.find((h) => h.source === '/(.*)')?.headers ?? [];
  const headerMap = new Map(globalHeaders.map((h) => [h.key, h.value]));

  assert.equal(headerMap.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(headerMap.get('Referrer-Policy'), 'strict-origin-when-cross-origin');
  assert.equal(headerMap.get('X-Frame-Options'), 'SAMEORIGIN');
  assert.equal(headerMap.get('Cross-Origin-Opener-Policy'), 'same-origin');
  assert.match(headerMap.get('Strict-Transport-Security') ?? '', /max-age=31536000/);
  assert.match(headerMap.get('Permissions-Policy') ?? '', /camera=\(\)/);
  assert.match(headerMap.get('Permissions-Policy') ?? '', /geolocation=\(\)/);

  const csp = headerMap.get('Content-Security-Policy') ?? '';
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /script-src 'self'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /frame-ancestors 'self'/);
  assert.match(csp, /upgrade-insecure-requests/);

  const assetHeaders = vercel.headers.find((h) => h.source === '/assets/(.*)')?.headers ?? [];
  const cacheControl = assetHeaders.find((h) => h.key === 'Cache-Control')?.value ?? '';
  assert.match(cacheControl, /immutable/);
});
