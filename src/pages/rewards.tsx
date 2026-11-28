import { ReactNode, useEffect, useState } from 'react';
import { Coins, Flame } from 'lucide-react';
import { formatApiError, getNews, getRewardEvents, getWallet, getWithdrawals, rewardsAction } from '../lib/api';
import { inr, shortDate } from '../lib/format';
import { useToast } from '../hooks/app';
import { useAsync } from '../hooks/useAsync';
import { useI18n } from '../hooks/i18n';
import { AuthGate, Page } from '../components/layout';
import { Async, Btn, EmptyState, ErrorState, Field, ListRow, Segmented, SectionHeader, Skeleton } from '../components/ui';
import { NewsCard } from '../components/cards';

const CHECK_IN_REWARDS = [2, 4, 6, 12, 24, 48, 96];
function indiaDate(value: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value);
}
function checkInReward(day: number): number {
  return day <= CHECK_IN_REWARDS.length ? CHECK_IN_REWARDS[Math.max(0, day - 1)] : 96 * (2 ** (day - CHECK_IN_REWARDS.length));
}

function Gate({ title, children, back = true }: { title: string; children: (uid: string) => ReactNode; back?: boolean }) {
  const { t } = useI18n();
  return (
    <AuthGate title={title} back={back} icon="gift" emptyTitle={t('rewards.loginTitle')} emptyText={t('rewards.loginText')}>
      {(uid) => <Page title={title} back={back} seo={{ noIndex: true }}>{children(uid)}</Page>}
    </AuthGate>
  );
}

function WalletCard({ uid }: { uid: string }) {
  const { t } = useI18n();
  const w = useAsync(() => getWallet(), [uid]);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (w.loading) return <Skeleton rows={1} />;
  if (w.error) return <ErrorState text={w.error} onRetry={w.reload} />;
  const d = w.data!;
  const today = indiaDate(new Date());
  const yesterday = indiaDate(new Date(Date.now() - 86_400_000));
  const checkedInToday = Boolean(d.lastCheckIn && indiaDate(new Date(d.lastCheckIn)) === today);
  const nextStreak = d.lastCheckIn && indiaDate(new Date(d.lastCheckIn)) === yesterday ? d.streak + 1 : 1;
  const displayStreak = checkedInToday ? d.streak : nextStreak;
  const displayCheckInCoins = checkInReward(displayStreak);
  const nextCheckInCoins = checkInReward(nextStreak);
  const checkIn = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await rewardsAction('check-in') as { duplicate?: boolean };
      toast.show(res.duplicate ? 'Already checked in today.' : 'Check-in done');
      w.reload();
    } catch (e) {
      toast.show(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="space-y-3 rounded-[18px] bg-pri p-[18px] text-white">
        <p className="text-xs font-medium text-white/85">{t('rewards.walletBalance')}</p>
        <p className="text-[32px] font-bold">{inr(d.balance ?? 0)}</p><p className="text-[11px] text-white/80">100 coins = ₹1</p>
        <div className="flex gap-2.5"><Btn to="/wallet/withdraw" variant="accent">{t('rewards.withdraw')}</Btn><Btn to="/wallet/transactions" variant="outline" className="!border-white !text-white hover:!bg-white/10">{t('rewards.history')}</Btn></div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-1.5 rounded-card border border-line p-3.5"><Coins className="text-pri-dark" /><p className="text-lg font-bold">{d.coins ?? 0}</p><p className="text-xs text-slate">{t('rewards.coins')}</p></div>
        <div className="space-y-1.5 rounded-card border border-line p-3.5"><Flame className="text-pri-dark" /><p className="text-lg font-bold">{t('rewards.days', { count: d.streak ?? 0 })}</p><p className="text-xs text-slate">{t('rewards.streak')}</p></div>
      </div>
      <div className="space-y-2 rounded-card border border-line p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold text-ink">Daily login reward</p><p className="text-xs text-slate">Day {displayStreak} · 100 coins = ₹1</p></div><p className="text-lg font-bold text-pri-dark">+{displayCheckInCoins} coins</p></div><Btn variant="outline" disabled={busy || checkedInToday} onClick={checkIn}>{busy ? t('common.loading') : checkedInToday ? 'Claimed today' : `Claim +${nextCheckInCoins} coins`}</Btn></div>
    </>
  );
}

