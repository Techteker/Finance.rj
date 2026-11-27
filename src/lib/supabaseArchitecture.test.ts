import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { TABLES } from './supabase';
import { STORAGE_BUCKETS, validateClientFile } from './appwrite';
import { sanitizeSearchFilter } from './api';

test('architecture enforces Supabase Auth+DB and Appwrite Storage-only separation', () => {
  const root = process.cwd();
  const appwriteSrc = fs.readFileSync(path.join(root, 'src/lib/appwrite.ts'), 'utf8');
  const authSrc = fs.readFileSync(path.join(root, 'src/hooks/auth.tsx'), 'utf8');
  const apiSrc = fs.readFileSync(path.join(root, 'src/lib/api.ts'), 'utf8');

  // Appwrite client must NOT import Account, Databases, or Functions
  assert.equal(appwriteSrc.includes('new Account('), false);
  assert.equal(appwriteSrc.includes('new Databases('), false);
  assert.equal(appwriteSrc.includes('new Functions('), false);
  assert.equal(appwriteSrc.includes('new Storage('), true);

  // Auth hook must use Supabase Auth exclusively
  assert.equal(authSrc.includes('supabase.auth'), true);
  assert.equal(authSrc.includes("from 'appwrite'"), false);

  // Production API must NOT silently fall back to demoData
  assert.equal(apiSrc.includes('demoData'), false);
  assert.equal(apiSrc.includes('queryDemoNews'), false);
  assert.equal(apiSrc.includes('queryDemoOffers'), false);
  assert.equal(apiSrc.includes('queryDemoProducts'), false);
});

test('all 13+ required Supabase tables and RLS policies exist in supabase/schema.sql', () => {
  const schema = fs.readFileSync(path.join(process.cwd(), 'supabase/schema.sql'), 'utf8');
  const requiredTables = [
    'profiles',
    'news',
    'categories',
    'brands',
    'offers',
    'credit_cards',
    'loans',
    'products',
    'saved_articles',
    'notifications',
    'user_activity',
    'wallets',
    'reward_transactions',
  ];
  for (const tbl of requiredTables) {
    assert.ok(Object.values(TABLES).includes(tbl as (typeof TABLES)[keyof typeof TABLES]), `TABLES must include ${tbl}`);
    assert.ok(schema.includes(`CREATE TABLE IF NOT EXISTS public.${tbl}`), `schema.sql must define ${tbl}`);
    assert.ok(schema.includes(`ALTER TABLE public.${tbl} ENABLE ROW LEVEL SECURITY`), `schema.sql must enable RLS on ${tbl}`);
  }
  // Role escalation guard trigger & financial tables read-only for clients
  assert.ok(schema.includes('prevent_profile_role_escalation'));
  assert.equal(schema.includes('CREATE POLICY "wallets_insert'), false);
  assert.equal(schema.includes('CREATE POLICY "reward_transactions_insert'), false);
});

test('Appwrite storage buckets and client file validation reject unsafe types and oversized files', () => {
  assert.deepEqual(Object.values(STORAGE_BUCKETS).sort(), [
    'brand-logos',
    'documents',
    'news-images',
    'offer-banners',
    'product-images',
    'profile-images',
  ]);

  assert.equal(validateClientFile({ type: 'image/png', size: 1024 * 200, name: 'avatar.png' }, 'profile-images').ok, true);
  assert.equal(validateClientFile({ type: 'image/svg+xml', size: 1024, name: 'xss.svg' }, 'profile-images').ok, false);
  assert.equal(validateClientFile({ type: 'application/pdf', size: 1024, name: 'doc.pdf' }, 'profile-images').ok, false);
  assert.equal(validateClientFile({ type: 'application/pdf', size: 1024 * 500, name: 'doc.pdf' }, 'documents').ok, true);
  assert.equal(validateClientFile({ type: 'image/jpeg', size: 6 * 1024 * 1024, name: 'huge.jpg' }, 'profile-images').ok, false);
});

test('sanitizeSearchFilter strips PostgREST filter injection characters', () => {
  assert.equal(sanitizeSearchFilter('HDFC,or(id.eq.1)'), 'HDFC or id.eq.1');
  assert.equal(sanitizeSearchFilter('  SBI %_ Cashback  '), 'SBI Cashback');
  assert.equal(sanitizeSearchFilter('a'.repeat(200)).length, 100);
});
