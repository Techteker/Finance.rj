import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const SITE = 'https://www.forword.in';

function setMeta(key: string, value: string, property = false) {
  const attr = property ? 'property' : 'name';
  let node = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!node) {
    node = document.createElement('meta');
    node.setAttribute(attr, key);
    document.head.appendChild(node);
  }
  node.content = value;
}

function setCanonical(url: string) {
  let node = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!node) {
    node = document.createElement('link');
    node.rel = 'canonical';
    document.head.appendChild(node);
  }
  node.href = url;
}

function setJsonLd(value: unknown) {
  document.getElementById('forward-route-jsonld')?.remove();
  if (!value) return;
  const node = document.createElement('script');
  node.id = 'forward-route-jsonld';
  node.type = 'application/ld+json';
  node.textContent = JSON.stringify(value).replace(/</g, '\\u003c');
  document.head.appendChild(node);
}

function applySeo(input: {
  title: string;
  description: string;
  canonical: string;
  image?: string;
  keywords?: string;
  robots?: string;
  type?: string;
  schema?: unknown;
}) {
  const title = input.title.slice(0, 70);
  const description = input.description.replace(/\\s+/g, ' ').trim().slice(0, 200);
  const image = input.image || `${SITE}/og-image.jpg`;
  document.title = title;
  setMeta('description', description);
  setMeta('keywords', input.keywords || 'FORWORD, Indian finance news, banking, credit cards, loans, insurance, mutual funds, taxation');
  setMeta('robots', input.robots || 'index,follow,max-image-preview:large');
  setMeta('og:site_name', 'FORWORD', true);
  setMeta('og:locale', 'en_IN', true);
  setMeta('og:type', input.type || 'website', true);
  setMeta('og:title', title, true);
  setMeta('og:description', description, true);
  setMeta('og:url', input.canonical, true);
  setMeta('og:image', image, true);
  setMeta('twitter:card', 'summary_large_image');
  setMeta('twitter:title', title);
  setMeta('twitter:description', description);
  setMeta('twitter:image', image);
  setCanonical(input.canonical);
  setJsonLd(input.schema);
}

export default function SeoHead() {
  const { pathname } = useLocation();

  useEffect(() => {
    let active = true;
    const path = pathname.replace(/\\/+$/, '') || '/';
    const canonical = `${SITE}${path}`;
    const privatePath = /^\\/(admin|welcome|onboarding|language|notification-permission|login|register|forgot-password|reset-password|verify-otp|verify-email|account-created|profile|settings|wallet|rewards|referral|favorites|notifications|search|compare|menu|go|offline|maintenance)(\\/|$)/.test(path);

    if (privatePath) {
      applySeo({
        title: 'FORWORD Account',
        description: 'Account and reader settings for FORWORD.',
        canonical,
        robots: 'noindex,nofollow',
      });
      return () => { active = false; };
    }

    const defaults: Record<string, { title: string; description: string }> = {
      '/': {
        title: 'FORWORD – Indian Finance News, Products & Calculators',
        description: 'Make smarter money decisions in India with finance news, credit card and loan comparisons, insurance insights, calculators and offers.',
      },
      '/category': {
        title: 'Finance News Categories in India | FORWORD',
        description: 'Explore Indian finance news across banking, business, credit cards, economy, insurance, loans, mutual funds, taxation and markets.',
      },
      '/offers': {
        title: 'Finance Offers & Deals in India | FORWORD',
        description: 'Explore financial product offers in India. Check fees, eligibility, terms and official application links before applying.',
      },
      '/calculators': {
        title: 'Financial Calculators for India | FORWORD',
        description: 'Use practical financial calculators for loans, EMIs, savings, investments and tax planning in India.',
      },
      '/about': {
        title: 'About FORWORD | Indian Finance Information',
        description: 'Learn about FORWORD, our financial content approach, editorial standards and commitment to useful Indian finance information.',
      },
      '/contact': {
        title: 'Contact FORWORD',
        description: 'Contact the FORWORD team for feedback, corrections, partnerships and support.',
      },
    };
    const fallback = defaults[path] || {
      title: 'FORWORD – Indian Finance Information',
      description: 'Explore Indian financial news, product guides, comparisons and practical money information on FORWORD.',
    };

    if (path.startsWith('/news/')) {
      const slug = decodeURIComponent(path.slice('/news/'.length));
      if (slug === 'category') {
        applySeo({ title: 'Finance News Categories | FORWORD', description: 'Browse finance news by topic on FORWORD.', canonical, schema: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Finance News Categories', url: canonical } });
        return () => { active = false; };
      }
      if (!supabase) {
        applySeo({ ...fallback, canonical });
        return () => { active = false; };
      }
      void supabase.from('news')
        .select('title,seo_title,summary,meta_description,meta_keywords,tags,og_title,og_description,canonical_url,image_url,schema_json,status')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle()
        .then(({ data }) => {
          if (!active) return;
          if (!data) {
            applySeo({ title: 'Article not found | FORWORD', description: 'This FORWORD article could not be found.', canonical, robots: 'noindex,nofollow' });
            return;
          }
          const schema = data.schema_json || {
            '@context': 'https://schema.org',
            '@type': 'NewsArticle',
            headline: data.title,
            description: data.meta_description || data.summary,
            image: data.image_url ? [data.image_url] : undefined,
            mainEntityOfPage: data.canonical_url || canonical,
            author: { '@type': 'Organization', name: 'FORWORD Editorial Team' },
            publisher: { '@type': 'Organization', name: 'FORWORD', logo: { '@type': 'ImageObject', url: `${SITE}/favicon.svg` } },
          };
          applySeo({
            title: data.seo_title || data.og_title || data.title || 'Finance News | FORWORD',
            description: data.meta_description || data.og_description || data.summary || fallback.description,
            canonical: data.canonical_url || canonical,
            image: data.image_url || undefined,
            keywords: data.meta_keywords || (data.tags || []).join(', '),
            type: 'article',
            schema,
          });
        })
        .catch(() => {
          if (active) applySeo({ ...fallback, canonical });
        });
    } else if (path.startsWith('/category/')) {
      const slug = decodeURIComponent(path.slice('/category/'.length));
      if (supabase) {
        void supabase.from('categories').select('name,slug').eq('slug', slug).eq('kind', 'news').maybeSingle()
          .then(({ data }) => {
            if (!active) return;
            const name = data?.name || 'Finance';
            const title = `${name} News & Updates | FORWORD`;
            const description = `Read Indian ${name.toLowerCase()} news, explainers and financial updates on FORWORD.`;
            applySeo({ title, description, canonical, schema: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, description, url: canonical } });
          })
          .catch(() => { if (active) applySeo({ ...fallback, canonical }); });
      } else {
        applySeo({ ...fallback, canonical });
      }
    } else if (path.startsWith('/news/category/')) {
      const title = 'Finance News by Category | FORWORD';
      applySeo({ title, description: 'Browse Indian finance news by category, including markets, banking, loans, insurance and taxation.', canonical, schema: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, url: canonical } });
    } else {
      applySeo({ ...fallback, canonical, schema: path === '/' ? {
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'Organization', '@id': `${SITE}/#organization`, name: 'FORWORD', url: SITE, logo: `${SITE}/favicon.svg` },
          { '@type': 'WebSite', '@id': `${SITE}/#website`, name: 'FORWORD', url: SITE, inLanguage: 'en-IN', publisher: { '@id': `${SITE}/#organization` } },
        ],
      } : undefined });
    }

    return () => { active = false; };
  }, [pathname]);

  return null;
}
