const PUBLIC_COLLECTIONS = new Set(['news', 'categories', 'offers', 'products', 'brands']);
const APPROVED_COLLECTIONS = new Set(['news', 'offers', 'products', 'brands']);

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const params = new URL(req.url || '/', 'https://finance-rj.invalid').searchParams;
  const collection = params.get('collection') || '';
  if (!PUBLIC_COLLECTIONS.has(collection)) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'Collection is not available through the public cache' }));
    return;
  }

  let queries: string[] = [];
  try {
    const raw = params.get('queries');
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) throw new Error('Invalid queries');
    queries = parsed.slice(0, 25);
  } catch {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'Invalid query parameters' }));
    return;
  }

  // Never let a public cache request return drafts or pending content.
  if (APPROVED_COLLECTIONS.has(collection)) {
    const hasApprovedFilter = queries.some((query) => {
      try {
        const item = JSON.parse(query);
        return item?.method === 'equal' && item?.attribute === 'status' && Array.isArray(item?.values) && item.values.includes('approved');
      } catch {
        return false;
      }
    });
    if (!hasApprovedFilter) {
      queries.push(JSON.stringify({ method: 'equal', attribute: 'status', values: ['approved'] }));
    }
  }

  const endpoint = (process.env.VITE_APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT || '').replace(/\/$/, '');
  const projectId = process.env.VITE_APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
  const databaseId = process.env.VITE_APPWRITE_DATABASE_ID || 'newsfeed_main';
  if (!endpoint || !projectId) {
    res.statusCode = 503;
    res.end(JSON.stringify({ error: 'Public data service is not configured' }));
    return;
  }

  const target = new URL(`${endpoint}/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(collection)}/documents`);
  for (const query of queries) target.searchParams.append('queries[]', query);

  try {
    const upstream = await fetch(target.toString(), {
      headers: { 'X-Appwrite-Project': projectId, Accept: 'application/json' },
    });
    const body = await upstream.text();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (!upstream.ok) {
      res.setHeader('Cache-Control', 'no-store');
      res.statusCode = upstream.status;
      res.end(body);
      return;
    }

    // Cache fresh responses for 60 seconds and permit stale responses for 30 minutes.
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=1800');
    res.setHeader('Vary', 'Accept-Encoding');
    res.statusCode = 200;
    res.end(body);
  } catch {
    res.setHeader('Cache-Control', 'no-store');
    res.statusCode = 502;
    res.end(JSON.stringify({ error: 'Unable to fetch public data' }));
  }
}
