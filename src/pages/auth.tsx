import { FormEvent, InputHTMLAttributes, ReactNode, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Eye, EyeOff, Lock, Mail, Phone, User } from 'lucide-react';
import { Btn, Field } from '../components/ui';
import { AuthGate, Page } from '../components/layout';
import { ApiError } from '../lib/api';
import { safeInternalPath, safeStorageGet } from '../lib/format';
import { applySeo } from '../lib/seo';
import { useAuth } from '../hooks/auth';
import { useI18n } from '../hooks/i18n';

/* ---------- Shared Sage-Header + Curved-Sheet Auth Architecture ---------- */

function AuthWordmark() {
  return (
    <Link
      to="/"
      aria-label="FORWORD home"
      className="select-none text-[34px] font-extrabold tracking-[-0.025em] leading-none transition-opacity hover:opacity-90 lg:text-[42px]"
    >
      <span className="text-[#111315]">FOR</span>
      <span className="text-white">WORD</span>
    </Link>
  );
}

function AuthShell({
  seoTitle,
  headingLight,
  headingBold,
  inlineHeading = false,
  sub,
  children,
  back = true,
}: {
  seoTitle: string;
  headingLight: string;
  headingBold: string;
  inlineHeading?: boolean;
  sub?: string;
  children: ReactNode;
  back?: boolean;
}) {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const { t } = useI18n();

  useEffect(() => {
    applySeo({
      title: seoTitle,
      canonicalPath: pathname,
      noIndex: true,
      description: sub || 'Sign in or manage your FORWORD account.',
    });
    window.scrollTo(0, 0);
  }, [seoTitle, pathname, sub]);

  const goBack = () => {
    if (window.history.length > 1) nav(-1);
    else nav('/');
  };

  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-12">
      {/* Top Sage Brand Canvas (Mobile) / Left Split Brand Canvas (Desktop) */}
      <header className="auth-sage-canvas relative flex min-h-[248px] flex-col items-center justify-center px-6 pb-14 pt-10 text-center lg:col-span-5 lg:min-h-screen lg:justify-between lg:px-12 lg:py-12 lg:text-left">
        <div className="flex w-full items-center justify-between">
          {back ? (
            <button
              type="button"
              onClick={goBack}
              aria-label={t('nav.back')}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25"
            >
              <ChevronLeft size={22} />
            </button>
          ) : (
            <span className="h-11 w-11" aria-hidden />
          )}
          <span className="hidden text-xs font-medium tracking-wide text-white/80 lg:inline">
            forword.in
          </span>
        </div>

        <div className="my-auto flex flex-col items-center py-6 lg:items-start">
          <AuthWordmark />
          <p className="mt-4 hidden max-w-xs text-[15px] leading-relaxed text-white/90 lg:block">
            Verified Indian financial news, transparent product comparisons, smart calculators, and curated partner offers.
          </p>
        </div>

        <div className="hidden w-full text-xs text-white/75 lg:block">
          Trusted personal finance discovery across India.
        </div>
      </header>

      {/* Curved White Form Sheet (Mobile overlaps sage header) / Clean Right Column (Desktop) */}
      <main className="relative z-10 -mt-8 flex flex-1 flex-col rounded-t-[34px] bg-white px-6 pb-10 pt-8 sm:px-8 lg:col-span-7 lg:mt-0 lg:justify-center lg:rounded-none lg:px-14 lg:py-12">
        <div className="mx-auto w-full max-w-[400px]">
          <div className="mb-6 space-y-2">
            <h1 className="text-[30px] leading-[1.15] tracking-[-0.02em] text-[#141714] sm:text-[32px]">
              <span className="font-light">{headingLight}</span>
              {inlineHeading ? ' ' : <br />}
              <span className="font-bold">{headingBold}</span>
            </h1>
            {sub && <p className="text-[13.5px] leading-relaxed text-[#556153]">{sub}</p>}
          </div>

          <div className="space-y-4">{children}</div>
        </div>
      </main>
    </div>
  );
}

