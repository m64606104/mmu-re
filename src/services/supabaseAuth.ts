import { getSupabaseClient } from './supabaseClient';

let authPromise: Promise<void> | null = null;

export async function ensureSupabaseAnonSession(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  if (authPromise) return authPromise;

  authPromise = (async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      console.log('✅ Supabase会话已存在');
      return;
    }
    authPromise = null;
    throw new Error('Cloud sync requires email sign-in.');
  })();

  return authPromise;
}

export function resetSupabaseAnonSession(): void {
  authPromise = null;
}

export async function getSupabaseUserId(): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export async function supabaseSendMagicLink(email: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase is not configured or disabled.');
  const normalized = String(email ?? '').trim();
  if (!normalized) throw new Error('Email is required.');
  const redirectTo =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : undefined;
  const { error } = await supabase.auth.signInWithOtp({
    email: normalized,
    options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
  });
  if (error) throw error;
}

export async function supabaseSignOut(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  resetSupabaseAnonSession();
}

export function onSupabaseAuthStateChange(callback: () => void): (() => void) | null {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = supabase.auth.onAuthStateChange(() => {
    callback();
  });
  return () => {
    data.subscription.unsubscribe();
  };
}

