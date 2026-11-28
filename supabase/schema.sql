-- FORWORD User App + Admin Shared Supabase PostgreSQL Schema
-- Safe, idempotent migration: reuses existing tables without dropping or deleting data.
-- Architecture:
--   Supabase = Authentication + Database (RLS enforced on all exposed tables)
--   Appwrite = File Storage only (file IDs & preview URLs referenced here)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- Helper: updated_at trigger & secure admin check
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 1. PROFILES (extends auth.users; default role = 'user')
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text,
  phone text,
  avatar_url text,
  avatar_file_id text,
  avatar_bucket_id text DEFAULT 'profile-images',
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'editor', 'admin')),
  prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(lower(email));

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only service_role (server backend) or an existing admin can change role.
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF auth.role() <> 'service_role' AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Forbidden: role cannot be modified by user';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_profiles_prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_escalation();

-- ============================================================================
-- 2. CATEGORIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  kind text NOT NULL DEFAULT 'news' CHECK (kind IN ('news', 'product')),
  icon text DEFAULT 'news',
  sort_order integer NOT NULL DEFAULT 0,
  is_trending boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_categories_kind_sort ON public.categories(kind, sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_trending ON public.categories(is_trending) WHERE is_trending = true;

DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 3. BRANDS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  logo_url text,
  logo_file_id text,
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'published', 'archived', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_brands_status ON public.brands(status);

DROP TRIGGER IF EXISTS trg_brands_updated_at ON public.brands;
CREATE TRIGGER trg_brands_updated_at
  BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 4. NEWS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  summary text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  image_url text,
  image_file_id text,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  category_name text NOT NULL DEFAULT 'Finance',
  category_slug text NOT NULL DEFAULT 'finance',
  publisher text NOT NULL DEFAULT 'FORWORD Desk',
  source_url text NOT NULL DEFAULT '',
  author text,
  published_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  read_time integer NOT NULL DEFAULT 3 CHECK (read_time >= 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'published', 'archived', 'rejected')),
  is_sponsored boolean NOT NULL DEFAULT false,
  is_breaking boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  views integer NOT NULL DEFAULT 0 CHECK (views >= 0),
  related_product_ids text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_news_status_published ON public.news(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_category_slug ON public.news(category_slug, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_views ON public.news(views DESC);
CREATE INDEX IF NOT EXISTS idx_news_breaking ON public.news(is_breaking, published_at DESC) WHERE is_breaking = true;
CREATE INDEX IF NOT EXISTS idx_news_featured ON public.news(is_featured, published_at DESC) WHERE is_featured = true;

DROP TRIGGER IF EXISTS trg_news_updated_at ON public.news;
CREATE TRIGGER trg_news_updated_at
  BEFORE UPDATE ON public.news
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 5. OFFERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  brand_name text NOT NULL DEFAULT '',
  brand_logo text,
  image_url text,
  image_file_id text,
  description text NOT NULL DEFAULT '',
  discount text NOT NULL DEFAULT '',
  coupon_code text,
  valid_till timestamptz,
  terms text[] NOT NULL DEFAULT '{}'::text[],
  external_url text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'all',
  is_exclusive boolean NOT NULL DEFAULT false,
  is_trending boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'published', 'archived', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_offers_status_created ON public.offers(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offers_brand_id ON public.offers(brand_id);
CREATE INDEX IF NOT EXISTS idx_offers_category ON public.offers(category);

DROP TRIGGER IF EXISTS trg_offers_updated_at ON public.offers;
CREATE TRIGGER trg_offers_updated_at
  BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 6. PRODUCTS (unified catalog: banking, insurance, investments, cards, loans)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  type text NOT NULL DEFAULT 'product',
  category text NOT NULL,
  subcategory text NOT NULL DEFAULT '',
  bank_name text NOT NULL DEFAULT '',
  bank_logo text,
  bank_logo_file_id text,
  summary text,
  facts text[] NOT NULL DEFAULT '{}'::text[],
  benefits text[] NOT NULL DEFAULT '{}'::text[],
  exclusions text[] NOT NULL DEFAULT '{}'::text[],
  pros text[] NOT NULL DEFAULT '{}'::text[],
  cons text[] NOT NULL DEFAULT '{}'::text[],
  features text[] NOT NULL DEFAULT '{}'::text[],
  eligibility text,
  customer_types text[] NOT NULL DEFAULT '{}'::text[],
  fee_value numeric(12,2),
  reward_rate numeric(6,2),
  cashback_rate numeric(6,2),
  editorial_rank integer NOT NULL DEFAULT 100,
  min_income numeric(12,2),
  min_age integer,
  max_age integer,
  apply_url text NOT NULL DEFAULT '',
  verified_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'published', 'archived', 'rejected')),
  review text,
  apply_steps text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_products_cat_sub_rank ON public.products(status, category, subcategory, editorial_rank ASC);

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 7. CREDIT CARDS (dedicated table synced/queried with credit-cards module)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.credit_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  subcategory text NOT NULL DEFAULT 'best-credit-cards',
  bank_name text NOT NULL DEFAULT '',
  bank_logo text,
  bank_logo_file_id text,
  summary text,
  annual_fee numeric(12,2),
  joining_fee numeric(12,2),
  reward_rate numeric(6,2),
  cashback_rate numeric(6,2),
  facts text[] NOT NULL DEFAULT '{}'::text[],
  benefits text[] NOT NULL DEFAULT '{}'::text[],
  exclusions text[] NOT NULL DEFAULT '{}'::text[],
  pros text[] NOT NULL DEFAULT '{}'::text[],
  cons text[] NOT NULL DEFAULT '{}'::text[],
  features text[] NOT NULL DEFAULT '{}'::text[],
  eligibility text,
  customer_types text[] NOT NULL DEFAULT '{}'::text[],
  editorial_rank integer NOT NULL DEFAULT 100,
  min_income numeric(12,2),
  min_age integer,
  max_age integer,
  apply_url text NOT NULL DEFAULT '',
  verified_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'published', 'archived', 'rejected')),
  review text,
  apply_steps text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_credit_cards_status_sub ON public.credit_cards(status, subcategory, editorial_rank ASC);