function AuthPillInput({
  icon,
  type = 'text',
  label,
  className = '',
  ...props
}: {
  icon: ReactNode;
  label: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  const isPassword = type === 'password';
  const [visible, setVisible] = useState(false);

  return (
    <label className={`block ${className}`}>
      <span className="sr-only">{label}</span>
      <span className="flex h-[52px] items-center gap-3 rounded-full border border-[#9BB797] bg-[#E5EFE3] px-5 transition-colors focus-within:border-[#5D8C56] focus-within:bg-[#EDF5EC] focus-within:ring-2 focus-within:ring-[#6B9A64]/25">
        <span className="shrink-0 text-[#495747]" aria-hidden>
          {icon}
        </span>
        <input
          type={isPassword && visible ? 'text' : type}
          aria-label={label}
          className="min-w-0 flex-1 bg-transparent text-[14.5px] font-medium text-[#161A16] outline-none placeholder:font-normal placeholder:text-[#5E6D5B]"
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#566454] transition-colors hover:bg-black/5 hover:text-[#161A16]"
          >
            {visible ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        )}
      </span>
    </label>
  );
}

function AuthPrimaryBtn({
  children,
  disabled,
  type = 'button',
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  type?: 'button' | 'submit';
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="flex h-[52px] w-full items-center justify-center rounded-full bg-[#6C9A65] px-6 text-[15px] font-semibold text-white transition-all duration-150 hover:bg-[#5B8754] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55"
    >
      {children}
    </button>
  );
}

function AuthOtpBoxes({
  value,
  onChange,
  length = 6,
}: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const setDigit = (i: number, raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length > 1) {
      const merged = digits.slice(0, length);
      onChange(merged);
      refs.current[Math.min(merged.length, length - 1)]?.focus();
      return;
    }
    const arr = Array.from({ length }, (_, idx) => value[idx] ?? '');
    arr[i] = digits;
    onChange(arr.join(''));
    if (digits && i < length - 1) refs.current[i + 1]?.focus();
  };

  return (
    <div className="grid grid-cols-6 gap-2 sm:gap-2.5" role="group" aria-label="One-time password">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={length}
          value={value[i] ?? ''}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => setDigit(i, e.target.value)}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
            if (!pasted) return;
            e.preventDefault();
            onChange(pasted);
            refs.current[Math.min(pasted.length, length - 1)]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !value[i] && i > 0) refs.current[i - 1]?.focus();
          }}
          className={`h-[56px] w-full rounded-[16px] border text-center text-[22px] font-semibold tabular-nums text-[#161A16] outline-none transition-colors focus:border-[#5D8C56] focus:bg-[#EEF6ED] focus:ring-2 focus:ring-[#6B9A64]/25 ${
            value[i]
              ? 'border-[#739F6C] bg-[#E5EFE3]'
              : 'border-[#A2BC9E] bg-[#E5EFE3]/85'
          }`}
        />
      ))}
    </div>
  );
}

function AppleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z" />
    </svg>
  );
}

function GoogleGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21.35 11.1h-9.18v2.92h5.27c-.23 1.49-1.74 4.38-5.27 4.38-3.17 0-5.76-2.63-5.76-5.87s2.59-5.87 5.76-5.87c1.81 0 3.02.77 3.71 1.43l2.53-2.44C16.79 4.14 14.69 3.2 12.17 3.2 7.1 3.2 3 7.3 3 12.53s4.1 9.33 9.17 9.33c5.3 0 8.81-3.72 8.81-8.97 0-.6-.07-1.06-.15-1.79z" />
    </svg>
  );
}

const Err = ({ msg }: { msg: string }) =>
  msg ? (
    <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-2.5 text-xs font-medium text-danger">
      {msg}
    </p>
  ) : null;

