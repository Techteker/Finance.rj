import { FormEvent, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Mail, User } from 'lucide-react';
import { formatApiError, sendMessage } from '../lib/api';
import { safeStorageGet, safeStorageSet } from '../lib/format';
import { useOnline } from '../hooks/app';
import { useI18n } from '../hooks/i18n';
import { Page } from '../components/layout';
import { SEOHead } from '../components/SEOHead';
import { buildFaqJsonLd, buildWebPageJsonLd, buildWebsiteJsonLd } from '../lib/seo';
import { Btn, EmptyState, Field, ListRow, Toggle } from '../components/ui';

export function NotFound() {
  const { t } = useI18n();
  return <Page title={t('utility.notFound')} back seo={{ noIndex: true, description: 'The requested page could not be found on FORWORD.' }}><EmptyState icon="help" title={t('utility.notFound')} text={t('utility.notFoundText')} action={<Btn to="/">{t('common.goHome')}</Btn>} /></Page>;
}
export function Offline() {
  const on = useOnline();
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center">
      <SEOHead title="Offline" description="You are currently offline." noIndex />
      <EmptyState icon="globe" title={on ? 'You are back online' : 'No internet connection'} text={on ? 'You can continue where you left off.' : 'Check your network and try again.'} action={<Btn onClick={() => window.location.assign('/')}>Retry</Btn>} />
    </div>
  );
}
export function Maintenance() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center">
      <SEOHead title="Scheduled Maintenance" description="FORWORD is undergoing scheduled maintenance." noIndex />
      <EmptyState icon="calc" title="We will be right back" text="FORWORD is undergoing scheduled maintenance." action={<Btn onClick={() => window.location.assign('/')}>Check again</Btn>} />
    </div>
  );
}

const FAQS: [string, string][] = [
  ['How does FORWORD earn?', 'We may earn a commission when you apply for a product through a partner link. This never affects editorial rankings.'],
  ['Are rates verified?', 'Product details come from provider sources and show a last verified date. Always confirm on the provider’s site before applying.'],
  ['How do rewards work?', 'You collect coins for check-ins and reading. Balances are managed securely on our servers.'],
  ['How do I delete my account?', 'Use Contact us and we will process your request.'],
];
export function Faq() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <Page
      title="FAQ"
      back
      seo={{
        title: 'Frequently Asked Questions',
        description: 'Answers to common questions about FORWORD: how we verify Indian finance rates, editorial independence, affiliate commissions, rewards, and accounts.',
        keywords: 'FORWORD FAQ, credit card comparison FAQ, financial calculators FAQ, editorial independence India',
        breadcrumbs: [{ name: 'Home', path: '/' }, { name: 'FAQ', path: '/faq' }],
        jsonLd: buildFaqJsonLd(FAQS),
      }}
    >
      {FAQS.map(([q, a], i) => (
        <div key={q}><ListRow icon="help" title={q} onClick={() => setOpen(open === i ? null : i)} right={open === i ? '–' : '+'} />{open === i && <p className="py-3 pl-14 text-sm text-slate">{a}</p>}</div>
      ))}
    </Page>
  );
}

export function Contact() {
  const [f, setF] = useState({ name: '', email: '', message: '' });
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    setErrMsg('');
    try {
      await sendMessage(f);
      setState('sent');
      setF({ name: '', email: '', message: '' });
    } catch (err) {
      setErrMsg(formatApiError(err));
      setState('error');
    }
  };
  return (
    <Page
      title="Contact us"
      back
      seo={{
        description: 'Contact the FORWORD team for support, feedback, account requests, or editorial questions. We typically respond within 2 working days.',
        keywords: 'contact FORWORD, Indian finance support, editorial corrections, privacy request',
        breadcrumbs: [{ name: 'Home', path: '/' }, { name: 'Contact Us', path: '/contact' }],
        jsonLd: buildWebPageJsonLd(window.location.origin, {
          name: 'Contact FORWORD',
          description: 'Contact the FORWORD team for support, feedback, account requests, or editorial questions.',
          path: '/contact',
          type: 'ContactPage',
        }),
      }}
    >
      <form onSubmit={submit} className="mx-auto max-w-md space-y-4">
        <p className="text-sm text-slate">We usually reply within 2 working days.</p>
        <Field label="Name" required minLength={2} maxLength={120} icon={<User size={18} />} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Field label="Email" type="email" required maxLength={254} icon={<Mail size={18} />} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <label className="block text-xs font-medium text-slate">Message<textarea required minLength={5} maxLength={5000} rows={5} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} className="mt-1.5 w-full rounded-xl border border-line p-3.5 text-sm outline-none focus:border-pri" /></label>
        {state === 'sent' && <p role="status" className="text-sm font-medium text-pri-dark">Message sent. Thank you.</p>}
        {state === 'error' && <p role="alert" className="text-sm font-medium text-danger">{errMsg || 'Could not send. Try again.'}</p>}
        <Btn type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send message'}</Btn>
      </form>
    </Page>
  );
}