DROP TRIGGER IF EXISTS trg_credit_cards_updated_at ON public.credit_cards;
CREATE TRIGGER trg_credit_cards_updated_at
  BEFORE UPDATE ON public.credit_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 8. LOANS (dedicated table synced/queried with loans module)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  subcategory text NOT NULL DEFAULT 'personal-loans',
  bank_name text NOT NULL DEFAULT '',
  bank_logo text,
  bank_logo_file_id text,
  summary text,
  interest_rate numeric(6,2),
  processing_fee numeric(12,2),
  min_amount numeric(14,2),
  max_amount numeric(14,2),
  max_tenure_months integer,
  facts text[] NOT NULL DEFAULT '{}'::text[],
  benefits text[] NOT NULL DEFAULT '{}'::text[],
  exclusions text[] NOT NULL DEFAULT '{}'::text[],
  pros text[] NOT NULL DEFAULT '{}'::text[],
  cons text[] NOT NULL DEFAULT '{}'::text[],
  features text[] NOT NULL DEFAULT '{}'::text[],
  eligibility text,
  customer_types text[] NOT NULL DEFAULT '{}'::text[],
  editorial_rank integer NOT NULL DEFAULT 100,
  min_income numeric(12,2),
  min_age integer,
  max_age integer,
  apply_url text NOT NULL DEFAULT '',
  verified_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'published', 'archived', 'rejected')),
  review text,
  apply_steps text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_loans_status_sub ON public.loans(status, subcategory, editorial_rank ASC);