export function RewardsDashboard() {
  const { t } = useI18n();
  return (
    <Gate title={t('rewards.title')}>{(uid) => <>
      <WalletCard uid={uid} />
      <SectionHeader title={t('rewards.dailyTasks')} to="/rewards/tasks" />
      <div><ListRow icon="check" title={t('rewards.dailyCheckIn')} to="/rewards/check-in" /><ListRow icon="news" title={t('rewards.readEarn')} to="/rewards/read-earn" /><ListRow icon="users" title={t('rewards.inviteFriends')} to="/referral" /></div>
    </>}</Gate>
  );
}
export function WalletPage() {
  const { t } = useI18n();
  return (
    <Gate title={t('rewards.wallet')}>{(uid) => <><WalletCard uid={uid} /><div><ListRow icon="wallet" title={t('rewards.transactions')} to="/wallet/transactions" /><ListRow icon="clock" title={t('rewards.withdrawalHistory')} to="/wallet/withdrawals" /></div></>}</Gate>
  );
}

export const ReadEarn = () => (
  <Gate title="Read & Earn">{() => <ReadEarnBody />}</Gate>
);
function ReadEarnBody() {
  const state = useAsync(() => getNews({ limit: 5 }), []);
  const toast = useToast();
  const [sessions, setSessions] = useState<Record<string, { token: string; seconds: number }>>({});
  const [remaining, setRemaining] = useState<Record<string, number>>({});
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({});
  const hasActiveTimers = Object.values(remaining).some((s) => s > 0);
  useEffect(() => {
    if (!hasActiveTimers) return;
    const timer = window.setInterval(() => setRemaining((current) => {
      const next = { ...current };
      Object.keys(next).forEach((id) => { if (next[id] > 0) next[id] -= 1; });
      return next;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [hasActiveTimers]);
  const start = async (id: string) => {
    if (busyIds[id]) return;
    setBusyIds((b) => ({ ...b, [id]: true }));
    try {
      const session = await rewardsAction('start-read', { newsId: id }) as { token: string; seconds: number };
      setSessions((s) => ({ ...s, [id]: session }));
      setRemaining((s) => ({ ...s, [id]: session.seconds }));
    } catch (e) { toast.show(formatApiError(e)); }
    finally { setBusyIds((b) => ({ ...b, [id]: false })); }
  };
  const claim = async (id: string) => {
    const session = sessions[id];
    if (busyIds[id] || !session || (remaining[id] ?? session.seconds) > 0) return;
    setBusyIds((b) => ({ ...b, [id]: true }));
    try {
      const result = await rewardsAction('read', { token: session.token }) as { duplicate?: boolean };
      toast.show(result.duplicate ? 'This article was already rewarded.' : '+1 coin added');
      setSessions((s) => { const n = { ...s }; delete n[id]; return n; });
      setRemaining((s) => { const n = { ...s }; delete n[id]; return n; });
    } catch (e) { toast.show(formatApiError(e)); }
    finally { setBusyIds((b) => ({ ...b, [id]: false })); }
  };
  return (
    <Async state={state} empty={<EmptyState title="No stories to read right now" />}>
      {(items) => <><p className="rounded-card bg-mint p-4 text-sm font-semibold text-pri-dark">Read an approved article for 20 seconds to earn 1 coin. Each article can earn once; daily limit: 20 rewarded reads.</p>{items.map((n) => <div key={n.$id} className="space-y-1.5"><NewsCard n={n} />{!sessions[n.$id] ? <button type="button" disabled={busyIds[n.$id]} onClick={() => start(n.$id)} className="text-xs font-semibold text-pri-dark disabled:opacity-50">{busyIds[n.$id] ? 'Starting…' : 'Start 20-second read'}</button> : <button type="button" disabled={busyIds[n.$id] || (remaining[n.$id] ?? 0) > 0} onClick={() => claim(n.$id)} className="text-xs font-semibold text-pri-dark disabled:opacity-50">{busyIds[n.$id] ? 'Claiming…' : (remaining[n.$id] ?? 0) > 0 ? 'Read timer: ' + remaining[n.$id] + 's' : 'Claim coins'}</button>}</div>)}</>}
    </Async>
  );
}

export const DailyTasks = () => <Gate title="Daily Reading Tasks">{() => <div><ListRow icon="news" title="Read 3 articles" to="/rewards/read-earn" /><ListRow icon="file" title="Read a guide" to="/category" /><ListRow icon="gift" title="Share one story" to="/" /></div>}</Gate>;
export const DailyCheckIn = () => (
  <Gate title="Daily Check-in">{(uid) => <CheckIn uid={uid} />}</Gate>
);
function CheckIn({ uid }: { uid: string }) {
  const w = useAsync(() => getWallet(), [uid]);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (w.loading) return <Skeleton rows={1} />;
  if (w.error) return <ErrorState text={w.error} onRetry={w.reload} />;
  const streak = w.data?.streak ?? 0;
  const run = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await rewardsAction('check-in') as { duplicate?: boolean };
      toast.show(res.duplicate ? 'Already checked in today.' : 'Check-in done');
      w.reload();
    } catch (e) {
      toast.show(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };
  return <>
    <h2 className="text-2xl font-bold">{streak}-day streak</h2><p className="text-sm text-slate">Check in every day to keep your streak.</p>
    <div className="flex gap-1.5">{Array.from({ length: 7 }).map((_, i) => {
      const filled = streak > 0 && i < ((streak - 1) % 7) + 1;
      return <span key={i} className={`flex-1 rounded-xl py-2.5 text-center text-xs font-bold ${filled ? 'bg-pri text-white' : 'bg-surface text-slate'}`}>D{i + 1}</span>;
    })}</div>
    <Btn disabled={busy} onClick={run}>{busy ? 'Checking in…' : 'Check in today'}</Btn>
  </>;
}

const Events = ({ uid, empty }: { uid: string; empty: string }) => {
  const s = useAsync(() => getRewardEvents(), [uid]);
  return <Async state={s} empty={<EmptyState icon="clock" title={empty} />}>{(i) => <div>{i.map((e) => <ListRow key={e.$id} icon="coin" title={e.label} sub={shortDate(e.$createdAt)} right={<span className="text-sm font-bold text-pri-dark">+{e.coins}</span>} />)}</div>}</Async>;
};
export const RewardHistory = () => <Gate title="Reward History">{(u) => <Events uid={u} empty="No rewards yet" />}</Gate>;
export const EarningsHistory = () => <Gate title="Earnings History">{(u) => <Events uid={u} empty="No earnings yet" />}</Gate>;
export const CoinsPage = () => <Gate title="Coins">{(u) => <><WalletCard uid={u} /><SectionHeader title="How to earn" /><div><ListRow icon="check" title="Daily check-in" right="none" /><ListRow icon="news" title="Read & Earn" right="none" /><ListRow icon="users" title="Referrals" right="none" /></div></>}</Gate>;

const Withdrawals = ({ uid }: { uid: string }) => {
  const s = useAsync(() => getWithdrawals(), [uid]);
  return <Async state={s} empty={<EmptyState icon="wallet" title="No withdrawals yet" />}>{(i) => <div>{i.map((w) => <ListRow key={w.$id} icon="wallet" title={`Withdrawal to UPI`} sub={`${shortDate(w.$createdAt)} · ${w.status}`} right={<span className="text-sm font-bold">{inr(w.amount)}</span>} />)}</div>}</Async>;
};
export const WithdrawalHistory = () => <Gate title="Withdrawal History">{(u) => <Withdrawals uid={u} />}</Gate>;
export const Transactions = () => <Gate title="Transactions">{(u) => <><Withdrawals uid={u} /><Events uid={u} empty="No reward credits yet" /></>}</Gate>;

export const Withdraw = () => (
  <Gate title="Withdraw">{() => <WithdrawForm />}</Gate>
);
function WithdrawForm() {
  const [amount, setAmount] = useState('');
  const [upi, setUpi] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const ok = !busy && Number(amount) > 0 && /^[\w.\-]{2,64}@[a-zA-Z0-9]{2,32}$/.test(upi.trim());
  const submit = async () => {
    if (!ok) return;
    setMsg('');
    setBusy(true);
    const requestId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    try {
      await rewardsAction('withdraw', { amount: Number(amount), upiId: upi.trim(), requestId });
      toast.show('Withdrawal requested');
      setAmount('');
      setUpi('');
    } catch (e) {
      setMsg(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };
  return <div className="mx-auto max-w-md space-y-4"><h2 className="text-2xl font-bold">Withdraw to UPI</h2><p className="text-sm text-slate">The server checks your balance and the minimum withdrawal before paying out.</p>
    <Field label="Amount (₹)" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 100" />
    <Field label="UPI ID" value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="name@bank" />
    {msg && <p role="alert" className="text-xs font-medium text-danger">{msg}</p>}<Btn disabled={!ok} onClick={submit}>{busy ? 'Submitting…' : 'Withdraw'}</Btn></div>;
}

export function Referral() {
  const { t } = useI18n();
  return <Gate title={t('rewards.inviteFriends')}>{(uid) => <ReferralBody uid={uid} />}</Gate>;
}
function ReferralBody({ uid }: { uid: string }) {
  const { t } = useI18n();
  const w = useAsync(() => getWallet(), [uid]);
  const toast = useToast();
  const [inviteCode, setInviteCode] = useState(() => new URLSearchParams(window.location.search).get('code')?.trim().toUpperCase() || '');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const code = w.data?.referralCode;
  const inviteUrl = code ? `${window.location.origin}/referral?code=${encodeURIComponent(code)}` : '';
  const cleanInvite = inviteCode.trim().toUpperCase();
  const canApply = !busy && /^FW[A-Z0-9]{6,12}$/.test(cleanInvite);

  const applyCode = async () => {
    if (!canApply) return;
    setMsg('');
    setBusy(true);
    try {
      const res = await rewardsAction('apply-referral', { code: cleanInvite }) as { coins?: number };
      toast.show(res.coins ? `Referral applied (+${res.coins} coins)` : 'Referral applied');
      setInviteCode('');
      w.reload();
    } catch (e) {
      setMsg(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <EmptyState icon="gift" title={t('rewards.inviteFriends')} text="Invite a new user: both you and your friend receive 1,000 coins (₹10 each) after the referral code is successfully applied." />
      {w.loading ? <Skeleton rows={1} /> : w.error ? <ErrorState text={w.error} onRetry={w.reload} /> : code ? (
        <button onClick={async () => { try { await navigator.clipboard.writeText(code); toast.show('Code copied'); } catch { toast.show('Could not copy code automatically.'); } }} className="w-full rounded-xl border border-dashed border-pri bg-mint py-3 text-base font-bold text-pri-dark">{code}</button>
      ) : (
        <p className="text-center text-sm text-slate">Your referral code is not ready yet.</p>
      )}
      {code && <Btn variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(inviteUrl); toast.show('Invite link copied'); } catch { toast.show('Could not copy invite link automatically.'); } }}>Copy invite link</Btn>}
      <div className="space-y-2.5 rounded-card border border-line p-4">
        <p className="text-sm font-bold text-ink">{t('rewards.haveReferral')}</p>
        <p className="text-xs text-slate">Enter a friend&apos;s code once. You receive 1,000 coins (₹10); your friend also receives 1,000 coins (₹10).</p>
        <Field label="Referral code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} placeholder="e.g. FW1234ABCD" maxLength={14} />
        {msg && <p role="alert" className="text-xs font-medium text-danger">{msg}</p>}
        <Btn variant="outline" disabled={!canApply} onClick={applyCode}>{busy ? t('common.loading') : t('rewards.applyReferral')}</Btn>
      </div>
      <Btn to="/referral/rewards" variant="outline">{t('rewards.referralRewards')}</Btn>
    </>
  );
}
export function ReferralRewards() {
  const [t, setT] = useState(0);
  return <Gate title="Referral Rewards">{(uid) => <><Segmented items={['Joined', 'Pending']} value={t} onChange={setT} /><ReferralList uid={uid} pending={t === 1} /></>}</Gate>;
}
function ReferralList({ uid, pending }: { uid: string; pending: boolean }) {
  const s = useAsync(() => getRewardEvents(), [uid]);
  return <Async state={{ ...s, data: s.data?.filter((e) => e.kind === 'referral' && (pending ? e.coins === 0 : e.coins > 0)) }} empty={<EmptyState icon="users" title="No referrals yet" />}>{(i) => <div>{i.map((e) => <ListRow key={e.$id} icon="users" title={e.label} sub={shortDate(e.$createdAt)} right={<span className="text-sm font-bold text-pri-dark">+{e.coins}</span>} />)}</div>}</Async>;
}
