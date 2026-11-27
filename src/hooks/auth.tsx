import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { ApiError, clearApiCache } from '../lib/api';
import { deleteStorageFile, replaceStorageFile, resolveStorageMediaUrl, uploadStorageFile } from '../lib/appwrite';
import { ONBOARDED_KEY, safeStorageGet, safeStorageRemove, safeStorageSet } from '../lib/format';
import { isSupabaseConfigured, supabase, TABLES } from '../lib/supabase';

export interface AuthUser {
  $id: string;
  id: string;
  name: string;
  email: string;
  phone: string;
  emailVerification: boolean;
  avatarUrl?: string;
  avatarFileId?: string;
  role: 'user' | 'editor' | 'admin';
  prefs: Record<string, unknown>;
}

function clearSessionUserArtifacts() {
  safeStorageRemove('session', 'forword:otp-phone');
  if (typeof window === 'undefined') return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const k = window.sessionStorage.key(i);
      if (k && k.startsWith('forword:read:')) keys.push(k);
    }
    keys.forEach((k) => window.sessionStorage.removeItem(k));
  } catch {
    // Ignore storage access restrictions.
  }
}

function getRedirectOrigin(): string {
  if (typeof window === 'undefined') return 'https://www.forword.in';
  return window.location.origin;
}

async function fetchOrInitializeProfile(authUser: SupabaseUser): Promise<AuthUser> {
  const fallbackName =
    (typeof authUser.user_metadata?.full_name === 'string' && authUser.user_metadata.full_name.trim()) ||
    (typeof authUser.user_metadata?.name === 'string' && authUser.user_metadata.name.trim()) ||
    '';

  let profile: Record<string, unknown> | null = null;
  if (supabase) {
    const { data, error } = await supabase
      .from(TABLES.profiles)
      .select('id, full_name, email, phone, avatar_url, avatar_file_id, role, prefs')
      .eq('id', authUser.id)
      .maybeSingle();

    if (!error && data) {
      profile = data as Record<string, unknown>;
    } else if (!error && !data) {
      // Initialize profile row safely with strict default role = 'user' (never trusting client roles).
      const { data: created } = await supabase
        .from(TABLES.profiles)
        .upsert(
          {
            id: authUser.id,
            full_name: fallbackName,
            email: authUser.email ?? null,
            phone: authUser.phone ?? null,
            role: 'user',
          },
          { onConflict: 'id' },
        )
        .select('id, full_name, email, phone, avatar_url, avatar_file_id, role, prefs')
        .maybeSingle();
      if (created) profile = created as Record<string, unknown>;
    }
  }

  const avatarFileId = typeof profile?.avatar_file_id === 'string' ? profile.avatar_file_id : undefined;
  const rawAvatarUrl = typeof profile?.avatar_url === 'string' ? profile.avatar_url : undefined;
  const resolvedAvatar = resolveStorageMediaUrl(rawAvatarUrl, avatarFileId, 'profile-images', { width: 256, quality: 85 });

  const rawRole = typeof profile?.role === 'string' ? profile.role : 'user';
  const role: AuthUser['role'] = rawRole === 'admin' || rawRole === 'editor' ? rawRole : 'user';
  const prefs =
    profile?.prefs && typeof profile.prefs === 'object' && !Array.isArray(profile.prefs)
      ? (profile.prefs as Record<string, unknown>)
      : {};

  return {
    $id: authUser.id,
    id: authUser.id,
    name: (typeof profile?.full_name === 'string' && profile.full_name.trim()) || fallbackName,
    email: (typeof profile?.email === 'string' && profile.email) || authUser.email || '',
    phone: (typeof profile?.phone === 'string' && profile.phone) || authUser.phone || '',
    emailVerification: Boolean(authUser.email_confirmed_at),
    avatarUrl: resolvedAvatar,
    avatarFileId,
    role,
    prefs,
  };
}

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  recoveryReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithOAuth: (provider: 'google' | 'apple') => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<{ needsEmailVerification: boolean }>;
  logout: () => Promise<void>;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (code: string) => Promise<void>;
  sendVerification: () => Promise<void>;
  confirmVerification: (params: { code?: string; tokenHash?: string; type?: string }) => Promise<void>;
  forgot: (email: string) => Promise<void>;
  reset: (password: string, params?: { code?: string; tokenHash?: string }) => Promise<void>;
  changePassword: (oldPassword: string, password: string) => Promise<void>;
  updateName: (name: string) => Promise<void>;
  updateAvatar: (file: File) => Promise<string>;
  removeAvatar: () => Promise<void>;
  updatePrefs: (prefs: Record<string, unknown>) => Promise<void>;
}

