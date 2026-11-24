import { ReactNode, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Coins, Flame } from 'lucide-react';
import { getNews, getRewardEvents, getReferrals, getWallet, getWithdrawals, rewardsAction } from '../lib/api';
import { inr, shortDate } from '../lib/format';
import { useAuth } from '../hooks/auth';
import { useToast } from '../hooks/app';
import { useAsync } from '../hooks/useAsync';
import { Page } from '../components/layout';
import { Async, Btn, EmptyState, ErrorState, Field, ListRow, Segmented, SectionHeader, Skeleton } from '../components/ui';
import { NewsCard } from '../components/cards';

function Gate({ title, children, back = true }: { title: string; children: (uid: string) => ReactNode; back?: boolean }) {
  const { user, loading } = useAuth();
  if (loading) return <Page title={title} back={back}><Skeleton rows={2} /></Page>;
  if (!user) return <Page title={title} back={back}><EmptyState icon="gift" title="Login to earn rewards" text="Read, check in and invite friends to collect coins." action={<Btn to="/login">Login</Btn>} /></Page>;
  return <Page title={title} back={back}>{children(user.$id)}</Page>;
}

function WalletCard({ uid }: { uid: string }) {
  const w = useAsync(() => getWallet(uid), [uid]);
  const toast = useToast();
  if (w.loading) return <Skeleton rows={1} />;
  if (w.error) return <ErrorState text="Your wallet is not set up yet." onRetry={w.reload} />;
  const d = w.data!;
  const checkIn = async () => { try { await rewardsAction('check-in'); toast.show('Check-in done'); w.reload(); } catch (e) { toast.show((e as Error).message); } };
  return (
    <>
      <div className="space-y-3 rounded-[18px] bg-pri p-[18px] text-white">
        <p className="text-xs font-medium text-white/85">Wallet balance</p>
        <p className="text-[32px] font-bold">{inr(d.balance ?? 0)}</p>
        <div className="flex gap-2.5"><Btn to="/wallet/withdraw" variant="accent">Withdraw</Btn><Btn to="/wallet/transactions" variant="outline" className="!border-white !text-white hover:!bg-white/10">History</Btn></div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-1.5 rounded-card border border-line p-3.5"><Coins className="text-pri-dark" /><p className="text-lg font-bold">{d.coins ?? 0}</p><p className="text-xs text-slate">Coins</p></div>
        <div className="space-y-1.5 rounded-card border border-line p-3.5"><Flame className="text-pri-dark" /><p className="text-lg font-bold">{d.streak ?? 0} days</p><p className="text-xs text-slate">Streak</p></div>
      </div>
      <Btn variant="outline" onClick={checkIn}>Check in today</Btn>
    </>
  );
}

export const RewardsDashboard = () => (
  <Gate title="Rewards">{(uid) => <>
    <WalletCard uid={uid} />
    <SectionHeader title="Daily tasks" to="/rewards/tasks" />
    <div><ListRow icon="check" title="Daily check-in" to="/rewards/check-in" /><ListRow icon="news" title="Read & Earn" to="/rewards/read-earn" /><ListRow icon="users" title="Invite friends" to="/referral" /></div>
  </>}</Gate>
);
export const WalletPage = () => (
  <Gate title="Wallet">{(uid) => <><WalletCard uid={uid} /><div><ListRow icon="wallet" title="Transactions" to="/wallet/transactions" /><ListRow icon="clock" title="Withdrawal history" to="/wallet/withdrawals" /></div></>}</Gate>
);

