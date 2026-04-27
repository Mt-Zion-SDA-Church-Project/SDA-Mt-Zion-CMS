import type { SupabaseClient } from '@supabase/supabase-js';

const shortId = (id: string) => (id.length > 8 ? `${id.slice(0, 8)}…` : id);

/**
 * Map auth `user_id` values to readable labels for audit tables (no direct access to `auth.users` from the client).
 */
export async function resolveAuditUserDisplay(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  if (unique.length === 0) return map;

  const [suRes, memRes] = await Promise.all([
    supabase.from('system_users').select('user_id, full_name, email').in('user_id', unique),
    supabase.from('members').select('user_id, first_name, last_name').in('user_id', unique),
  ]);

  (suRes.data || []).forEach((r: { user_id: string; full_name: string; email: string }) => {
    if (r.user_id) {
      const label = [r.full_name, r.email ? `(${r.email})` : ''].filter(Boolean).join(' ').trim();
      map.set(r.user_id, label || r.user_id);
    }
  });
  (memRes.data || []).forEach((r: { user_id: string; first_name: string; last_name: string }) => {
    if (!r.user_id) return;
    if (map.has(r.user_id)) return;
    const name = [r.first_name, r.last_name].filter(Boolean).join(' ').trim();
    map.set(r.user_id, name || `Member ${shortId(r.user_id)}`);
  });
  for (const id of unique) {
    if (!map.has(id)) {
      map.set(id, `User ${shortId(id)}`);
    }
  }
  return map;
}
