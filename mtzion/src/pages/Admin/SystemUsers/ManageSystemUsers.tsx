import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { queryKeys } from '../../../lib/queryKeys';
import { CheckCircle2, XCircle, ShieldCheck, Search, Users } from 'lucide-react';

type Row = {
  id: string;
  fullName: string;
  email?: string;
  username?: string;
  role: 'admin' | 'member' | 'super_admin';
  isActive: boolean;
  lastLogin?: string;
};

const ManageSystemUsers: React.FC = () => {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [onlyActive, setOnlyActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: rows = [], isPending: loading, error: queryError } = useQuery({
    queryKey: queryKeys.systemUsers.manage(),
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('system_users')
        .select('id, full_name, email, username, role, is_active, last_login')
        .order('full_name');
      if (err) throw err;
      return (data || []).map((u: any) => ({
        id: u.id,
        fullName: u.full_name,
        email: u.email,
        username: u.username,
        role: (u.role || 'member') as Row['role'],
        isActive: Boolean(u.is_active),
        lastLogin: u.last_login,
      })) as Row[];
    },
  });
  const error = queryError ? (queryError as Error).message : null;

  useEffect(() => {
    const channel = supabase
      .channel('system-users-manage')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_users' }, () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.systemUsers.manage() });
        void queryClient.invalidateQueries({ queryKey: queryKeys.systemUsers.forAddUser() });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const filtered = useMemo(() => {
    const byStatus = rows.filter((r) =>
      onlyActive === 'all' ? true : onlyActive === 'active' ? r.isActive : !r.isActive
    );
    if (!query.trim()) return byStatus;
    const q = query.toLowerCase();
    return byStatus.filter((r) =>
      [r.fullName, r.email, r.username, r.role, r.isActive ? 'active' : 'inactive']
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [rows, query, onlyActive]);

  const toggleMutation = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: boolean }) => {
      const { error: err } = await supabase
        .from('system_users')
        .update({ is_active: next })
        .eq('id', id);
      if (err) throw err;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.systemUsers.manage() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.systemUsers.forAddUser() });
    },
  });

  const toggleActive = async (id: string, next: boolean) => {
    setActionError(null);
    try {
      await toggleMutation.mutateAsync({ id, next });
    } catch (e: any) {
      setActionError(e.message || 'Failed to update status');
    }
  };

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-800">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold">System Users</h2>
            <span className="ml-2 inline-flex items-center gap-1 text-xs text-gray-500">(
              <ShieldCheck className="w-4 h-4 text-primary" /> super admin can activate/deactivate
            )</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" />
              <input
                placeholder="Search users"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-7 pr-3 py-2 border rounded-md text-sm"
              />
            </div>
            <select
              value={onlyActive}
              onChange={(e) => setOnlyActive(e.target.value as any)}
              className="border rounded-md px-2 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="p-4">
          {(error || actionError) && <div className="text-sm text-red-600 mb-2">{error || actionError}</div>}
          {loading && <div className="text-sm text-gray-600 mb-2">Loading...</div>}

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2 border-b">NAME</th>
                  <th className="text-left p-2 border-b">USERNAME</th>
                  <th className="text-left p-2 border-b">EMAIL</th>
                  <th className="text-left p-2 border-b">ROLE</th>
                  <th className="text-left p-2 border-b">STATUS</th>
                  <th className="text-left p-2 border-b">LAST LOGIN</th>
                  <th className="text-left p-2 border-b w-40">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="odd:bg-white even:bg-gray-50">
                    <td className="p-2 border-b">{r.fullName || '-'}</td>
                    <td className="p-2 border-b">{r.username || '-'}</td>
                    <td className="p-2 border-b">{r.email || '-'}</td>
                    <td className="p-2 border-b capitalize">{r.role}</td>
                    <td className="p-2 border-b">
                      {r.isActive ? (
                        <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-full">
                          <CheckCircle2 className="w-4 h-4" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded-full">
                          <XCircle className="w-4 h-4" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="p-2 border-b">{r.lastLogin ? new Date(r.lastLogin).toLocaleString() : '-'}</td>
                    <td className="p-2 border-b">
                      {r.isActive ? (
                        <button
                          onClick={() => toggleActive(r.id, false)}
                          className="px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 text-xs"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleActive(r.id, true)}
                          className="px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 text-xs"
                        >
                          Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageSystemUsers;
