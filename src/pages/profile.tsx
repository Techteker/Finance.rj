import { ChangeEvent, FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, Mail, Phone, Trash2, User } from 'lucide-react';
import { clearHistory, formatApiError, getHistory } from '../lib/api';
import { safeInternalPath } from '../lib/format';
import { useAuth } from '../hooks/auth';
import { useFavorites, useToast } from '../hooks/app';
import { useAsync } from '../hooks/useAsync';
import { useI18n } from '../hooks/i18n';
import { AuthGate, Page } from '../components/layout';
import { Async, Btn, Chips, Dialog, EmptyState, Field, ListRow, Segmented, Toggle } from '../components/ui';
import { NewsCard, Thumb } from '../components/cards';
import type { News } from '../types';

function RequireLogin({ title, children }: { title: string; children: ReactNode }) {
  return <AuthGate title={title} tab showRegister>{() => children}</AuthGate>;
}

export function Profile() {
  const { user, logout, sendVerification } = useAuth();
  const { items } = useFavorites();
  const { t } = useI18n();
  const toast = useToast();
  const nav = useNavigate();
  const [ask, setAsk] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const count = (kind: string) => String(items.filter((i) => i.itemType === kind).length);
  const requestVerify = async () => {
    if (verifying) return;
    setVerifying(true);
    try {
      await sendVerification();
      toast.show('Verification email sent. Check your inbox.');
    } catch (e) {
      toast.show(formatApiError(e));
    } finally {
      setVerifying(false);
    }
  };
  return (
    <RequireLogin title={t('nav.profile')}>
      <Page title={t('nav.profile')} big tab seo={{ noIndex: true }} right={<Link to="/settings" aria-label={t('nav.settings')} className="rounded-full bg-surface px-3 py-2 text-sm font-semibold">{t('nav.settings')}</Link>}>
        <div className="flex flex-col items-center gap-2 rounded-card bg-mint p-5">
          {user?.avatarUrl ? (
            <Thumb src={user.avatarUrl} alt={user.name || 'Profile avatar'} className="h-[72px] w-[72px] rounded-full border-2 border-white bg-white" />
          ) : (
            <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white text-3xl font-bold text-pri-dark">
              {(user?.name || 'U')[0].toUpperCase()}
            </span>
          )}
          <h2 className="text-lg font-bold">{user?.name || 'Your name'}</h2><p className="text-xs text-slate">{user?.email || user?.phone}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Btn to="/profile/edit" variant="outline" full={false} className="!py-2.5">{t('profile.edit')}</Btn>
            {user?.email && !user.emailVerification && (
              <Btn type="button" variant="ghost" full={false} disabled={verifying} onClick={requestVerify} className="!py-2.5 text-xs">
                {verifying ? t('common.sending') : t('profile.verifyEmail')}
              </Btn>
            )}
          </div>
        </div>
        <div>
          <ListRow icon="news" title={t('profile.savedArticles')} to="/favorites" right={<span className="text-sm font-semibold text-pri-dark">{count('news')}</span>} />
          <ListRow icon="card" title={t('profile.savedProducts')} to="/favorites" right={<span className="text-sm font-semibold text-pri-dark">{count('product')}</span>} />
          <ListRow icon="tag" title={t('profile.savedOffers')} to="/favorites" right={<span className="text-sm font-semibold text-pri-dark">{count('offer')}</span>} />
          <ListRow icon="clock" title={t('profile.readingHistory')} to="/profile/history" />
          <ListRow icon="coin" title={t('profile.myRewards')} to="/rewards" />
          <ListRow icon="wallet" title={t('profile.myWallet')} to="/wallet" />
          <ListRow icon="help" title={t('profile.helpSupport')} to="/help" />
          <ListRow icon="user" title={t('auth.logout')} onClick={() => setAsk(true)} right="none" />
        </div>
        <Dialog
          open={ask}
          busy={loggingOut}
          title={t('auth.logoutAsk')}
          text={t('auth.logoutText')}
          confirm={loggingOut ? t('common.loading') : t('auth.logout')}
          onClose={() => setAsk(false)}
          onConfirm={async () => {
            if (loggingOut) return;
            setLoggingOut(true);
            try {
              await logout();
              setAsk(false);
              nav('/');
            } finally {
              setLoggingOut(false);
            }
          }}
        />
      </Page>
    </RequireLogin>
  );
}

