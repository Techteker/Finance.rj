import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Btn, EmptyState, ListRow } from '../components/ui';
import { Page, Logo } from '../components/layout';
import { IconBadge } from '../components/Icon';
import { useAuth } from '../hooks/auth';

export const ONBOARDED_KEY = 'forword:onboarded';

export function Splash({ onDone }: { onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 1100); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-pri text-white">
      <div className="text-[40px] font-bold tracking-tight">FOR<span className="text-gold">WORD</span></div>
      <p className="mt-2 text-sm font-medium text-white/85">Indian finance. Made clear.</p>
    </div>
  );
}

export function Welcome() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-4 py-8">
      <Logo />
      <div className="flex flex-1 flex-col justify-center gap-4">
        <div className="flex h-72 items-center justify-center rounded-3xl bg-mint"><IconBadge name="news" size={120} /></div>
        <h1 className="text-[28px] font-bold leading-tight">Your money, explained</h1>
        <p className="text-sm text-slate">News, product comparisons, calculators and offers for every Indian saver, in one app.</p>
      </div>
      <Btn to="/onboarding">Get Started</Btn>
      <Btn to="/login" variant="outline">I already have an account</Btn>
    </div>
  );
}

const SLIDES = [
  { icon: 'news', title: 'Trusted financial news', text: 'Approved Indian business, banking and market news with publisher attribution.' },
  { icon: 'card', title: 'Compare finance products', text: 'Credit cards, loans, insurance and investments side by side.' },
  { icon: 'gift', title: 'Earn while you read', text: 'Collect rewards for daily reading and move them to your wallet.' },
];
export function Onboarding() {
  const [i, setI] = useState(0);
  const nav = useNavigate();
  const finish = () => nav('/language');
  const s = SLIDES[i];
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-4 py-6">
      <div className="flex justify-end"><button onClick={finish} className="text-sm font-semibold text-slate">Skip</button></div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <IconBadge name={s.icon} size={120} />
        <h1 className="text-xl font-bold">{s.title}</h1>
        <p className="text-sm text-slate">{s.text}</p>
      </div>
      <div className="flex justify-center gap-1.5" aria-hidden>{SLIDES.map((_, k) => <span key={k} className={`h-2 rounded-full ${k === i ? 'w-6 bg-pri' : 'w-2 bg-line'}`} />)}</div>
      <Btn onClick={() => (i < SLIDES.length - 1 ? setI(i + 1) : finish())}>{i < SLIDES.length - 1 ? 'Next' : 'Get Started'}</Btn>
    </div>
  );
}

export const LANGUAGES = [['en', 'English'], ['hi', 'हिन्दी (Hindi)'], ['mr', 'मराठी (Marathi)'], ['gu', 'ગુજરાતી (Gujarati)'], ['ta', 'தமிழ் (Tamil)'], ['te', 'తెలుగు (Telugu)']];
export function LanguageSelect({ settings = false }: { settings?: boolean }) {
  const nav = useNavigate();
  const { user, updatePrefs } = useAuth();
  const [lang, setLang] = useState(localStorage.getItem('forword:lang') || 'en');
  const choose = async (code: string) => {
    setLang(code); localStorage.setItem('forword:lang', code);
    if (settings && user) { try { await updatePrefs({ lang: code }); } catch { /* local preference still saved */ } }
  };
  return (
    <Page title={settings ? 'Language' : 'Choose language'} back>
      <div>
        <p className="mb-2 text-sm text-slate">Content is in English today. More Indian languages are coming.</p>
        {LANGUAGES.map(([c, l]) => <ListRow key={c} icon="globe" title={l} onClick={() => choose(c)} right={lang === c ? <Check size={18} className="text-pri-dark" /> : 'none'} />)}
      </div>
      {!settings && <Btn onClick={() => { localStorage.setItem(ONBOARDED_KEY, '1'); nav('/notification-permission'); }}>Continue</Btn>}
    </Page>
  );
}

export function NotificationPermission() {
  const nav = useNavigate();
  const done = () => { localStorage.setItem(ONBOARDED_KEY, '1'); nav('/'); };
  const allow = async () => { try { if ('Notification' in window) await Notification.requestPermission(); } finally { done(); } };
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center">
      <EmptyState icon="bell" title="Stay updated" text="Get breaking RBI, market and offer alerts. You control what you receive in Settings."
        action={<div className="space-y-2.5"><Btn onClick={allow}>Allow notifications</Btn><Btn variant="outline" onClick={done}>Not now</Btn></div>} />
    </div>
  );
}

export function AccountCreated() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center">
      <EmptyState icon="star" title="You are all set!" text="Your account is ready. Start reading and earning." action={<Btn to="/">Go to Home</Btn>} />
    </div>
  );
}