export const ReadEarn = () => (
  <Gate title="Read & Earn">{() => <ReadEarnBody />}</Gate>
);
function ReadEarnBody() {
  const state = useAsync(() => getNews({ limit: 5 }), []);
  const toast = useToast();
  const [sessions, setSessions] = useState<Record<string, { token: string; seconds: number }>>({});
  const [remaining, setRemaining] = useState<Record<string, number>>({});
  useEffect(() => {
    const timer = window.setInterval(() => setRemaining((current) => {
      const next = { ...current };
      Object.keys(next).forEach((id) => { if (next[id] > 0) next[id] -= 1; });
      return next;
    }), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const start = async (id: string) => {
    try {
      const session = await rewardsAction('start-read', { newsId: id }) as { token: string; seconds: number };
      setSessions((s) => ({ ...s, [id]: session }));
      setRemaining((s) => ({ ...s, [id]: session.seconds }));
    } catch (e) { toast.show((e as Error).message); }
  };
  const claim = async (id: string) => {
    try {
      const session = sessions[id];
      if (!session || (remaining[id] ?? session.seconds) > 0) return;
      const result = await rewardsAction('read', { token: session.token }) as { duplicate?: boolean };
      toast.show(result.duplicate ? 'This article was already rewarded.' : 'Coins added');
      setSessions((s) => { const n = { ...s }; delete n[id]; return n; });
      setRemaining((s) => { const n = { ...s }; delete n[id]; return n; });
    } catch (e) { toast.show((e as Error).message); }
  };
  return (
    <Async state={state} empty={<EmptyState title="No stories to read right now" />}>
      {(items) => <><p className="rounded-card bg-mint p-4 text-sm font-semibold text-pri-dark">Read for at least 20 seconds. Each approved article can earn once.</p>{items.map((n) => <div key={n.$id} className="space-y-1.5"><NewsCard n={n} />{!sessions[n.$id] ? <button onClick={() => start(n.$id)} className="text-xs font-semibold text-pri-dark">Start 20-second read</button> : <button disabled={(remaining[n.$id] ?? 0) > 0} onClick={() => claim(n.$id)} className="text-xs font-semibold text-pri-dark disabled:opacity-50">{(remaining[n.$id] ?? 0) > 0 ? 'Read timer: ' + remaining[n.$id] + 's' : 'Claim coins'}</button>}</div>)}</>}
    </Async>
  );
}

export const DailyTasks = () => <Gate title="Daily Reading Tasks">{() => <div><ListRow icon="news" title="Read 3 articles" to="/rewards/read-earn" /><ListRow icon="file" title="Read a guide" to="/category" /><ListRow icon="gift" title="Share one story" to="/" /></div>}</Gate>;
export const DailyCheckIn = () => (
  <Gate title="Daily Check-in">{(uid) => { return <CheckIn uid={uid} />; }}</Gate>
);
function CheckIn({ uid }: { uid: string }) {
  const w = useAsync(() => getWallet(uid), [uid]);
  const toast = useToast();
  const streak = w.data?.streak ?? 0;
  const run = async () => { try { await rewardsAction('check-in'); toast.show('Check-in done'); w.reload(); } catch (e) { toast.show((e as Error).message); } };
  return <>
    <h2 className="text-2xl font-bold">{streak}-day streak</h2><p className="text-sm text-slate">Check in every day to keep your streak.</p>
    <div className="flex gap-1.5">{Array.from({ length: 7 }).map((_, i) => <span key={i} className={`flex-1 rounded-xl py-2.5 text-center text-xs font-bold ${i < streak % 7 ? 'bg-pri text-white' : 'bg-surface text-slate'}`}>D{i + 1}</span>)}</div>
    <Btn onClick={run}>Check in today</Btn>
  </>;
}

const Events = ({ uid, empty }: { uid: string; empty: string }) => {
  const s = useAsync(() => getRewardEvents(uid), [uid]);
  return <Async state={s} empty={<EmptyState icon="clock" title={empty} />}>{(i) => <div>{i.map((e) => <ListRow key={e.$id} icon="coin" title={e.label} sub={shortDate(e.$createdAt)} right={<span className="text-sm font-bold text-pri-dark">+{e.coins}</span>} />)}</div>}</Async>;
};
export const RewardHistory = () => <Gate title="Reward History">{(u) => <Events uid={u} empty="No rewards yet" />}</Gate>;
export const EarningsHistory = () => <Gate title="Earnings History">{(u) => <Events uid={u} empty="No earnings yet" />}</Gate>;
export const CoinsPage = () => <Gate title="Coins">{(u) => <><WalletCard uid={u} /><SectionHeader title="How to earn" /><div><ListRow icon="check" title="Daily check-in" right="none" /><ListRow icon="news" title="Read & Earn" right="none" /><ListRow icon="users" title="Referrals" right="none" /></div></>}</Gate>;
export const WalletBalance = WalletPage;

const Withdrawals = ({ uid }: { uid: string }) => {
  const s = useAsync(() => getWithdrawals(uid), [uid]);
  return <Async state={s} empty={<EmptyState icon="wallet" title="No withdrawals yet" />}>{(i) => <div>{i.map((w) => <ListRow key={w.$id} icon="wallet" title={`Withdrawal to UPI`} sub={`${shortDate(w.$createdAt)} · ${w.status}`} right={<span className="text-sm font-bold">{inr(w.amount)}</span>} />)}</div>}</Async>;
};
export const WithdrawalHistory = () => <Gate title="Withdrawal History">{(u) => <Withdrawals uid={u} />}</Gate>;
export const Transactions = () => <Gate title="Transactions">{(u) => <><Withdrawals uid={u} /><Events uid={u} empty="No reward credits yet" /></>}</Gate>;

export const Withdraw = () => (
  <Gate title="Withdraw">{() => <WithdrawForm />}</Gate>
);
function WithdrawForm() {
  const [amount, setAmount] = useState(''); const [upi, setUpi] = useState(''); const [msg, setMsg] = useState(''); const toast = useToast();
  const ok = Number(amount) >= 500 && /^[\w.\-]{2,}@[\w]{2,}$/.test(upi.trim());
  const submit = async () => { try { await rewardsAction('withdraw', { amount: Number(amount), upiId: upi.trim() }); toast.show('Withdrawal requested'); setAmount(''); setUpi(''); } catch (e) { setMsg((e as Error).message); } };
  return <div className="mx-auto max-w-md space-y-4"><h2 className="text-2xl font-bold">Withdraw to UPI</h2><p className="text-sm text-slate">Minimum withdrawal is ₹500. Your request will be reviewed before payout.</p>
    <Field label="Amount (₹)" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Minimum ₹500" />
    <Field label="UPI ID" value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="name@bank" />
    {msg && <p role="alert" className="text-xs font-medium text-danger">{msg}</p>}<Btn disabled={!ok} onClick={submit}>Withdraw</Btn></div>;
}

export function Referral() {
  const { user } = useAuth();
  const w = useAsync(() => (user ? getWallet(user.$id) : Promise.reject(new Error('Login required'))), [user?.$id]);
  const toast = useToast();
  const code = w.data?.referralCode;
  const inviteLink = code && typeof window !== 'undefined' ? `${window.location.origin}/register?ref=${encodeURIComponent(code)}` : '';
  return <Gate title="Invite friends">{() => <>
    <EmptyState icon="gift" title="Invite friends, earn together" text="You get 1,000 coins and your friend gets 1,000 coins after their first eligible 20-second article read." />
    {code ? <><div className="rounded-xl border border-dashed border-pri bg-mint p-3 text-center"><p className="text-xs text-slate">Your referral code</p><p className="text-xl font-bold text-pri-dark">{code}</p></div><Btn onClick={async () => { await navigator.clipboard.writeText(inviteLink); toast.show('Invite link copied'); }}>Copy invite link</Btn></> : <p className="text-center text-sm text-slate">Your referral code is not ready yet.</p>}
    <Btn to="/referral/rewards" variant="outline">Referral rewards</Btn>
  </>}</Gate>;
}
export function ReferralRewards() {
  const [t, setT] = useState(0);
  return <Gate title="Referral Rewards">{(uid) => <><Segmented items={['Joined', 'Pending']} value={t} onChange={setT} /><ReferralList uid={uid} pending={t === 1} /></>}</Gate>;
}
function ReferralList({ uid, pending }: { uid: string; pending: boolean }) {
  const s = useAsync(() => getReferrals(uid), [uid]);
  const items = s.data?.filter((r) => pending ? r.status === 'pending' : r.status === 'rewarded');
  return <Async state={{ ...s, data: items }} empty={<EmptyState icon="users" title={pending ? 'No pending referrals' : 'No successful referrals yet'} />}>{(i) => <div>{i.map((r) => <ListRow key={r.$id} icon="users" title={`Referral · ${r.referredUserId.slice(0, 8)}`} sub={r.status === 'rewarded' ? `Rewarded ${shortDate(r.rewardedAt || r.$updatedAt)}` : `Joined ${shortDate(r.$createdAt)} · waiting for first eligible read`} right={<span className="text-sm font-bold text-pri-dark">{r.status === 'rewarded' ? '+1,000 each' : 'Pending'}</span>} />)}</div>}</Async>;
}
