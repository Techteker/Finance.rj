import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { getLiveSeoAuditRecords } from '../lib/api';
import { CANONICAL_SITE_URL } from '../lib/seo';
import {
  SEO_AUDIT_FILTERS,
  filterAuditEntries,
  runSeoAudit,
  type SeoAuditEntry,
  type SeoAuditFilter,
} from '../lib/seoAudit';
import { useAsync } from '../hooks/useAsync';
import { useToast } from '../hooks/app';
import { Page } from '../components/layout';
import { Btn } from '../components/ui';

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-card border border-line bg-white shadow-card ${className}`}>{children}</div>;
}

interface EndpointProbe {
  path: string;
  label: string;
  status: 'checking' | 'ok' | 'error';
  detail: string;
}

const CRAWL_ENDPOINTS = [
  { path: '/robots.txt', label: 'robots.txt', expect: 'Sitemap:' },
  { path: '/sitemap-index.xml', label: 'Sitemap Index', expect: '<sitemapindex' },
  { path: '/sitemap.xml', label: 'Main Sitemap', expect: '<urlset' },
  { path: '/sitemap-news.xml', label: 'News Sitemap', expect: 'sitemap-news' },
  { path: '/sitemap-images.xml', label: 'Image Sitemap', expect: 'sitemap-image' },
] as const;

export function AdminSeoAudit() {
  const toast = useToast();
  const [filter, setFilter] = useState<SeoAuditFilter>('all');
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [probeTick, setProbeTick] = useState(0);
  const [probes, setProbes] = useState<EndpointProbe[]>(
    CRAWL_ENDPOINTS.map((e) => ({ path: e.path, label: e.label, status: 'checking', detail: 'Checking…' })),
  );

  const liveState = useAsync(() => getLiveSeoAuditRecords(), [probeTick]);

  useEffect(() => {
    let active = true;
    setProbes(CRAWL_ENDPOINTS.map((e) => ({ path: e.path, label: e.label, status: 'checking', detail: 'Checking…' })));
    Promise.all(
      CRAWL_ENDPOINTS.map(async (ep): Promise<EndpointProbe> => {
        try {
          const res = await fetch(ep.path, { cache: 'no-store' });
          const text = await res.text();
          const valid = res.ok && text.includes(ep.expect);
          const urlMatches = text.match(/<loc>/g)?.length ?? 0;
          return {
            path: ep.path,
            label: ep.label,
            status: valid ? 'ok' : 'error',
            detail: valid
              ? ep.path === '/robots.txt'
                ? 'Valid robots directives'
                : `${urlMatches} XML entries`
              : `HTTP ${res.status}`,
          };
        } catch {
          return { path: ep.path, label: ep.label, status: 'error', detail: 'Unreachable' };
        }
      }),
    ).then((results) => {
      if (active) setProbes(results);
    });
    return () => {
      active = false;
    };
  }, [probeTick]);

  const report = useMemo(() => {
    const data = liveState.data;
    return runSeoAudit({
      origin: CANONICAL_SITE_URL,
      news: data?.news ?? [],
      products: data?.products ?? [],
      offers: data?.offers ?? [],
      brands: data?.brands ?? [],
      categories: data?.categories ?? [],
    });
  }, [liveState.data]);

  const filteredEntries = useMemo(
    () => filterAuditEntries(report.entries, filter, { issuesOnly, query }),
    [report.entries, filter, issuesOnly, query],
  );

  const allSitemapsHealthy = probes.every((p) => p.status === 'ok');
  const sitemapStatusLabel = probes.some((p) => p.status === 'checking')
    ? 'Checking…'
    : allSitemapsHealthy
      ? 'Healthy (5/5)'
      : `${probes.filter((p) => p.status === 'ok').length}/${probes.length} OK`;

  const rerunAudit = () => {
    setProbeTick((t) => t + 1);
    liveState.reload();
    toast.show('Re-running SEO audit…');
  };

  const exportReport = () => {
    const blob = new Blob([JSON.stringify({ ...report, endpoints: probes }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forword-seo-audit-${report.summary.auditedAt.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.show('SEO audit JSON exported.');
  };

  const copyFixSnippet = async (entry: SeoAuditEntry) => {
    const snippet = [
      `URL: ${entry.canonicalUrl || entry.path}`,
      `Recommended Title: ${entry.recommendedTitle}`,
      `Recommended Description: ${entry.recommendedDescription}`,
      `Keywords: ${entry.keywords}`,
      `Schemas: ${entry.schemaTypes.join(', ')}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(snippet);
      toast.show('Recommended SEO metadata copied.');
    } catch {
      toast.show('Could not access clipboard.');
    }
  };

  const s = report.summary;
  const kpis: { label: string; value: string | number; tone: 'ok' | 'warn' | 'err' | 'neutral' }[] = [
    { label: 'Total public URLs', value: s.totalPublicUrls, tone: 'neutral' },
    { label: 'Indexable URLs', value: s.indexableUrls, tone: 'ok' },
    { label: 'Noindex URLs', value: s.noIndexUrls, tone: 'neutral' },
    { label: 'Missing titles', value: s.missingTitles, tone: s.missingTitles ? 'err' : 'ok' },
    { label: 'Duplicate titles', value: s.duplicateTitles, tone: s.duplicateTitles ? 'err' : 'ok' },
    { label: 'Missing descriptions', value: s.missingDescriptions, tone: s.missingDescriptions ? 'err' : 'ok' },
    { label: 'Duplicate descriptions', value: s.duplicateDescriptions, tone: s.duplicateDescriptions ? 'err' : 'ok' },
    { label: 'Missing canonical URLs', value: s.missingCanonicals, tone: s.missingCanonicals ? 'err' : 'ok' },
    { label: 'Missing schema', value: s.missingSchema, tone: s.missingSchema ? 'err' : 'ok' },
    { label: 'Broken links', value: s.brokenLinks, tone: s.brokenLinks ? 'err' : 'ok' },
    { label: 'Missing image alt text', value: s.missingImageAlt, tone: s.missingImageAlt ? 'warn' : 'ok' },
    { label: 'Sitemap status', value: sitemapStatusLabel, tone: allSitemapsHealthy ? 'ok' : 'warn' },
    {
      label: 'Last SEO audit date',
      value: new Date(s.auditedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      tone: 'neutral',
    },
  ];

  return (
    <Page
      title="SEO Audit Panel"
      back
      seo={{
        title: 'Admin SEO Audit Panel',
        description: 'Internal FORWORD technical SEO audit, crawlability diagnostics, and metadata health checker.',
        noIndex: true,
      }}
      right={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={rerunAudit}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface/80"
          >
            <RefreshCw size={14} className={liveState.loading ? 'animate-spin' : ''} /> Re-audit
          </button>
          <button
            type="button"
            onClick={exportReport}
            className="inline-flex items-center gap-1.5 rounded-full bg-pri px-3 py-1.5 text-xs font-semibold text-white hover:bg-pri-dark"
          >
            <Download size={14} /> Export JSON
          </button>
        </div>
      }
    >
      {/* Health & Appwrite Data Source Banner */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-pri" />
              <h2 className="text-base font-bold text-ink">Technical SEO Health: {s.healthScore}/100</h2>
              <span className="rounded-full bg-mint px-2.5 py-0.5 text-[11px] font-semibold text-pri-dark">
                noindex protected
              </span>
            </div>
            <p className="text-xs text-slate">
              Canonical domain: <span className="font-semibold text-ink">{CANONICAL_SITE_URL}</span> ·{' '}
              {liveState.data?.configured
                ? liveState.data.error
                  ? `Supabase error: ${liveState.data.error} (showing structural routes)`
                  : `Live Supabase connected (${liveState.data.news.length} news, ${liveState.data.products.length} products, ${liveState.data.offers.length} offers, ${liveState.data.brands.length} brands)`
                : 'Supabase env vars not configured locally — auditing structural public catalog routes only (demo records are excluded from production SEO audits).'}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="text-danger">{s.errorCount} errors</span>
            <span className="text-amber-600">{s.warningCount} warnings</span>
          </div>
        </div>
      </Card>

      {/* 13 Core SEO Audit KPIs */}
      <section aria-label="SEO Audit Metrics">
        <h2 className="mb-2 text-sm font-bold text-ink">Audit Metrics</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {kpis.map((k) => {
            const valueCls =
              k.tone === 'err'
                ? 'text-danger'
                : k.tone === 'warn'
                  ? 'text-amber-600'
                  : k.tone === 'ok'
                    ? 'text-pri-dark'
                    : 'text-ink';
            return (
              <Card key={k.label} className="p-3">
                <p className="text-[11px] font-medium text-slate">{k.label}</p>
                <p className={`mt-1 text-base font-bold ${valueCls}`}>{k.value}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Crawl Endpoints Verification */}
      <section aria-label="Sitemaps and Robots Verification">
        <h2 className="mb-2 text-sm font-bold text-ink">Sitemaps & Crawlability Endpoints</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {probes.map((ep) => (
            <Card key={ep.path} className="flex items-center justify-between gap-2 p-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-ink">{ep.label}</p>
                <p className="truncate text-[11px] text-slate">{ep.detail}</p>
              </div>
              <a
                href={ep.path}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${ep.path}`}
                className="shrink-0 text-slate hover:text-pri"
              >
                {ep.status === 'ok' ? (
                  <CheckCircle2 size={18} className="text-pri" />
                ) : ep.status === 'error' ? (
                  <XCircle size={18} className="text-danger" />
                ) : (
                  <ExternalLink size={16} />
                )}
              </a>
            </Card>
          ))}
        </div>
      </section>

      {/* Filters & Search */}
      <section className="space-y-3" aria-label="URL Inspector">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-ink">Audited Public URLs ({filteredEntries.length})</h2>
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-ink">
            <input
              type="checkbox"
              checked={issuesOnly}
              onChange={(e) => setIssuesOnly(e.target.checked)}
              className="h-4 w-4 accent-pri"
            />
            Show issues only
          </label>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {SEO_AUDIT_FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active ? 'bg-pri text-white' : 'bg-surface text-slate hover:text-ink'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by URL path, page type, title, or schema (e.g. NewsArticle, /credit-cards)..."
            className="w-full rounded-xl border border-line bg-white py-2.5 pl-9 pr-3 text-sm text-ink outline-none focus:border-pri"
          />
        </div>

        {/* Audited URL Table */}
        <div className="space-y-2">
          {filteredEntries.slice(0, 60).map((entry) => {
            const expanded = expandedId === entry.id;
            const hasErrors = entry.issues.some((i) => i.severity === 'error');
            const hasWarnings = entry.issues.some((i) => i.severity === 'warning');
            return (
              <Card key={entry.id} className="p-3.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {hasErrors ? (
                        <XCircle size={15} className="shrink-0 text-danger" />
                      ) : hasWarnings ? (
                        <AlertTriangle size={15} className="shrink-0 text-amber-600" />
                      ) : (
                        <CheckCircle2 size={15} className="shrink-0 text-pri" />
                      )}
                      <Link to={entry.path || '/'} className="truncate text-xs font-bold text-pri-dark hover:underline">
                        {entry.path || '(missing path)'}
                      </Link>
                      <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-slate">
                        {entry.pageType}
                      </span>
                      <span className="rounded bg-mint px-1.5 py-0.5 text-[10px] font-semibold text-pri-dark">
                        {entry.schemaTypes.join(' + ')}
                      </span>
                    </div>
                    <p className="truncate text-xs font-semibold text-ink">{entry.title || '(Missing title)'}</p>
                    <p className="line-clamp-1 text-[11px] text-slate">{entry.description || '(Missing description)'}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => copyFixSnippet(entry)}
                      className="inline-flex items-center gap-1 rounded-lg bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-ink hover:bg-surface/80"
                    >
                      <Copy size={12} /> Copy Meta
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : entry.id)}
                      className="rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-semibold text-slate hover:text-ink"
                    >
                      {expanded ? 'Hide' : entry.issues.length ? `${entry.issues.length} Issues` : 'Details'}
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="mt-3 space-y-2 border-t border-line pt-3 text-xs">
                    <p className="text-slate">
                      <span className="font-semibold text-ink">Canonical:</span> {entry.canonicalUrl || 'None'}
                    </p>
                    <p className="text-slate">
                      <span className="font-semibold text-ink">Keywords:</span> {entry.keywords}
                    </p>
                    {entry.issues.length === 0 ? (
                      <p className="font-semibold text-pri-dark">All automated SEO checks passed for this URL.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {entry.issues.map((iss, idx) => (
                          <li key={idx} className="rounded-lg bg-surface p-2.5">
                            <p className={`font-semibold ${iss.severity === 'error' ? 'text-danger' : 'text-amber-700'}`}>
                              [{iss.severity.toUpperCase()}] {iss.message}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate">Recommended fix: {iss.fix}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
          {filteredEntries.length === 0 && (
            <Card className="p-6 text-center text-sm text-slate">
              No URLs match the current filter.
            </Card>
          )}
          {filteredEntries.length > 60 && (
            <p className="text-center text-xs text-slate">
              Showing first 60 of {filteredEntries.length} URLs. Use the search box or category filters to inspect specific pages, or export the full JSON report.
            </p>
          )}
        </div>
      </section>

      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="space-y-0.5 text-xs text-slate">
          <p className="font-bold text-ink">Search Console & Bing Webmaster Readiness</p>
          <p>
            Set <code className="rounded bg-surface px-1 py-0.5 text-ink">VITE_GOOGLE_SITE_VERIFICATION</code> and{' '}
            <code className="rounded bg-surface px-1 py-0.5 text-ink">VITE_BING_SITE_VERIFICATION</code> before production deployment, then submit{' '}
            <code className="rounded bg-surface px-1 py-0.5 text-ink">{CANONICAL_SITE_URL}/sitemap-index.xml</code>.
          </p>
        </div>
        <Btn to="/settings" variant="outline" full={false} className="!py-2 !text-xs">
          Back to Settings
        </Btn>
      </Card>
    </Page>
  );
}
