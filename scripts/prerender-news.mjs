#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const SITE = 'https://www.forword.in';
const DIST = path.resolve('dist');
const url = (process.env.SUPABASE_URL || '').trim();
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!url || !key) throw new Error('SUPABASE_URL and server-only SUPABASE_SERVICE_ROLE_KEY are required for SEO prerendering.');
if (!fs.existsSync(path.join(DIST, 'index.html'))) throw new Error('Vite build output dist/index.html is missing.');

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const baseHtml = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');

function esc(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function setMeta(html, key, value, property = false) {
  const attr = property ? 'property' : 'name';
  const re = new RegExp('<meta\\s+' + attr + '="' + key + '"[^>]*>', 'i');
  const tag = '<meta ' + attr + '="' + esc(key) + '" content="' + esc(value) + '" />';
  return re.test(html) ? html.replace(re, tag) : html.replace('</head>', tag + '</head>');
}
function makePage({ title, description, canonical, image, keywords, schema, body, article = false }) {
  let html = baseHtml;
  html = html.replace(/<title>[\s\S]*?<\/title>/i, '<title>' + esc(title) + '</title>');
  html = html.replace(/<link\s+rel="canonical"[^>]*>/i, '<link rel="canonical" href="' + esc(canonical) + '" />');
  html = setMeta(html, 'description', description);
  html = setMeta(html, 'keywords', keywords || 'FORWORD, Indian finance news, banking, credit cards, loans, insurance, mutual funds, taxation');
  html = setMeta(html, 'robots', 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
  html = setMeta(html, 'og:type', article ? 'article' : 'website', true);
  html = setMeta(html, 'og:title', title, true);
  html = setMeta(html, 'og:description', description, true);
  html = setMeta(html, 'og:url', canonical, true);
  html = setMeta(html, 'og:image', image || SITE + '/og-image.jpg', true);
  html = setMeta(html, 'twitter:card', 'summary_large_image');
  html = setMeta(html, 'twitter:title', title);
  html = setMeta(html, 'twitter:description', description);
  html = setMeta(html, 'twitter:image', image || SITE + '/og-image.jpg');
  if (schema) {
    const json = JSON.stringify(schema).replace(/</g, '\\u003c');
    html = html.replace('</head>', '<script type="application/ld+json">' + json + '</script></head>');
  }
  html = html.replace('<div id="root"></div>', '<div id="root">' + body + '</div>');
  return html;
}

const { data: news, error: newsError } = await sb.from('news')
  .select('slug,title,summary,body,seo_title,meta_description,meta_keywords,tags,og_title,og_description,canonical_url,image_url,schema_json,published_at,updated_at,author,status,category_name,category_slug')
  .eq('status', 'published');
if (newsError) throw new Error('Could not fetch published news for prerendering: ' + newsError.message);

let articlePages = 0;
for (const n of news || []) {
  if (!n.slug || !n.title) continue;
  const canonical = n.canonical_url || SITE + '/news/' + encodeURIComponent(n.slug);
  const title = n.seo_title || n.og_title || n.title + ' | FORWORD';
  const description = n.meta_description || n.og_description || n.summary || '';
  const image = n.image_url || '';
  const schema = n.schema_json || {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: n.title,
    description,
    image: image ? [image] : undefined,
    datePublished: n.published_at,
    dateModified: n.updated_at || n.published_at,
    mainEntityOfPage: canonical,
    author: { '@type': 'Organization', name: n.author || 'FORWORD Editorial Team' },
    publisher: { '@type': 'Organization', name: 'FORWORD', logo: { '@type': 'ImageObject', url: SITE + '/favicon.svg' } },
  };
  const bodyText = String(n.body || '').split(/\r?\n/).map((part) => part.trim()).filter(Boolean);
  const articleBody = '<main><article><h1>' + esc(n.title) + '</h1>' +
    '<p>' + esc(description) + '</p>' +
    (image ? '<img src="' + esc(image) + '" alt="' + esc(n.title) + '" />' : '') +
    (n.published_at ? '<time datetime="' + esc(n.published_at) + '">' + esc(n.published_at) + '</time>' : '') +
    bodyText.map((part) => '<p>' + esc(part) + '</p>').join('') +
    '<p><a href="/category/' + esc(n.category_slug || '') + '">' + esc(n.category_name || 'Finance') + '</a></p></article></main>';
  const out = path.join(DIST, 'news', n.slug, 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, makePage({ title, description, canonical, image, keywords: n.meta_keywords || (n.tags || []).join(', '), schema, body: articleBody, article: true }));
  articlePages++;
}

const { data: categories, error: categoriesError } = await sb.from('categories').select('name,slug,kind').eq('kind', 'news');
if (categoriesError) throw new Error('Could not fetch categories for prerendering: ' + categoriesError.message);
let categoryPages = 0;
for (const c of categories || []) {
  if (!c.slug || !c.name) continue;
  const canonical = SITE + '/category/' + encodeURIComponent(c.slug);
  const title = c.name + ' News & Updates | FORWORD';
  const description = 'Read Indian ' + c.name.toLowerCase() + ' news, explainers and financial updates on FORWORD.';
  const schema = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, description, url: canonical, isPartOf: { '@type': 'WebSite', name: 'FORWORD', url: SITE } };
  const body = '<main><h1>' + esc(c.name) + ' News</h1><p>' + esc(description) + '</p><a href="/news">Latest finance news</a></main>';
  const out = path.join(DIST, 'category', c.slug, 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, makePage({ title, description, canonical, schema, body }));
  categoryPages++;
}
console.log('[FORWORD SEO] Prerendered ' + articlePages + ' article pages and ' + categoryPages + ' category pages from Supabase.');