export function EditProfile() {
  const { user, updateName, updateAvatar, removeAvatar } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { setName(user?.name ?? ''); }, [user?.name]);

  const onPhotoPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || photoBusy) return;
    setMsg('');
    setErr('');
    setPhotoBusy(true);
    try {
      await updateAvatar(file);
      setMsg('Profile photo updated.');
    } catch (error) {
      setErr(error instanceof Error ? error.message : formatApiError(error));
    } finally {
      setPhotoBusy(false);
    }
  };

  const onPhotoRemove = async () => {
    if (photoBusy || !user?.avatarFileId) return;
    setMsg('');
    setErr('');
    setPhotoBusy(true);
    try {
      await removeAvatar();
      setMsg('Profile photo removed.');
    } catch (error) {
      setErr(error instanceof Error ? error.message : formatApiError(error));
    } finally {
      setPhotoBusy(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const trimmed = name.trim();
    setMsg('');
    setErr('');
    if (trimmed.length < 2) {
      setErr('Please enter your full name (at least 2 characters).');
      return;
    }
    setBusy(true);
    try {
      await updateName(trimmed);
      setMsg('Profile updated.');
    } catch (error) {
      setErr(formatApiError(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <RequireLogin title="Edit profile">
      <Page title="Edit profile" back seo={{ noIndex: true }}>
        <form onSubmit={submit} className="mx-auto max-w-md space-y-4">
          <div className="flex flex-col items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={onPhotoPick}
              className="hidden"
              aria-label="Upload profile photo"
            />
            <button
              type="button"
              disabled={photoBusy}
              onClick={() => fileRef.current?.click()}
              aria-label={user?.avatarUrl ? 'Replace profile photo' : 'Upload profile photo'}
              className="relative flex h-[88px] w-[88px] items-center justify-center overflow-hidden rounded-full bg-mint text-pri-dark transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {user?.avatarUrl ? (
                <Thumb src={user.avatarUrl} alt={user.name || 'Profile photo'} className="h-full w-full" />
              ) : (
                <Camera size={32} />
              )}
            </button>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <button
                type="button"
                disabled={photoBusy}
                onClick={() => fileRef.current?.click()}
                className="text-pri-dark hover:underline disabled:opacity-50"
              >
                {photoBusy ? 'Uploading…' : user?.avatarUrl ? 'Replace photo' : 'Upload photo'}
              </button>
              {user?.avatarFileId && (
                <button
                  type="button"
                  disabled={photoBusy}
                  onClick={onPhotoRemove}
                  className="text-danger hover:underline disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
          <Field label="Full name" icon={<User size={18} />} value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={120} />
          <Field label="Email" icon={<Mail size={18} />} value={user?.email ?? ''} disabled />
          <Field label="Mobile" icon={<Phone size={18} />} value={user?.phone ?? ''} disabled />
          {msg && <p role="status" className="text-sm font-medium text-pri-dark">{msg}</p>}
          {err && <p role="alert" className="text-sm font-medium text-danger">{err}</p>}
          <Btn type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Btn>
        </form>
      </Page>
    </RequireLogin>
  );
}

export function ReadingHistory({ title = 'Reading History' }: { title?: string }) {
  const { user } = useAuth();
  const toast = useToast();
  const state = useAsync(() => (user ? getHistory(user.$id) : Promise.resolve([])), [user?.$id]);
  const [ask, setAsk] = useState(false);
  const [clearing, setClearing] = useState(false);
  const asNews = (h: { newsId: string; title: string; slug: string; imageUrl?: string; categoryName?: string; $createdAt: string; $id: string; $updatedAt: string }) =>
    ({ $id: h.$id, $createdAt: h.$createdAt, $updatedAt: h.$updatedAt, title: h.title, slug: h.slug, imageUrl: h.imageUrl, categoryName: h.categoryName ?? 'News', categorySlug: '', summary: '', body: '', publisher: 'Read', sourceUrl: '', publishedAt: h.$createdAt, readTime: 0, status: 'approved' }) as News;
  return (
    <RequireLogin title={title}>
      <Page title={title} back seo={{ noIndex: true }} right={<button type="button" aria-label="Clear history" onClick={() => setAsk(true)} className="rounded-full bg-surface p-2"><Trash2 size={20} /></button>}>
        <Async state={state} empty={<EmptyState icon="clock" title="Nothing here yet" text="Stories you read will show up here." />}>{(items) => <div className="space-y-3">{items.map((h) => <NewsCard key={h.$id} n={asNews(h)} />)}</div>}</Async>
        <Dialog
          open={ask}
          busy={clearing}
          title="Clear reading history?"
          text="This removes all stories from your history."
          confirm={clearing ? 'Clearing…' : 'Clear'}
          onClose={() => setAsk(false)}
          onConfirm={async () => {
            if (clearing) return;
            setClearing(true);
            try {
              if (user) await clearHistory(user.$id);
              toast.show('Reading history cleared.');
            } catch (e) {
              toast.show(formatApiError(e));
            } finally {
              setClearing(false);
              setAsk(false);
              state.reload();
            }
          }}
        />
      </Page>
    </RequireLogin>
  );
}

export function Activity() {
  const [t, setT] = useState(0);
  return (
    <RequireLogin title="My Activity">
      <Page title="My Activity" back seo={{ noIndex: true }}>
        <Segmented items={['Reads', 'Saves']} value={t} onChange={setT} />
        {t === 0 ? <ReadingList /> : <SavedList />}
      </Page>
    </RequireLogin>
  );
}
function ReadingList() { const { user } = useAuth(); const s = useAsync(() => (user ? getHistory(user.$id) : Promise.resolve([])), [user?.$id]); return <Async state={s} empty={<EmptyState icon="clock" title="No reading activity yet" />}>{(i) => <div>{i.map((h) => <ListRow key={h.$id} to={`/news/${h.slug}`} icon="news" title={h.title} />)}</div>}</Async>; }
function SavedList() { const { items } = useFavorites(); return items.length ? <div>{items.map((i) => <ListRow key={i.$id} to={safeInternalPath(i.href) ?? '/'} icon="heart" title={i.title} sub={i.itemType} />)}</div> : <EmptyState icon="heart" title="No saves yet" />; }

export function RecentlyViewed() {
  const [t, setT] = useState(0);
  return <RequireLogin title="Recently Viewed"><Page title="Recently Viewed" back seo={{ noIndex: true }}><Chips items={['All', 'News']} value={t} onChange={setT} /><ReadingList /></Page></RequireLogin>;
}
export function MyReviews() {
  return <RequireLogin title="My Reviews"><Page title="My Reviews" back seo={{ noIndex: true }}><EmptyState icon="star" title="No reviews yet" text="Reviews you write on products will appear here." /></Page></RequireLogin>;
}

const PREF_ROWS: Record<string, { title: string; icon: string; rows: [string, string, boolean][] }> = {
  notifications: { title: 'Notifications', icon: 'bell', rows: [['breaking', 'Breaking news', true], ['market', 'Market updates', true], ['offers', 'New offers', false], ['rewards', 'Reward reminders', true], ['saved', 'Saved article updates', false]] },
  privacy: { title: 'Privacy', icon: 'user', rows: [['personalised', 'Personalised recommendations', true], ['analytics', 'Analytics', true], ['marketing', 'Marketing messages', false]] },
};
export function PrefSettings({ kind }: { kind: 'notifications' | 'privacy' }) {
  const { user, updatePrefs } = useAuth();
  const cfg = PREF_ROWS[kind];
  const stored = (user?.prefs as Record<string, Record<string, boolean>> | undefined)?.[kind] ?? {};
  const storedJson = JSON.stringify(stored);
  const [vals, setVals] = useState<Record<string, boolean>>(() => Object.fromEntries(cfg.rows.map(([k, , d]) => [k, stored[k] ?? d])));
  useEffect(() => {
    setVals(Object.fromEntries(cfg.rows.map(([k, , d]) => [k, stored[k] ?? d])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, user?.$id, storedJson]);
  const set = async (k: string, v: boolean) => {
    const next = { ...vals, [k]: v };
    setVals((cur) => ({ ...cur, [k]: v }));
    try { await updatePrefs({ [kind]: next }); }
    catch { setVals((cur) => ({ ...cur, [k]: !v })); }
  };
  return (
    <RequireLogin title={cfg.title}>
      <Page title={cfg.title} back seo={{ noIndex: true }}>
        <div>{cfg.rows.map(([k, label]) => <ListRow key={k} icon={cfg.icon} title={label} right={<Toggle on={vals[k]} label={label} onChange={(v) => set(k, v)} />} />)}</div>
        {kind === 'privacy' && <Link to="/contact" className="block text-sm font-semibold text-pri-dark">Request data download or account deletion</Link>}
      </Page>
    </RequireLogin>
  );
}

export function Settings() {
  const { user } = useAuth();
  const { t, langMeta } = useI18n();
  return (
    <Page title={t('nav.settings')} back tab seo={{ noIndex: true, description: 'Manage your FORWORD app settings, language, notifications, and privacy.' }}>
      <ListRow icon="globe" title={t('nav.language')} sub={langMeta.label} to="/settings/language" />
      <ListRow icon="bell" title={t('nav.notifications')} to="/settings/notifications" />
      <ListRow icon="user" title={t('profile.privacy')} to="/settings/privacy" />
      {user && <ListRow icon="file" title={t('auth.changePassword')} to="/settings/password" />}
      <ListRow icon="gift" title={t('profile.cookiePreferences')} to="/settings/cookies" />
      <ListRow icon="chart" title="SEO Audit Panel" sub="Crawlability, sitemaps & schema health" to="/admin/seo" />
      <ListRow icon="news" title={t('profile.aboutForword')} to="/about" />
    </Page>
  );
}
