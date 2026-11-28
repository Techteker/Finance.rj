import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface VerifiedSession {
  userId: string;
  email: string;
  name: string;
  role: 'user' | 'editor' | 'admin';
}

export function getServerSupabaseConfig() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  return { url, serviceRoleKey, configured: Boolean(url && serviceRoleKey) };
}

let cachedAdminClient: SupabaseClient | null = null;
let cachedKeySignature = '';

export function getSupabaseAdmin(): SupabaseClient | null {
  const { url, serviceRoleKey, configured } = getServerSupabaseConfig();
  if (!configured) return null;
  const sig = `${url}:${serviceRoleKey.length}`;
  if (!cachedAdminClient || cachedKeySignature !== sig) {
    cachedAdminClient = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    cachedKeySignature = sig;
  }
  return cachedAdminClient;
}

export function extractBearerToken(authHeader: string | string[] | undefined): string {
  const raw = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!raw || typeof raw !== 'string') return '';
  const match = /^Bearer\s+([^\s]+)$/i.exec(raw.trim());
  return match ? match[1] : '';
}

export async function verifySupabaseSession(
  authHeader: string | string[] | undefined,
  adminOverride?: SupabaseClient | null,
): Promise<{ ok: true; session: VerifiedSession } | { ok: false; status: number; error: string }> {
  const admin = adminOverride !== undefined ? adminOverride : getSupabaseAdmin();
  if (!admin) {
    return { ok: false, status: 503, error: 'Backend authentication service is not configured.' };
  }

  const token = extractBearerToken(authHeader);
  if (!token) {
    return { ok: false, status: 401, error: 'Please sign in again.' };
  }

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) {
    return { ok: false, status: 401, error: 'Session expired. Please sign in again.' };
  }

  const user = data.user;
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .maybeSingle();

  const rawRole = typeof profile?.role === 'string' ? profile.role : 'user';
  const role: VerifiedSession['role'] = rawRole === 'admin' || rawRole === 'editor' ? rawRole : 'user';
  const name =
    (typeof profile?.full_name === 'string' && profile.full_name.trim()) ||
    (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
    'FORWORD User';

  return {
    ok: true,
    session: {
      userId: user.id,
      email: user.email || '',
      name,
      role,
    },
  };
}

export default { getServerSupabaseConfig, getSupabaseAdmin, verifySupabaseSession };