const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const authEpochRef = useRef(0);

  const hydrateUser = useCallback(async (sbUser: SupabaseUser | null) => {
    const epoch = authEpochRef.current;
    if (!sbUser) {
      if (epoch === authEpochRef.current) setUser(null);
      return;
    }
    try {
      const hydrated = await fetchOrInitializeProfile(sbUser);
      if (epoch !== authEpochRef.current) return;
      setUser(hydrated);
      safeStorageSet('local', ONBOARDED_KEY, '1');
    } catch {
      if (epoch !== authEpochRef.current) return;
      setUser(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setUser(null);
      return;
    }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      setUser(null);
      return;
    }
    await hydrateUser(data.user);
  }, [hydrateUser]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setUser(null);
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!mounted) return;
        await hydrateUser(data.session?.user ?? null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryReady(true);
      }
      if (event === 'SIGNED_OUT') {
        authEpochRef.current += 1;
        setRecoveryReady(false);
        setUser(null);
        clearApiCache();
        clearSessionUserArtifacts();
        return;
      }
      hydrateUser(session?.user ?? null).catch(() => {});
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [hydrateUser]);

  const requireAuthClient = () => {
    if (!isSupabaseConfigured || !supabase) {
      throw new ApiError('Authentication service is not configured yet. Configure Supabase environment variables to continue.');
    }
    return supabase;
  };

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      loading,
      recoveryReady,
      login: async (email, password) => {
        const sb = requireAuthClient();
        authEpochRef.current += 1;
        clearApiCache();
        clearSessionUserArtifacts();
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        safeStorageSet('local', ONBOARDED_KEY, '1');
        await hydrateUser(data.user);
      },
      loginWithOAuth: async (provider) => {
        const sb = requireAuthClient();
        authEpochRef.current += 1;
        clearApiCache();
        clearSessionUserArtifacts();
        const { error } = await sb.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: `${getRedirectOrigin()}/`,
          },
        });
        if (error) throw error;
      },
      register: async (name, email, password) => {
        const sb = requireAuthClient();
        authEpochRef.current += 1;
        clearApiCache();
        clearSessionUserArtifacts();
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: `${getRedirectOrigin()}/verify-email`,
          },
        });
        if (error) throw error;
        // Supabase returns empty identities array when an account with this email already exists (when confirmation is on)
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          throw Object.assign(new Error('User already registered'), { status: 409, code: 'user_already_exists' });
        }
        safeStorageSet('local', ONBOARDED_KEY, '1');
        if (data.session?.user) {
          await hydrateUser(data.session.user);
          return { needsEmailVerification: false };
        }
        return { needsEmailVerification: true };
      },
      logout: async () => {
        authEpochRef.current += 1;
        setUser(null);
        setRecoveryReady(false);
        clearApiCache();
        clearSessionUserArtifacts();
        try {
          if (isSupabaseConfigured && supabase) {
            await supabase.auth.signOut();
          }
        } catch {
          // Session may already be expired server-side; local state is cleared.
        }
      },
      sendOtp: async (phone) => {
        const sb = requireAuthClient();
        const { error } = await sb.auth.signInWithOtp({ phone });
        if (error) throw error;
        safeStorageSet('session', 'forword:otp-phone', phone);
      },
      verifyOtp: async (code) => {
        const sb = requireAuthClient();
        const phone = safeStorageGet('session', 'forword:otp-phone');
        if (!phone) throw new ApiError('Request a new OTP first.');
        authEpochRef.current += 1;
        clearApiCache();
        const { data, error } = await sb.auth.verifyOtp({ phone, token: code, type: 'sms' });
        if (error) throw error;
        clearSessionUserArtifacts();
        safeStorageSet('local', ONBOARDED_KEY, '1');
        await hydrateUser(data.user);
      },
      sendVerification: async () => {
        const sb = requireAuthClient();
        if (!user?.email) throw new ApiError('No email address is linked to this account.');
        const { error } = await sb.auth.resend({
          type: 'signup',
          email: user.email,
          options: { emailRedirectTo: `${getRedirectOrigin()}/verify-email` },
        });
        if (error) throw error;
      },
      confirmVerification: async ({ code, tokenHash, type }) => {
        const sb = requireAuthClient();
        if (code) {
          const { error } = await sb.auth.exchangeCodeForSession(code);
          if (error) throw error;
          await refresh();
          return;
        }
        if (tokenHash) {
          const otpType =
            type === 'email_change' || type === 'magiclink' || type === 'email' ? type : 'signup';
          const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type: otpType });
          if (error) throw error;
          await refresh();
          return;
        }
        // Check if Supabase already established a verified session via URL hash
        const { data } = await sb.auth.getSession();
        if (data.session?.user?.email_confirmed_at) {
          await hydrateUser(data.session.user);
          return;
        }
        throw Object.assign(new Error('Invalid verification link'), { status: 400, code: 'invalid_token' });
      },
      forgot: async (email) => {
        const sb = requireAuthClient();
        const { error } = await sb.auth.resetPasswordForEmail(email, {
          redirectTo: `${getRedirectOrigin()}/reset-password`,
        });
        if (error) throw error;
      },
      reset: async (password, params) => {
        const sb = requireAuthClient();
        if (params?.code) {
          const { error: exErr } = await sb.auth.exchangeCodeForSession(params.code);
          if (exErr) throw exErr;
        } else if (params?.tokenHash) {
          const { error: vErr } = await sb.auth.verifyOtp({ token_hash: params.tokenHash, type: 'recovery' });
          if (vErr) throw vErr;
        }
        const { data: sessionData } = await sb.auth.getSession();
        if (!sessionData.session) {
          throw Object.assign(new Error('Invalid or expired recovery link'), { status: 401, code: 'invalid_token' });
        }
        const { error } = await sb.auth.updateUser({ password });
        if (error) throw error;
        setRecoveryReady(false);
        await sb.auth.signOut();
      },
      changePassword: async (oldPassword, password) => {
        const sb = requireAuthClient();
        if (!user?.email) {
          throw new ApiError('Password change requires an email-linked account.');
        }
        // Verify current password before updating
        const { error: verifyErr } = await sb.auth.signInWithPassword({
          email: user.email,
          password: oldPassword,
        });
        if (verifyErr) {
          throw Object.assign(new Error('Current password is incorrect'), { status: 401, code: 'invalid_credentials' });
        }
        const { error } = await sb.auth.updateUser({ password });
        if (error) throw error;
      },
      updateName: async (name) => {
        const sb = requireAuthClient();
        if (!user) throw new ApiError('Please sign in first.');
        const { error: profileErr } = await sb
          .from(TABLES.profiles)
          .update({ full_name: name })
          .eq('id', user.id);
        if (profileErr) throw profileErr;
        await sb.auth.updateUser({ data: { full_name: name } }).catch(() => {});
        await refresh();
      },
      updateAvatar: async (file) => {
        requireAuthClient();
        if (!user) throw new ApiError('Please sign in first.');
        const uploaded = user.avatarFileId
          ? await replaceStorageFile(user.avatarFileId, file, 'profile-images', {
              entityType: 'profile',
              entityId: user.id,
            })
          : await uploadStorageFile(file, 'profile-images', {
              entityType: 'profile',
              entityId: user.id,
            });
        await refresh();
        return uploaded.previewUrl;
      },
      removeAvatar: async () => {
        requireAuthClient();
        if (!user || !user.avatarFileId) return;
        await deleteStorageFile('profile-images', user.avatarFileId);
        await refresh();
      },
      updatePrefs: async (prefs) => {
        const sb = requireAuthClient();
        if (!user) throw new ApiError('Please sign in first.');
        const merged = { ...(user.prefs ?? {}), ...prefs };
        const { error } = await sb
          .from(TABLES.profiles)
          .update({ prefs: merged })
          .eq('id', user.id);
        if (error) throw error;
        await refresh();
      },
    }),
    [user, loading, recoveryReady, hydrateUser, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