export function formatAuthError(
  e: unknown,
  context: 'login' | 'register' | 'otp' | 'recovery' | 'password' | 'verify',
): string {
  if (e instanceof ApiError && e.message) return e.message;
  const err = (e ?? {}) as { code?: number | string; status?: number; type?: string; message?: string };
  const status = Number(err.status || err.code || 0);
  const code = String(err.code || '').toLowerCase();
  const type = String(err.type || '').toLowerCase();
  const msg = String(err.message || '').toLowerCase();

  if (status === 429 || type.includes('rate_limit') || code.includes('rate_limit') || msg.includes('rate limit')) {
    return 'Too many attempts. Please wait a minute and try again.';
  }
  if (context === 'login') {
    if (
      status === 401 ||
      status === 400 ||
      type.includes('invalid_credentials') ||
      type.includes('user_not_found') ||
      code.includes('invalid_credentials') ||
      msg.includes('invalid login credentials')
    ) {
      return 'Invalid email or password.';
    }
    if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
      return 'Please verify your email address before signing in.';
    }
  }
  if (context === 'register') {
    if (
      status === 409 ||
      status === 422 ||
      type.includes('already_exists') ||
      code.includes('already_exists') ||
      msg.includes('already registered') ||
      msg.includes('already exists')
    ) {
      return 'Unable to create an account with those details. Try logging in or resetting your password.';
    }
    if (status === 400 || type.includes('password') || code.includes('weak_password') || msg.includes('password')) {
      return 'Check your details and use a stronger password (at least 8 characters).';
    }
  }
  if (context === 'otp') {
    if (status === 401 || status === 400 || status === 403 || type.includes('invalid_token') || code.includes('otp')) {
      return 'Invalid or expired OTP. Request a new code and try again.';
    }
  }
  if (context === 'password') {
    if (status === 401 || code.includes('invalid_credentials')) return 'Current password is incorrect.';
    if (status === 400 || status === 422 || code.includes('weak_password') || code.includes('same_password')) {
      return 'New password does not meet security requirements.';
    }
  }
  if (context === 'recovery') {
    if (status === 401 || status === 400 || status === 403 || code.includes('otp') || code.includes('invalid_token')) {
      return 'This reset link is invalid or expired. Request a new one.';
    }
  }
  if (context === 'verify') {
    if (status === 401 || status === 400 || status === 403 || code.includes('otp') || code.includes('invalid_token')) {
      return 'This verification link is invalid or expired. Request a new one from your profile.';
    }
  }
  return 'Could not complete this request right now. Please try again.';
}

/* ---------- Screen 1: Sign In / Login ---------- */

export function Login() {
  const { login, loginWithOAuth } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await login(email.trim(), pw);
      nav(safeInternalPath(loc.state?.from) ?? '/', { replace: true });
    } catch (x) {
      setErr(formatAuthError(x, 'login'));
    } finally {
      setBusy(false);
    }
  };

  const handleOAuth = async (provider: 'apple' | 'google') => {
    setErr('');
    setBusy(true);
    try {
      await loginWithOAuth(provider);
    } catch (x) {
      setErr(formatAuthError(x, 'login'));
      setBusy(false);
    }
  };

  return (
    <AuthShell
      seoTitle={t('auth.login')}
      headingLight="Welcome"
      headingBold="back"
      inlineHeading
      sub={t('auth.loginSub')}
    >
      <form onSubmit={submit} className="space-y-3.5">
        <AuthPillInput
          label={t('auth.email')}
          type="email"
          required
          autoComplete="email"
          icon={<Mail size={18} />}
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <AuthPillInput
          label={t('auth.password')}
          type="password"
          required
          autoComplete="current-password"
          icon={<Lock size={18} />}
          placeholder="Password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        <div className="flex justify-end pt-0.5">
          <Link
            to="/forgot-password"
            className="text-[12.5px] font-medium text-[#2A3229] transition-colors hover:text-[#5B8754]"
          >
            {t('auth.forgotPassword')}
          </Link>
        </div>
        <Err msg={err} />
        <AuthPrimaryBtn type="submit" disabled={busy}>
          {busy ? t('auth.loggingIn') : 'Sign in'}
        </AuthPrimaryBtn>
      </form>

      <div className="grid grid-cols-2 gap-3 pt-1">
        <button
          type="button"
          disabled={busy}
          onClick={() => handleOAuth('apple')}
          className="flex h-[46px] items-center justify-center gap-2 rounded-full bg-[#E3E5E3] px-4 text-[13.5px] font-semibold text-[#161A16] transition-colors hover:bg-[#D5D9D5] disabled:opacity-50"
        >
          <AppleGlyph />
          <span>Apple</span>
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => handleOAuth('google')}
          className="flex h-[46px] items-center justify-center gap-2 rounded-full bg-[#E3E5E3] px-4 text-[13.5px] font-semibold text-[#161A16] transition-colors hover:bg-[#D5D9D5] disabled:opacity-50"
        >
          <GoogleGlyph />
          <span>Google</span>
        </button>
      </div>

      <div className="space-y-3 pt-2 text-center">
        <Link
          to="/login/mobile"
          className="inline-flex items-center justify-center gap-1.5 text-[13px] font-semibold text-[#4F7A48] transition-colors hover:text-[#3A5F34]"
        >
          <Phone size={14} aria-hidden />
          <span>{t('auth.continueMobile')}</span>
        </Link>
        <p className="text-[13px] text-[#4C574B]">
          {t('auth.newToForword')}{' '}
          <Link to="/register" className="font-bold text-[#141714] hover:text-[#5B8754]">
            {t('auth.createAccount')}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