export function Help() {
  const { t } = useI18n();
  return (
    <Page
      title={t('profile.helpSupport')}
      back
      seo={{
        title: 'Help & Support',
        description: 'Get help with FORWORD: browse FAQs, contact support, review our affiliate disclosure, terms of use, and privacy policy.',
        keywords: 'FORWORD help center, finance support India, account help',
        breadcrumbs: [{ name: 'Home', path: '/' }, { name: 'Help & Support', path: '/help' }],
        jsonLd: buildWebPageJsonLd(window.location.origin, {
          name: 'Help & Support – FORWORD',
          description: 'Get help with FORWORD: browse FAQs, contact support, review our affiliate disclosure, terms of use, and privacy policy.',
          path: '/help',
        }),
      }}
    >
      <ListRow icon="help" title={t('utility.faq')} to="/faq" /><ListRow icon="user" title={t('utility.contactUs')} to="/contact" /><ListRow icon="file" title={t('utility.affiliateDisclosure')} to="/disclosure" /><ListRow icon="file" title={t('utility.terms')} to="/terms" /><ListRow icon="shield" title={t('utility.privacyPolicy')} to="/privacy" />
    </Page>
  );
}
export function About() {
  const { t } = useI18n();
  const origin = window.location.origin;
  const aboutDesc = 'About FORWORD — India’s independent financial discovery platform bringing clear finance news, verified product comparisons, money calculators, and offers.';
  return (
    <Page
      title={t('profile.aboutForword')}
      back
      seo={{
        title: 'About FORWORD',
        description: aboutDesc,
        keywords: 'about FORWORD, Indian personal finance platform, financial news editorial standards',
        breadcrumbs: [{ name: 'Home', path: '/' }, { name: 'About FORWORD', path: '/about' }],
        jsonLd: [
          buildWebPageJsonLd(origin, { name: 'About FORWORD', description: aboutDesc, path: '/about', type: 'AboutPage' }),
          buildWebsiteJsonLd(origin)[0],
        ],
      }}
    >
      <h2 className="text-2xl font-bold">{t('profile.aboutForword')}</h2><p className="text-sm leading-relaxed text-slate">FORWORD.in is an Indian financial discovery platform that combines news, product comparisons, calculators and offers. Version 1.0.0</p>
    </Page>
  );
}

