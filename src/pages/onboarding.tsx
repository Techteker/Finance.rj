import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Btn, EmptyState, ListRow } from '../components/ui';
import { Page, Logo } from '../components/layout';
import { IconBadge } from '../components/Icon';
import { useToast } from '../hooks/app';
import { useI18n } from '../hooks/i18n';
import { translate, type LangCode, type TranslationKey } from '../lib/i18n';
import { ONBOARDED_KEY, safeStorageSet } from '../lib/format';
import { applySeo } from '../lib/seo';

export function Splash({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  useEffect(() => { const tmr = setTimeout(onDone, 1100); return () => clearTimeout(tmr); }, [onDone]);
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-pri text-white">
      <div className="text-[40px] font-bold tracking-tight">FOR<span className="text-gold">WORD</span></div>
      <p className="mt-2 text-sm font-medium text-white/85">{t('auth.tagline')}</p>
    </div>
  );
}

export function Welcome() {
  const { t } = useI18n();
  useEffect(() => { applySeo({ title: 'Welcome', noIndex: true }); }, []);
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-4 py-8">
      <Logo />
      <div className="flex flex-1 flex-col justify-center gap-4">
        <div className="flex h-72 items-center justify-center rounded-3xl bg-mint"><IconBadge name="news" size={120} /></div>
        <h1 className="text-[28px] font-bold leading-tight">{t('auth.welcomeTitle')}</h1>
        <p className="text-sm text-slate">{t('auth.welcomeSubtitle')}</p>
      </div>
      <Btn to="/onboarding">{t('auth.getStarted')}</Btn>
      <Btn to="/login" variant="outline">{t('auth.alreadyHaveAccount')}</Btn>
    </div>
  );
}

const SLIDES: { icon: string; titleKey: TranslationKey; textKey: TranslationKey }[] = [
  { icon: 'news', titleKey: 'auth.slide1Title', textKey: 'auth.slide1Text' },
  { icon: 'card', titleKey: 'auth.slide2Title', textKey: 'auth.slide2Text' },
  { icon: 'gift', titleKey: 'auth.slide3Title', textKey: 'auth.slide3Text' },
];
export function Onboarding() {
  const { t } = useI18n();
  useEffect(() => { applySeo({ title: 'Get Started', noIndex: true }); }, []);
  const [i, setI] = useState(0);
  const nav = useNavigate();
  const finish = () => nav('/language');
  const s = SLIDES[i];
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-4 py-6">
      <div className="flex justify-end"><button onClick={finish} className="text-sm font-semibold text-slate">{t('common.skip')}</button></div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <IconBadge name={s.icon} size={120} />
        <h1 className="text-xl font-bold">{t(s.titleKey)}</h1>
        <p className="text-sm text-slate">{t(s.textKey)}</p>
      </div>
      <div className="flex justify-center gap-1.5" aria-hidden>{SLIDES.map((_, k) => <span key={k} className={`h-2 rounded-full ${k === i ? 'w-6 bg-pri' : 'w-2 bg-line'}`} />)}</div>
      <Btn onClick={() => (i < SLIDES.length - 1 ? setI(i + 1) : finish())}>{i < SLIDES.length - 1 ? t('common.next') : t('auth.getStarted')}</Btn>
    </div>
  );
}

export function LanguageSelect({ settings = false }: { settings?: boolean }) {
  const nav = useNavigate();
  const toast = useToast();
  const { lang, languages, setLang, t } = useI18n();
  const choose = async (code: LangCode, nativeName: string) => {
    await setLang(code);
    toast.show(translate(code, 'lang.switchedToast', { name: nativeName }));
  };
  return (
    <Page title={settings ? t('lang.title') : t('lang.chooseTitle')} back seo={{ noIndex: true }}>
      <div>
        <p className="mb-3 rounded-xl bg-mint px-3.5 py-2.5 text-sm font-medium text-pri-dark">{t('lang.activeSubtitle')}</p>
        {languages.map((item) => (
          <ListRow
            key={item.code}
            icon="globe"
            title={item.label}
            sub={item.nativeName !== item.name ? `${item.nativeName} · ${item.code.toUpperCase()}` : item.code.toUpperCase()}
            onClick={() => choose(item.code, item.nativeName)}
            right={lang === item.code ? <Check size={18} className="text-pri-dark" aria-label="Selected" /> : 'none'}
          />
        ))}
      </div>
      {!settings && <Btn onClick={() => { safeStorageSet('local', ONBOARDED_KEY, '1'); nav('/notification-permission'); }}>{t('common.continue')}</Btn>}
    </Page>
  );
}

export function NotificationPermission() {
  const { t } = useI18n();
  useEffect(() => { applySeo({ title: 'Notifications', noIndex: true }); }, []);
  const nav = useNavigate();
  const done = () => { safeStorageSet('local', ONBOARDED_KEY, '1'); nav('/'); };
  const allow = async () => { try { if ('Notification' in window) await Notification.requestPermission(); } finally { done(); } };
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center">
      <EmptyState icon="bell" title={t('auth.stayUpdated')} text={t('auth.stayUpdatedText')}
        action={<div className="space-y-2.5"><Btn onClick={allow}>{t('auth.allowNotifications')}</Btn><Btn variant="outline" onClick={done}>{t('auth.notNow')}</Btn></div>} />
    </div>
  );
}

export function AccountCreated() {
  const { t } = useI18n();
  useEffect(() => {
    safeStorageSet('local', ONBOARDED_KEY, '1');
    applySeo({ title: 'Account Created', noIndex: true });
  }, []);
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center">
      <EmptyState icon="star" title={t('auth.allSet')} text={t('auth.allSetText')} action={<Btn to="/">{t('common.goHome')}</Btn>} />
    </div>
  );
}
