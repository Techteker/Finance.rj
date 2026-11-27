import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getLanguageOption,
  isSupportedLang,
  LANGUAGES,
  normalizeLang,
  translate,
  translateCalculator,
  translateCategory,
  translateNewsCategory,
  translateOfferCategory,
  TRANSLATIONS,
  type LangCode,
  type TranslationKey,
} from './i18n';
import { CATEGORIES, NEWS_CATEGORIES, OFFER_CATEGORIES } from './menu';
import { CALCS } from './calc';

const EXPECTED_CODES: LangCode[] = ['en', 'hi', 'mr', 'gu', 'ta', 'te'];

test('all 6 Indian languages are registered with native metadata', () => {
  assert.deepEqual(
    LANGUAGES.map((l) => l.code),
    EXPECTED_CODES,
  );
  for (const code of EXPECTED_CODES) {
    assert.equal(isSupportedLang(code), true);
    const meta = getLanguageOption(code);
    assert.equal(meta.code, code);
    assert.ok(meta.nativeName.trim().length > 0);
    assert.ok(meta.shortLabel.trim().length > 0);
  }
});

test('every translation key in English has a non-empty translation across all 6 languages', () => {
  const enKeys = Object.keys(TRANSLATIONS.en) as TranslationKey[];
  assert.ok(enKeys.length >= 100);
  for (const code of EXPECTED_CODES) {
    const dict = TRANSLATIONS[code];
    for (const key of enKeys) {
      const value = dict[key];
      assert.equal(typeof value, 'string', `Missing key ${key} in ${code}`);
      assert.ok(value.trim().length > 0, `Empty translation for ${key} in ${code}`);
    }
    if (code !== 'en') {
      // Ensure core navigation labels are actually localized into native scripts, not left as English copies
      assert.notEqual(dict['nav.home'], TRANSLATIONS.en['nav.home']);
      assert.notEqual(dict['nav.category'], TRANSLATIONS.en['nav.category']);
      assert.notEqual(dict['nav.settings'], TRANSLATIONS.en['nav.settings']);
    }
  }
});

test('all finance categories, news categories, offer categories, and calculators have translations in all 6 languages', () => {
  for (const code of EXPECTED_CODES) {
    for (const cat of CATEGORIES) {
      const val = translateCategory(code, cat.slug, '__MISSING__');
      assert.notEqual(val, '__MISSING__', `Missing category ${cat.slug} in ${code}`);
    }
    for (const nc of NEWS_CATEGORIES) {
      const val = translateNewsCategory(code, nc.slug, '__MISSING__');
      assert.notEqual(val, '__MISSING__', `Missing news category ${nc.slug} in ${code}`);
    }
    for (const oc of OFFER_CATEGORIES) {
      const val = translateOfferCategory(code, oc.slug, '__MISSING__');
      assert.notEqual(val, '__MISSING__', `Missing offer category ${oc.slug} in ${code}`);
    }
    for (const calc of CALCS) {
      const val = translateCalculator(code, calc.slug, '__MISSING__');
      assert.notEqual(val, '__MISSING__', `Missing calculator ${calc.slug} in ${code}`);
    }
  }
});

test('normalizeLang safely handles locales, casing, and invalid inputs', () => {
  assert.equal(normalizeLang('hi'), 'hi');
  assert.equal(normalizeLang('HI-IN'), 'hi');
  assert.equal(normalizeLang('ta_IN'), 'ta');
  assert.equal(normalizeLang('mr'), 'mr');
  assert.equal(normalizeLang('gu'), 'gu');
  assert.equal(normalizeLang('te'), 'te');
  assert.equal(normalizeLang('fr'), 'en');
  assert.equal(normalizeLang(''), 'en');
  assert.equal(normalizeLang(null), 'en');
  assert.equal(normalizeLang(undefined), 'en');
});

test('translate interpolates placeholders cleanly across languages', () => {
  assert.equal(translate('en', 'offers.count', { count: 12 }), '12 offers');
  assert.equal(translate('hi', 'offers.count', { count: 12 }), '12 ऑफ़र');
  assert.equal(translate('ta', 'offers.count', { count: 5 }), '5 சலுகைகள்');
  assert.equal(translate('te', 'lang.switchedToast', { name: 'తెలుగు' }), 'భాష తెలుగు కు మార్చబడింది');
});
