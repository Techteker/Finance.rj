import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { applySeo, type SeoConfig } from '../lib/seo';

/**
 * Declarative SEO head manager backed by the single centralized applySeo() engine.
 * Useful on standalone pages that do not render the shared <Page /> wrapper.
 */
export function SEOHead(props: SeoConfig) {
  const { pathname } = useLocation();
  const key = JSON.stringify(props);
  useEffect(() => {
    applySeo({ canonicalPath: pathname, ...props });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, key]);
  return null;
}