DROP TRIGGER IF EXISTS trg_loans_updated_at ON public.loans;
CREATE TRIGGER trg_loans_updated_at
  BEFORE UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 9. SAVED ARTICLES & FAVORITES (strictly user-isolated)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.saved_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('news', 'product', 'offer', 'calculator', 'guide')),
  item_id text NOT NULL,
  title text NOT NULL,
  subtitle text,
  image_url text,
  href text NOT NULL DEFAULT '/',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (user_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_articles_user_created ON public.saved_articles(user_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_saved_articles_updated_at ON public.saved_articles;
CREATE TRIGGER trg_saved_articles_updated_at
  BEFORE UPDATE ON public.saved_articles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 10. NOTIFICATIONS (user-specific + global broadcasts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  kind text NOT NULL DEFAULT 'system' CHECK (kind IN ('news', 'offer', 'reward', 'system')),
  href text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_notifications_updated_at ON public.notifications;
CREATE TRIGGER trg_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 11. USER ACTIVITY (reading history & engagement log)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL DEFAULT 'read',
  news_id text,
  title text NOT NULL,
  slug text NOT NULL DEFAULT '',
  image_url text,
  category_name text,
  duration_seconds integer DEFAULT 0 CHECK (duration_seconds >= 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_user_activity_user_created ON public.user_activity(user_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_user_activity_updated_at ON public.user_activity;
CREATE TRIGGER trg_user_activity_updated_at
  BEFORE UPDATE ON public.user_activity
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 12. WALLETS & 13. REWARD TRANSACTIONS & WITHDRAWALS (server-only writes!)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.wallets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  coins integer NOT NULL DEFAULT 0 CHECK (coins >= 0),
  balance numeric(12,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
  streak integer NOT NULL DEFAULT 0 CHECK (streak >= 0),
  last_check_in timestamptz,
  referral_code text UNIQUE,
  referred_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_wallets_referral_code ON public.wallets(referral_code);

DROP TRIGGER IF EXISTS trg_wallets_updated_at ON public.wallets;
CREATE TRIGGER trg_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.reward_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('check-in', 'read', 'referral', 'withdrawal', 'adjustment')),
  label text NOT NULL,
  coins integer NOT NULL DEFAULT 0,
  amount numeric(12,2) NOT NULL DEFAULT 0.00,
  idempotency_key text NOT NULL UNIQUE,
  reference_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_reward_tx_user_created ON public.reward_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reward_tx_user_kind_created ON public.reward_transactions(user_id, kind, created_at DESC);

-- Atomic two-sided referral payout. Called only by the trusted rewards API using service_role.
CREATE OR REPLACE FUNCTION public.apply_referral_bonus(
  p_referee_id uuid,
  p_code text,
  p_coins integer,
  p_amount numeric,
  p_referee_key text,
  p_max_referrals integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $
DECLARE
  v_referrer_id uuid;
  v_referred_by uuid;
  v_referrer_key text;
  v_referral_count integer;
BEGIN
  IF p_coins <> 1000 OR p_amount <> 10.00 OR p_max_referrals < 1 THEN
    RAISE EXCEPTION 'Invalid referral reward configuration';
  END IF;

  SELECT user_id INTO v_referrer_id
  FROM public.wallets
  WHERE referral_code = upper(trim(p_code));

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;
  IF v_referrer_id = p_referee_id THEN
    RETURN jsonb_build_object('status', 'self');
  END IF;

  -- Lock both wallets in a stable order to avoid opposite-direction referral deadlocks.
  PERFORM 1
  FROM public.wallets
  WHERE user_id IN (p_referee_id, v_referrer_id)
  ORDER BY user_id
  FOR UPDATE;

  SELECT referred_by INTO v_referred_by
  FROM public.wallets
  WHERE user_id = p_referee_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'missing_wallet');
  END IF;
  IF v_referred_by IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'already_referred');
  END IF;

  v_referrer_key := left(encode(extensions.digest(
    'referral:referrer:' || v_referrer_id::text || ':' || p_referee_id::text,
    'sha256'
  ), 'hex'), 48);

  IF EXISTS (
    SELECT 1 FROM public.reward_transactions
    WHERE idempotency_key = p_referee_key OR idempotency_key = v_referrer_key
  ) THEN
    RETURN jsonb_build_object('status', 'duplicate');
  END IF;

  SELECT count(*) INTO v_referral_count
  FROM public.reward_transactions
  WHERE user_id = v_referrer_id
    AND kind = 'referral'
    AND label = 'Referral bonus';
  IF v_referral_count >= p_max_referrals THEN
    RETURN jsonb_build_object('status', 'limit');
  END IF;

  INSERT INTO public.reward_transactions
    (user_id, kind, label, coins, amount, idempotency_key, reference_id)
  VALUES
    (p_referee_id, 'referral', 'Referral welcome bonus', p_coins, p_amount, p_referee_key, v_referrer_id::text),
    (v_referrer_id, 'referral', 'Referral bonus', p_coins, p_amount, v_referrer_key, p_referee_id::text);

  UPDATE public.wallets
  SET referred_by = v_referrer_id
  WHERE user_id = p_referee_id;

  RETURN jsonb_build_object('status', 'ok', 'referrer_id', v_referrer_id);
END;
$;

REVOKE ALL ON FUNCTION public.apply_referral_bonus(uuid, text, integer, numeric, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_referral_bonus(uuid, text, integer, numeric, text, integer) TO service_role;


CREATE TABLE IF NOT EXISTS public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  upi_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'rejected', 'cancelled')),
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_user_created ON public.withdrawals(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_status ON public.withdrawals(user_id, status);

DROP TRIGGER IF EXISTS trg_withdrawals_updated_at ON public.withdrawals;
CREATE TRIGGER trg_withdrawals_updated_at
  BEFORE UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 14. SUPPORTING USER & STORAGE METADATA TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.calculator_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL,
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_calc_history_user ON public.calculator_history(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  news_id text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.storage_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text NOT NULL,
  file_id text NOT NULL UNIQUE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type text,
  entity_id text,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL CHECK (size_bytes > 0),
  file_name text NOT NULL,
  preview_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_storage_files_owner ON public.storage_files(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_storage_files_bucket ON public.storage_files(bucket_id);

DROP TRIGGER IF EXISTS trg_storage_files_updated_at ON public.storage_files;
CREATE TRIGGER trg_storage_files_updated_at
  BEFORE UPDATE ON public.storage_files
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- Auto-initialize profile (role='user') + wallet on auth.users signup
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_code text;
BEGIN
  ref_code := 'FW' || upper(substr(replace(NEW.id::text, '-', ''), 1, 8));

  INSERT INTO public.profiles (id, full_name, email, phone, role)
  VALUES (
    NEW.id,
    coalesce(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    NEW.email,
    NEW.phone,
    'user'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.wallets (user_id, coins, balance, streak, referral_code)
  VALUES (NEW.id, 0, 0.00, 0, ref_code)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) ON ALL EXPOSED TABLES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculator_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_files ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "profiles_insert_own_user_role" ON public.profiles;
CREATE POLICY "profiles_insert_own_user_role" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id AND role = 'user');

DROP POLICY IF EXISTS "profiles_update_own_permitted" ON public.profiles;
CREATE POLICY "profiles_update_own_permitted" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_admin())
  WITH CHECK ((auth.uid() = id AND role = 'user') OR public.is_admin());

-- Public content read + Admin write policies
DROP POLICY IF EXISTS "categories_public_read" ON public.categories;
CREATE POLICY "categories_public_read" ON public.categories
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "categories_admin_write" ON public.categories;
CREATE POLICY "categories_admin_write" ON public.categories
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "brands_public_read_approved" ON public.brands;
CREATE POLICY "brands_public_read_approved" ON public.brands
  FOR SELECT USING (status IN ('approved', 'published') OR public.is_admin());
DROP POLICY IF EXISTS "brands_admin_write" ON public.brands;
CREATE POLICY "brands_admin_write" ON public.brands
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "news_public_read_published" ON public.news;
CREATE POLICY "news_public_read_published" ON public.news
  FOR SELECT USING (status IN ('approved', 'published') OR public.is_admin());
DROP POLICY IF EXISTS "news_admin_write" ON public.news;
CREATE POLICY "news_admin_write" ON public.news
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "offers_public_read_approved" ON public.offers;
CREATE POLICY "offers_public_read_approved" ON public.offers
  FOR SELECT USING (status IN ('approved', 'published') OR public.is_admin());
DROP POLICY IF EXISTS "offers_admin_write" ON public.offers;
CREATE POLICY "offers_admin_write" ON public.offers
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "products_public_read_approved" ON public.products;
CREATE POLICY "products_public_read_approved" ON public.products
  FOR SELECT USING (status IN ('approved', 'published') OR public.is_admin());
DROP POLICY IF EXISTS "products_admin_write" ON public.products;
CREATE POLICY "products_admin_write" ON public.products
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "credit_cards_public_read_approved" ON public.credit_cards;
CREATE POLICY "credit_cards_public_read_approved" ON public.credit_cards
  FOR SELECT USING (status IN ('approved', 'published') OR public.is_admin());
DROP POLICY IF EXISTS "credit_cards_admin_write" ON public.credit_cards;
CREATE POLICY "credit_cards_admin_write" ON public.credit_cards
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "loans_public_read_approved" ON public.loans;
CREATE POLICY "loans_public_read_approved" ON public.loans
  FOR SELECT USING (status IN ('approved', 'published') OR public.is_admin());
DROP POLICY IF EXISTS "loans_admin_write" ON public.loans;
CREATE POLICY "loans_admin_write" ON public.loans
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- User-private tables: saved_articles, user_activity, calculator_history
DROP POLICY IF EXISTS "saved_articles_own_all" ON public.saved_articles;
CREATE POLICY "saved_articles_own_all" ON public.saved_articles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_activity_own_all" ON public.user_activity;
CREATE POLICY "user_activity_own_all" ON public.user_activity
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "calculator_history_own_all" ON public.calculator_history;
CREATE POLICY "calculator_history_own_all" ON public.calculator_history
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Notifications: anon can read broadcast rows only; authenticated users can read broadcasts + their own.
-- All writes remain admin-only; RLS protects private user notifications.
GRANT SELECT ON TABLE public.notifications TO anon, authenticated;

DROP POLICY IF EXISTS "notifications_read_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_read_broadcast_anon" ON public.notifications;
CREATE POLICY "notifications_read_broadcast_anon" ON public.notifications
  FOR SELECT TO anon
  USING (user_id IS NULL);

DROP POLICY IF EXISTS "notifications_read_own_or_broadcast" ON public.notifications;
CREATE POLICY "notifications_read_own_or_broadcast" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id IS NULL OR auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "notifications_admin_write" ON public.notifications;
CREATE POLICY "notifications_admin_write" ON public.notifications
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Financial tables: READ OWN ONLY; ZERO direct client mutations (server service_role only!)
DROP POLICY IF EXISTS "wallets_select_own_or_admin" ON public.wallets;
CREATE POLICY "wallets_select_own_or_admin" ON public.wallets
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "reward_transactions_select_own_or_admin" ON public.reward_transactions;
CREATE POLICY "reward_transactions_select_own_or_admin" ON public.reward_transactions
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "withdrawals_select_own_or_admin" ON public.withdrawals;
CREATE POLICY "withdrawals_select_own_or_admin" ON public.withdrawals
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- Contact messages & reports: anyone can submit; only admins can read/manage
DROP POLICY IF EXISTS "contact_messages_insert_any" ON public.contact_messages;
CREATE POLICY "contact_messages_insert_any" ON public.contact_messages
  FOR INSERT WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
DROP POLICY IF EXISTS "contact_messages_admin_manage" ON public.contact_messages;
CREATE POLICY "contact_messages_admin_manage" ON public.contact_messages
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "reports_insert_any" ON public.reports;
CREATE POLICY "reports_insert_any" ON public.reports
  FOR INSERT WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
DROP POLICY IF EXISTS "reports_admin_manage" ON public.reports;
CREATE POLICY "reports_admin_manage" ON public.reports
  FOR SELECT USING (public.is_admin());

-- Storage files metadata: owner/admin read; public read for public image buckets; writes via server/admin
DROP POLICY IF EXISTS "storage_files_select_policy" ON public.storage_files;
CREATE POLICY "storage_files_select_policy" ON public.storage_files
  FOR SELECT USING (
    auth.uid() = owner_id
    OR public.is_admin()
    OR bucket_id IN ('news-images', 'brand-logos', 'offer-banners', 'product-images', 'profile-images')
  );
DROP POLICY IF EXISTS "storage_files_admin_write" ON public.storage_files;
CREATE POLICY "storage_files_admin_write" ON public.storage_files
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
