import { supabase } from './supabaseClient';

let authPromise: Promise<void> | null = null;

export async function ensureSupabaseAnonSession(): Promise<void> {
  if (!supabase) return;
  if (authPromise) return authPromise;

  authPromise = (async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      console.log('✅ Supabase匿名会话已存在');
      return;
    }

    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      authPromise = null;
      throw error;
    }
    console.log('✅ Supabase匿名会话创建成功');
  })();

  return authPromise;
}