const Legal = ({ title, path, sections }: { title: string; path: string; sections: [string, string][] }) => {
  const desc = `Read the FORWORD ${title.toLowerCase()} covering platform usage, data practices, rewards, affiliate links, and financial estimate disclaimers.`;
  return (
    <Page
      title={title}
      back
      seo={{
        description: desc,
        keywords: `FORWORD ${title.toLowerCase()}, legal policy India, personal finance platform terms`,
        breadcrumbs: [{ name: 'Home', path: '/' }, { name: title, path }],
        jsonLd: buildWebPageJsonLd(window.location.origin, { name: `${title} – FORWORD`, description: desc, path }),
      }}
    >
    <p className="rounded-xl bg-gold/20 p-3 text-xs font-medium text-[#8A5A00]">Draft text — requires legal review before public launch. Replace every section with your lawyer-reviewed policy.</p>
    {sections.map(([heading, note]) => (
      <section key={heading} className="space-y-1.5">
        <h2 className="text-base font-bold">{heading}</h2>
        <p className="text-sm text-slate">{note}</p>
      </section>
    ))}
  </Page>
  );
};
export const Terms = () => (
  <Legal
    title="Terms & Conditions"
    path="/terms"
    sections={[
      ['Using FORWORD', 'Draft placeholder: add final terms governing account eligibility, acceptable use, and Indian jurisdiction.'],
      ['Financial information', 'Draft placeholder: product rates, calculators, and articles on FORWORD are informational estimates and not financial or tax advice.'],
      ['Affiliate links', 'Draft placeholder: FORWORD may earn partner commissions on eligible applications without influencing editorial rankings.'],
      ['Reward eligibility conditions', 'Draft placeholder: coins are awarded only for server-verified daily check-ins, approved article reads meeting minimum duration, and valid referrals, subject to daily limits and anti-abuse checks.'],
      ['Withdrawal rules', 'Draft placeholder: UPI withdrawal requests are subject to minimum/maximum server limits, pending request caps, balance verification, and manual operator review before payout.'],
      ['Referral conditions', 'Draft placeholder: self-referrals, duplicate accounts, and automated sign-ups are prohibited; referral codes may be applied once per eligible account and are subject to per-user caps.'],
      ['Limitation of liability', 'Draft placeholder: add lawyer-reviewed limitation of liability and dispute resolution clauses before launch.'],
    ]}
  />
);
export const Privacy = () => (
  <Legal
    title="Privacy Policy"
    path="/privacy"
    sections={[
      ['Data we collect', 'Draft placeholder: document account details (name, email, phone), saved items, reading history, calculator history, support messages, and UPI payout IDs collected for withdrawals.'],
      ['How we use it', 'Draft placeholder: describe service delivery, security verification, anti-fraud enforcement, and optional analytics cookies under applicable Indian data protection law (DPDP Act).'],
      ['Cookies and choices', 'Draft placeholder: essential cookies support login and security; analytics cookies can be managed anytime from Cookie preferences.'],
      ['User data deletion process', 'Draft placeholder: users may request account export or deletion through Contact us (/contact); document verification steps, retention exceptions for financial audit logs, and processing SLA.'],
      ['Contact & grievance officer', 'Draft placeholder: add official support email and Grievance Officer contact details required before launch.'],
    ]}
  />
);

export const COOKIE_KEY = 'forword:cookies';
export function CookieSettings() {
  const { t } = useI18n();
  const [on, setOn] = useState(() => safeStorageGet('local', COOKIE_KEY) === 'all');
  return <Page title={t('profile.cookiePreferences')} back seo={{ noIndex: true }}><ListRow icon="gift" title={t('utility.essentialCookies')} sub="Required for login and security" right={<Toggle on label={t('utility.essentialCookies')} onChange={() => {}} />} /><ListRow icon="bars" title={t('utility.analyticsCookies')} sub="Help us improve FORWORD" right={<Toggle on={on} label={t('utility.analyticsCookies')} onChange={(v) => { setOn(v); safeStorageSet('local', COOKIE_KEY, v ? 'all' : 'essential'); }} />} /></Page>;
}
const COOKIE_DEFERRED_PATHS = new Set([
  '/login',
  '/login/mobile',
  '/register',
  '/verify-otp',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/welcome',
  '/onboarding',
  '/account-created',
]);

export function CookieBanner() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const [seen, setSeen] = useState(() => Boolean(safeStorageGet('local', COOKIE_KEY)));
  if (seen || COOKIE_DEFERRED_PATHS.has(pathname)) return null;
  const pick = (v: string) => { safeStorageSet('local', COOKIE_KEY, v); setSeen(true); };
  return (
    <div role="dialog" aria-label={t('profile.cookiePreferences')} className="fixed inset-x-3 bottom-24 z-[55] mx-auto max-w-md space-y-2.5 rounded-2xl border border-line bg-white p-4 shadow-card md:bottom-4">
      <h2 className="text-base font-bold">{t('profile.cookiePreferences')}</h2><p className="text-xs text-slate">{t('utility.cookieText')}</p>
      <div className="flex gap-2.5"><Btn variant="outline" onClick={() => pick('essential')}>{t('utility.essentialOnly')}</Btn><Btn onClick={() => pick('all')}>{t('utility.acceptAll')}</Btn></div>
    </div>
  );
}
