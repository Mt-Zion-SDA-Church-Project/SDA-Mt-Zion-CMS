import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { useAuth } from '../contexts/AuthContext';

/**
 * Resolves whether the current admin may access a sidebar / route gated by `user_privileges.tab_name`.
 * Matches Sidebar `hasPrivilege` rules: no row for tab → allowed; super_admin → always allowed.
 */
export function useAdminTabAllowed(tabName: string) {
  const { user } = useAuth();
  const uid = user?.id ?? '';
  const role = user?.role;

  return useQuery({
    queryKey: queryKeys.admin.tabAllowed(tabName, uid || 'none'),
    enabled: !!uid && (role === 'admin' || role === 'super_admin'),
    queryFn: async (): Promise<boolean> => {
      if (!user?.id) return false;
      if (user.role === 'super_admin') return true;

      const { data: systemUser, error } = await supabase
        .from('system_users')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error || !systemUser?.id) return false;

      const { data: row } = await supabase
        .from('user_privileges')
        .select('is_allowed')
        .eq('user_id', systemUser.id)
        .eq('user_type', 'admin')
        .eq('tab_name', tabName)
        .maybeSingle();

      if (!row) return true;
      return Boolean(row.is_allowed);
    },
    staleTime: 60_000,
  });
}