/* ---------- Screen 2: Create Account / Sign Up ---------- */

export function Register() {
  const { register } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [pendingVerify, setPendingVerify] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    if (f.name.trim().length < 2) {
      setErr('Enter your full name.');
      return;
    }
    if (f.password.length < 8) {
      setErr('Use at least 8 characters for your password.');
      return;
    }
    setBusy(true);
    try {
      const result = await register(f.name.trim(), f.email.trim(), f.password);
      if (result.needsEmailVerification) {
        setPendingVerify(true);
      } else {
        nav('/account-created', { replace: true });
      }
    } catch (x) {
      setErr(formatAuthError(x, 'register'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      seoTitle={t('auth.createAccount')}
      headingLight={pendingVerify ? 'Check your' : 'Create your'}
      headingBold={pendingVerify ? 'inbox' : 'account'}
      sub={pendingVerify ? `We sent a confirmation link to ${f.email.trim()}.` : t('auth.joinSub')}
    >
      {pendingVerify ? (
        <div className="space-y-4">
          <p role="status" className="rounded-2xl border border-[#9BB797] bg-[#E5EFE3] p-4 text-sm font-medium text-[#243B21]">
            Open the verification link in your email to activate your FORWORD account, then sign in.
          </p>
          <Link
            to="/login"
            className="flex h-[52px] w-full items-center justify-center rounded-full bg-[#6C9A65] text-[15px] font-semibold text-white transition-colors hover:bg-[#5B8754]"
          >
            Go to Sign in
          </Link>
        </div>
      ) : (
        <>
          <form onSubmit={submit} className="space-y-3.5">
            <AuthPillInput
              label={t('auth.fullName')}
              required
              maxLength={120}
              autoComplete="name"
              icon={<User size={18} />}
              placeholder="Full name"
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
            />
            <AuthPillInput
              label={t('auth.email')}
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              icon={<Mail size={18} />}
              placeholder="Email address"
              value={f.email}
              onChange={(e) => setF({ ...f, email: e.target.value })}
            />
            <AuthPillInput
              label={t('auth.password')}
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              icon={<Lock size={18} />}
              placeholder="Create password"
              value={f.password}
              onChange={(e) => setF({ ...f, password: e.target.value })}
            />
            <Err msg={err} />
            <div className="pt-1">
              <AuthPrimaryBtn type="submit" disabled={busy}>
                {busy ? t('auth.creating') : 'Create account'}
              </AuthPrimaryBtn>
            </div>
          </form>

          <div className="space-y-3 pt-1 text-center">
            <p className="text-[11.5px] leading-relaxed text-[#556153]">
              By continuing you agree to our{' '}
              <Link to="/terms" className="font-semibold text-[#141714] underline-offset-2 hover:underline">
                Terms
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="font-semibold text-[#141714] underline-offset-2 hover:underline">
                Privacy Policy
              </Link>
            </p>
            <p className="text-[13px] text-[#4C574B]">
              {t('auth.alreadyHaveAccount')}{' '}
              <Link to="/login" className="font-bold text-[#141714] hover:text-[#5B8754]">
                Sign in
              </Link>
            </p>
          </div>
        </>
      )}
    </AuthShell>
  );
}

/* ---------- Mobile OTP Entry ---------- */

export function MobileLogin() {
  const { sendOtp } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [phone, setPhone] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    const digits = phone.replace(/\D/g, '').slice(-10);
    if (digits.length !== 10) {
      setErr('Enter a valid 10-digit mobile number.');
      return;
    }
    setBusy(true);
    try {
      await sendOtp('+91' + digits);
      nav('/verify-otp');
    } catch (x) {
      setErr(formatAuthError(x, 'otp'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      seoTitle={t('auth.loginWithMobile')}
      headingLight="Sign in with"
      headingBold="mobile"
      sub={t('auth.otpSub')}
    >
      <form onSubmit={submit} className="space-y-3.5">
        <AuthPillInput
          label={t('auth.mobileNumber')}
          inputMode="tel"
          autoComplete="tel"
          icon={<span className="text-sm font-bold text-[#161A16]">+91</span>}
          placeholder="10-digit mobile number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <Err msg={err} />
        <div className="pt-1">
          <AuthPrimaryBtn type="submit" disabled={busy}>
            {busy ? t('common.sending') : t('auth.sendOtp')}
          </AuthPrimaryBtn>
        </div>
      </form>
      <p className="pt-1 text-center text-[13px] text-[#4C574B]">
        <Link to="/login" className="font-semibold text-[#4F7A48] hover:text-[#3A5F34]">
          {t('auth.useEmailInstead')}
        </Link>
      </p>
    </AuthShell>
  );
}

/* ---------- Screen 3: 6-Digit Verification Code ---------- */

export function VerifyOtp() {
  const { verifyOtp, sendOtp } = useAuth();
  const nav = useNavigate();
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(42);
  const phone = safeStorageGet('session', 'forword:otp-phone') || '';

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  const submit = async () => {
    if (busy || code.length < 6) return;
    setErr('');
    setBusy(true);
    try {
      await verifyOtp(code);
      nav('/', { replace: true });
    } catch (x) {
      setErr(formatAuthError(x, 'otp'));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!phone || cooldown > 0) return;
    setErr('');
    setCooldown(42);
    try {
      await sendOtp(phone);
    } catch (x) {
      setErr(formatAuthError(x, 'otp'));
    }
  };

  const formattedTime = `00:${String(cooldown).padStart(2, '0')}`;

  return (
    <AuthShell
      seoTitle="Verify Code"
      headingLight="Check your"
      headingBold="messages"
      sub={phone ? `We sent a 6-digit code to ${phone}` : 'Enter the 6-digit verification code we sent.'}
    >
      <div className="space-y-5 pt-1">
        <AuthOtpBoxes value={code} onChange={setCode} />
        <Err msg={err} />

        <div className="text-center text-[13px] text-[#4C574B]">
          <span>Didn&apos;t get it? </span>
          {cooldown > 0 ? (
            <span className="font-bold tabular-nums text-[#141714]">Resend in {formattedTime}</span>
          ) : phone ? (
            <button
              type="button"
              onClick={resend}
              className="font-bold text-[#4F7A48] hover:text-[#3A5F34]"
            >
              Resend code
            </button>
          ) : (
            <Link to="/login/mobile" className="font-bold text-[#4F7A48] hover:text-[#3A5F34]">
              Request new code
            </Link>
          )}
        </div>

        <AuthPrimaryBtn onClick={submit} disabled={busy || code.length < 6}>
          {busy ? 'Verifying…' : 'Verify'}
        </AuthPrimaryBtn>
      </div>
    </AuthShell>
  );
}

/* ---------- Forgot Password & Recovery ---------- */

export function ForgotPassword() {
  const { forgot } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await forgot(email.trim());
      setSent(true);
    } catch (x) {
      const code = Number((x as { status?: number; code?: number })?.status || (x as { code?: number })?.code || 0);
      if (code === 404) {
        setSent(true);
      } else {
        setErr(formatAuthError(x, 'recovery'));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      seoTitle="Reset Password"
      headingLight="Reset your"
      headingBold="password"
      sub="Enter your email address and we will send a secure reset link."
    >
      {sent ? (
        <div className="space-y-4">
          <p className="rounded-2xl border border-[#9BB797] bg-[#E5EFE3] p-4 text-sm font-medium text-[#243B21]">
            If an account exists for this email, a password reset link has been sent to your inbox.
          </p>
          <Link
            to="/login"
            className="flex h-[52px] w-full items-center justify-center rounded-full bg-[#6C9A65] text-[15px] font-semibold text-white transition-colors hover:bg-[#5B8754]"
          >
            Back to Sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3.5">
          <AuthPillInput
            label="Email address"
            type="email"
            required
            autoComplete="email"
            icon={<Mail size={18} />}
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Err msg={err} />
          <div className="pt-1">
            <AuthPrimaryBtn type="submit" disabled={busy}>
              {busy ? 'Sending…' : 'Send reset link'}
            </AuthPrimaryBtn>
          </div>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPassword() {
  const { reset, recoveryReady } = useAuth();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const [params] = useState(() => ({
    code: sp.get('code') || undefined,
    tokenHash: sp.get('token_hash') || undefined,
  }));
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.replaceState(null, '', '/reset-password');
    }
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!params.code && !params.tokenHash && !recoveryReady) {
      setErr('This reset link is invalid or expired. Request a new one.');
      return;
    }
    if (pw.length < 8) {
      setErr('Use at least 8 characters.');
      return;
    }
    if (pw !== pw2) {
      setErr('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await reset(pw, params);
      nav('/login', { replace: true });
    } catch (x) {
      setErr(formatAuthError(x, 'recovery'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      seoTitle="Create New Password"
      headingLight="Create new"
      headingBold="password"
      sub="Choose a strong password with at least 8 characters."
    >
      <form onSubmit={submit} className="space-y-3.5">
        <AuthPillInput
          label="New password"
          type="password"
          required
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
          icon={<Lock size={18} />}
          placeholder="New password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        <AuthPillInput
          label="Confirm password"
          type="password"
          required
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
          icon={<Lock size={18} />}
          placeholder="Confirm password"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
        />
        <Err msg={err} />
        <div className="pt-1">
          <AuthPrimaryBtn type="submit" disabled={busy}>
            {busy ? 'Updating…' : 'Update password'}
          </AuthPrimaryBtn>
        </div>
      </form>
    </AuthShell>
  );
}

/* ---------- Authenticated Password Change & Email Verification ---------- */

export function ChangePassword() {
  return (
    <AuthGate title="Change password" emptyTitle="Login to change password" emptyText="Sign in to update your account password.">
      {() => <ChangePasswordForm />}
    </AuthGate>
  );
}

function ChangePasswordForm() {
  const { changePassword } = useAuth();
  const [o, setO] = useState('');
  const [n, setN] = useState('');
  const [c, setC] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    setOk(false);
    if (n.length < 8) return setErr('Use at least 8 characters.');
    if (n !== c) return setErr('Passwords do not match.');
    setBusy(true);
    try {
      await changePassword(o, n);
      setOk(true);
      setO('');
      setN('');
      setC('');
    } catch (x) {
      setErr(formatAuthError(x, 'password'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page title="Change password" back seo={{ noIndex: true }}>
      <form onSubmit={submit} className="mx-auto max-w-md space-y-4">
        <Field label="Current password" type="password" required autoComplete="current-password" icon={<Lock size={18} />} value={o} onChange={(e) => setO(e.target.value)} />
        <Field label="New password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" icon={<Lock size={18} />} value={n} onChange={(e) => setN(e.target.value)} />
        <Field label="Confirm password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" icon={<Lock size={18} />} value={c} onChange={(e) => setC(e.target.value)} />
        <Err msg={err} />
        {ok && <p role="status" className="rounded-[10px] bg-mint px-3 py-2.5 text-xs font-medium text-pri-dark">Password updated.</p>}
        <Btn type="submit" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</Btn>
      </form>
    </Page>
  );
}

export function VerifyEmail() {
  const { confirmVerification } = useAuth();
  const [sp] = useSearchParams();
  const [params] = useState(() => ({
    code: sp.get('code') || undefined,
    tokenHash: sp.get('token_hash') || undefined,
    type: sp.get('type') || undefined,
  }));
  const [status, setStatus] = useState<'verifying' | 'done' | 'error'>('verifying');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.replaceState(null, '', '/verify-email');
    }
  }, []);

  useEffect(() => {
    let live = true;
    confirmVerification(params)
      .then(() => {
        if (live) setStatus('done');
      })
      .catch((x) => {
        if (!live) return;
        setErr(formatAuthError(x, 'verify'));
        setStatus('error');
      });
    return () => {
      live = false;
    };
  }, [params, confirmVerification]);

  return (
    <AuthShell
      seoTitle="Verify Email"
      headingLight="Check your"
      headingBold="inbox"
      sub="Confirming your FORWORD email address."
    >
      {status === 'verifying' && <p className="text-sm text-[#556153]">Verifying your email…</p>}
      {status === 'done' && (
        <div className="space-y-4">
          <p role="status" className="rounded-2xl border border-[#9BB797] bg-[#E5EFE3] p-4 text-sm font-medium text-[#243B21]">
            Your email address is verified.
          </p>
          <Link
            to="/profile"
            className="flex h-[52px] w-full items-center justify-center rounded-full bg-[#6C9A65] text-[15px] font-semibold text-white transition-colors hover:bg-[#5B8754]"
          >
            Go to Profile
          </Link>
        </div>
      )}
      {status === 'error' && (
        <div className="space-y-4">
          <Err msg={err} />
          <Link
            to="/profile"
            className="flex h-[48px] w-full items-center justify-center rounded-full bg-[#E3E5E3] text-sm font-semibold text-[#161A16] transition-colors hover:bg-[#D5D9D5]"
          >
            Back to Profile
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
