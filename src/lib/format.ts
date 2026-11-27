const nf = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export const ONBOARDED_KEY = 'forword:onboarded';
export const inr = (n: number) => '₹ ' + nf.format(Math.round(Number.isFinite(n) ? n : 0));
export const num = (n: number) => nf.format(Math.round(n));

export function timeAgo(iso?: string): string {
  if (!iso) return '';
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return '';
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return shortDate(iso);
}
export function shortDate(iso?: string): string {
  if (!iso) return 'Not available';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Not available';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
export function parseFacts(facts?: string[]): [string, string][] {
  return (facts ?? []).map((f) => {
    const i = f.indexOf('|');
    return i < 0 ? [f, ''] : [f.slice(0, i).trim(), f.slice(i + 1).trim()];
  });
}
/** Only allow http(s) links for outbound navigation. */
export function safeUrl(u?: string): string | undefined {
  if (!u) return undefined;
  try {
    const p = new URL(u.trim());
    return p.protocol === 'https:' || p.protocol === 'http:' ? p.toString() : undefined;
  } catch {
    return undefined;
  }
}
/** Only allow safe relative in-app paths (blocks external URLs, //, backslashes, and control chars). */
export function safeInternalPath(path?: string): string | undefined {
  if (!path) return undefined;
  const trimmed = path.trim();
  if (!trimmed.startsWith('/')) return undefined;
  if (trimmed.startsWith('//') || trimmed.includes('\\')) return undefined;
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) return undefined;
  return trimmed;
}
/** Allow http(s) URLs or safe relative app asset paths for images. */
export function safeMediaUrl(u?: string): string | undefined {
  return safeUrl(u) ?? safeInternalPath(u);
}

export function safeStorageGet(storage: 'local' | 'session', key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return (storage === 'local' ? window.localStorage : window.sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

export function safeStorageSet(storage: 'local' | 'session', key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    (storage === 'local' ? window.localStorage : window.sessionStorage).setItem(key, value);
  } catch {
    // Ignore storage quota / private mode restrictions.
  }
}

export function safeStorageRemove(storage: 'local' | 'session', key: string): void {
  if (typeof window === 'undefined') return;
  try {
    (storage === 'local' ? window.localStorage : window.sessionStorage).removeItem(key);
  } catch {
    // Ignore storage access errors.
  }
}
