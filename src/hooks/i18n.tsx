import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  getLanguageOption,
  LANG_STORAGE_KEY,
  LANGUAGES,
  normalizeLang,
  translate,
  translateCalculator,
  translateCategory,
  translateCategoryDesc,
  translateNewsCategory,
  translateOfferCategory,
  type LangCode,
  type LanguageOption,
  type TranslationKey,
} from '../lib/i18n';
import { safeStorageGet, safeStorageSet } from '../lib/format';
import { useAuth } from './auth';

interface I18nCtx {
  lang: LangCode;
  langMeta: LanguageOption;
  languages: readonly LanguageOption[];
  setLang: (code: LangCode) => Promise<void>;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  tCategory: (slug: string, fallback: string) => string;
  tCategoryDesc: (slug: string, fallback: string) => string;
  tNewsCategory: (slug: string, fallback: string) => string;
  tOfferCategory: (slug: string, fallback: string) => string;
  tCalc: (slug: string, fallback: string) => string;
}

const defaultCtx: I18nCtx = {
  lang: 'en',
  langMeta: LANGUAGES[0],
  languages: LANGUAGES,
  setLang: async () => {},
  t: (key, vars) => translate('en', key, vars),
  tCategory: (slug, fallback) => translateCategory('en', slug, fallback),
  tCategoryDesc: (slug, fallback) => translateCategoryDesc('en', slug, fallback),
  tNewsCategory: (slug, fallback) => translateNewsCategory('en', slug, fallback),
  tOfferCategory: (slug, fallback) => translateOfferCategory('en', slug, fallback),
  tCalc: (slug, fallback) => translateCalculator('en', slug, fallback),
};

const Ctx = createContext<I18nCtx>(defaultCtx);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user, updatePrefs } = useAuth();
  const [lang, setLangState] = useState<LangCode>(() => normalizeLang(safeStorageGet('local', LANG_STORAGE_KEY)));
  const syncedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  // When a logged-in user already has a saved language preference in Appwrite, hydrate it once per session
  // if the device has not explicitly chosen a local language yet.
  useEffect(() => {
    if (!user?.$id || syncedUserIdRef.current === user.$id) return;
    syncedUserIdRef.current = user.$id;
    const prefLang = (user.prefs as Record<string, unknown> | undefined)?.lang;
    const localLang = safeStorageGet('local', LANG_STORAGE_KEY);
    if (!localLang && typeof prefLang === 'string') {
      const normalized = normalizeLang(prefLang);
      setLangState(normalized);
      safeStorageSet('local', LANG_STORAGE_KEY, normalized);
    }
  }, [user]);

  const setLang = useCallback(async (code: LangCode) => {
    const next = normalizeLang(code);
    setLangState(next);
    safeStorageSet('local', LANG_STORAGE_KEY, next);
    if (user) {
      try {
        await updatePrefs({ lang: next });
      } catch {
        // Local preference is already saved; keep UI responsive even offline.
      }
    }
  }, [user, updatePrefs]);

  const value = useMemo<I18nCtx>(() => ({
    lang,
    langMeta: getLanguageOption(lang),
    languages: LANGUAGES,
    setLang,
    t: (key, vars) => translate(lang, key, vars),
    tCategory: (slug, fallback) => translateCategory(lang, slug, fallback),
    tCategoryDesc: (slug, fallback) => translateCategoryDesc(lang, slug, fallback),
    tNewsCategory: (slug, fallback) => translateNewsCategory(lang, slug, fallback),
    tOfferCategory: (slug, fallback) => translateOfferCategory(lang, slug, fallback),
    tCalc: (slug, fallback) => translateCalculator(lang, slug, fallback),
  }), [lang, setLang]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
