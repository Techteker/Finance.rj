import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const TABLES = {
  profiles: 'profiles',
  news: 'news',
  categories: 'categories',
  brands: 'brands',
  offers: 'offers',
  creditCards: 'credit_cards',
  loans: 'loans',
  products: 'products',
  savedArticles: 'saved_articles',
  notifications: 'notifications',
  userActivity: 'user_activity',
  wallets: 'wallets',
  rewardTransactions: 'reward_transactions',
  withdrawals: 'withdrawals',
  calculatorHistory: 'calculator_history',
  contactMessages: 'contact_messages',
  reports: 'reports',
  storageFiles: 'storage_files',
} as const;

const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
export const SUPABASE_URL = (env.VITE_SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
export const SUPABASE_ANON_KEY = (
  env.VITE_SUPABASE_ANON_KEY ??
  env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  ''
).trim();

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null;

export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
