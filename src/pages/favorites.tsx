import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Trash2 } from 'lucide-react';
import { useFavorites, useToast } from '../hooks/app';
import { useI18n } from '../hooks/i18n';
import type { TranslationKey } from '../lib/i18n';
import { AuthGate, Page } from '../components/layout';
import { Btn, Chips, EmptyState, Skeleton } from '../components/ui';
import { Thumb } from '../components/cards';
import { safeInternalPath } from '../lib/format';
import type { FavType } from '../types';

const FILTERS: { key: TranslationKey; type?: FavType }[] = [
  { key: 'common.all' }, { key: 'news.tabNews', type: 'news' }, { key: 'search.tabProducts', type: 'product' }, { key: 'nav.offers', type: 'offer' }, { key: 'search.tabCalculators', type: 'calculator' }, { key: 'news.tabGuides', type: 'guide' },
];
export function Favorites() {
  const { t } = useI18n();
  return (
    <AuthGate title={t('nav.favorite')} icon="heart" big tab back={false} emptyTitle={t('fav.loginTitle')} emptyText={t('fav.loginText')}>
      {() => <FavoritesBody />}
    </AuthGate>
  );
}

function FavoritesBody() {
  const { t } = useI18n();
  const { items, loading, remove, restore } = useFavorites();
  const toast = useToast();
  const [f, setF] = useState(0);
  const [q, setQ] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const shown = items.filter((i) => (!FILTERS[f].type || i.itemType === FILTERS[f].type) && (!q || (i.title + (i.subtitle ?? '')).toLowerCase().includes(q.toLowerCase())));

  return (
    <Page title={t('nav.favorite')} big tab wide seo={{ noIndex: true, description: 'View your saved financial news stories, products, calculators, and offers on FORWORD.' }}>
      <label className="flex items-center gap-2.5 rounded-[14px] border border-line bg-surface px-3.5 py-3"><Search size={20} className="text-slate" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('fav.searchPlaceholder')} aria-label={t('fav.searchPlaceholder')} className="flex-1 bg-transparent text-sm outline-none" /></label>
      <Chips items={FILTERS.map((x) => t(x.key))} value={f} onChange={setF} />
      {loading ? <Skeleton rows={3} /> : shown.length === 0 ? (
        <EmptyState icon="heart" title={items.length ? t('fav.noMatches') : t('fav.nothingSaved')} text={items.length ? t('fav.noMatchesText') : t('fav.nothingSavedText')} action={!items.length ? <Btn to="/">{t('fav.exploreNews')}</Btn> : undefined} />
      ) : (
        <ul className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
          {shown.map((i) => (
            <li key={i.$id} className="flex items-center gap-3 rounded-card border border-line bg-white p-3">
              <Thumb src={i.imageUrl} className="h-16 w-16 shrink-0 rounded-xl" />
              <Link to={safeInternalPath(i.href) ?? '/'} className="min-w-0 flex-1"><span className="block text-[11px] font-semibold capitalize text-pri-dark">{i.itemType}</span><span className="line-clamp-2 text-sm font-semibold">{i.title}</span>{i.subtitle && <span className="block truncate text-xs text-slate">{i.subtitle}</span>}</Link>
              <button
                aria-label="Remove from Favorites"
                disabled={removingId === i.$id}
                className="p-2 text-slate disabled:opacity-40"
                onClick={async () => {
                  if (removingId === i.$id) return;
                  setRemovingId(i.$id);
                  try {
                    await remove(i);
                    toast.show('Removed from Favorites', { label: 'Undo', run: () => { restore(i).catch(() => {}); } });
                  } catch {
                    toast.show('Could not remove item. Try again.');
                  } finally {
                    setRemovingId((cur) => (cur === i.$id ? null : cur));
                  }
                }}
              ><Trash2 size={18} /></button>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
