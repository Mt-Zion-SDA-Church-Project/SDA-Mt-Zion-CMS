import { supabase } from './supabase';

/**
 * Record a new session when the user signs in (SIGNED_IN). Do not call on INITIAL_SESSION
 * to avoid a new row on every page refresh.
 */
export async function recordUserSessionStart(userId: string): Promise<void> {
  const user_agent = typeof navigator !== 'undefined' ? navigator.userAgent : null;
  const { error } = await supabase.from('user_login_sessions').insert({
    user_id: userId,
    user_agent,
  });
  if (error) {
    console.warn('user_login_sessions insert failed:', error.message);
  }
}

/**
 * Close the most recent open session for this user (call before signOut while still authenticated).
 */
export async function recordUserSessionEnd(userId: string): Promise<void> {
  const { data: openRow, error: selErr } = await supabase
    .from('user_login_sessions')
    .select('id, started_at')
    .eq('user_id', userId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selErr) {
    console.warn('user_login_sessions select for end failed:', selErr.message);
    return;
  }
  if (!openRow) return;

  const endedAt = new Date();
  const started = new Date(openRow.started_at as string).getTime();
  const duration_seconds = Math.max(0, Math.floor((endedAt.getTime() - started) / 1000));

  const { error: upErr } = await supabase
    .from('user_login_sessions')
    .update({
      ended_at: endedAt.toISOString(),
      duration_seconds,
    })
    .eq('id', openRow.id);

  if (upErr) {
    console.warn('user_login_sessions end update failed:', upErr.message);
  }
}
