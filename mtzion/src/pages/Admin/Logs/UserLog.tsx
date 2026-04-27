import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { queryKeys } from '../../../lib/queryKeys';
import { resolveAuditUserDisplay } from '../../../lib/resolveAuditUserDisplay';
import { LogIn, RefreshCw, Search, Clock, User, Monitor } from 'lucide-react';

const PAGE_SIZE = 25;

function escapeIlike(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/[%_]/g, '\\$&');
}

type SessionRow = {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  user_agent: string | null;
};

function formatDuration(seconds: number | null, ended: boolean): string {
  if (!ended) return '—';
  if (seconds == null || seconds < 0) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ${seconds % 60}s`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return `${h}h ${remM}m`;
}

const UserLog: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'ended'>('all');
  const [rangeDays, setRangeDays] = useState<string>('30');

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filterKey = useMemo(
    () => JSON.stringify({ page, search, status, rangeDays, PAGE_SIZE }),
    [page, search, status, rangeDays]
  );

  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: queryKeys.admin.userSessionLogList(filterKey),
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const range = rangeDays === 'all' ? null : Number(rangeDays);
      const since =
        range != null && !Number.isNaN(range)
          ? new Date(Date.now() - range * 24 * 60 * 60 * 1000).toISOString()
          : null;

      const needle = search.trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(needle);

      let q = supabase
        .from('user_login_sessions')
        .select('*', { count: 'exact' })
        .order('started_at', { ascending: false })
        .range(from, to);

      if (since) {
        q = q.gte('started_at', since);
      }
      if (status === 'active') {
        q = q.is('ended_at', null);
      } else if (status === 'ended') {
        q = q.not('ended_at', 'is', null);
      }

      if (needle) {
        if (isUuid) {
          q = q.eq('user_id', needle);
        } else {
          const s = escapeIlike(needle);
          const [suRes, memRes] = await Promise.all([
            supabase
              .from('system_users')
              .select('user_id')
              .or(`full_name.ilike.%${s}%,email.ilike.%${s}%,username.ilike.%${s}%`),
            supabase
              .from('members')
              .select('user_id')
              .or(`first_name.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%`),
          ]);
          const fromNames = new Set<string>();
          (suRes.data || []).forEach((r: { user_id: string | null }) => {
            if (r.user_id) fromNames.add(r.user_id);
          });
          (memRes.data || []).forEach((r: { user_id: string | null }) => {
            if (r.user_id) fromNames.add(r.user_id);
          });
          if (fromNames.size > 0) {
            q = q.in('user_id', Array.from(fromNames));
          } else {
            q = q.ilike('user_agent', `%${escapeIlike(needle)}%`);
          }
        }
      }

      const { data: raw, error: err, count } = await q;
      if (err) throw err;
      const rows = (raw || []) as SessionRow[];
      const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
      const userLabels = await resolveAuditUserDisplay(supabase, userIds);
      return { rows, count: count ?? 0, userLabels };
    },
  });

  useEffect(() => {
    const onFocus = () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'logs', 'user', 'sessions'], exact: false });
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [queryClient]);

  const errMsg = isError ? (error as Error).message : null;
  const rows = data?.rows ?? [];
  const count = data?.count ?? 0;
  const userLabels = data?.userLabels ?? new Map<string, string>();
  const totalPages = count === 0 ? 1 : Math.max(1, Math.ceil(count / PAGE_SIZE));

  useEffect(() => {
    if (count > 0 && page > totalPages - 1) {
      setPage(totalPages - 1);
    }
  }, [count, page, totalPages]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
        <div className="px-5 py-4 border-b bg-gradient-to-r from-indigo-50/90 to-slate-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-slate-900">
                <LogIn className="w-6 h-6 text-indigo-600" />
                <h1 className="text-xl font-bold tracking-tight">User log</h1>
              </div>
              <p className="text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
                Sign-ins and time spent in each web session. A row is created when someone signs in; duration is
                recorded when they sign out. If they close the browser without signing out, the session may show as
                active or remain open until the next sign-in.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isPending || isFetching}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 self-start"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="p-4 border-b bg-gray-50/80 flex flex-col lg:flex-row gap-3 lg:items-end lg:justify-between">
          <div className="flex-1 min-w-0 max-w-md">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                placeholder="Name, email, user id, or browser (user agent)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="w-full sm:w-40">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
              <select
                className="w-full py-2 px-3 rounded-lg border border-gray-200 text-sm bg-white outline-none"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as 'all' | 'active' | 'ended');
                  setPage(0);
                }}
              >
                <option value="all">All</option>
                <option value="active">Active (no sign-out yet)</option>
                <option value="ended">Ended</option>
              </select>
            </div>
            <div className="w-full sm:w-44">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Sign-in since</label>
              <select
                className="w-full py-2 px-3 rounded-lg border border-gray-200 text-sm bg-white outline-none"
                value={rangeDays}
                onChange={(e) => {
                  setRangeDays(e.target.value);
                  setPage(0);
                }}
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="all">All time</option>
              </select>
            </div>
          </div>
        </div>

        {errMsg && (
          <div className="m-4 p-3 rounded-lg bg-rose-50 text-rose-800 text-sm border border-rose-200">
            {errMsg.includes('user_login_sessions') || errMsg.includes('schema cache')
              ? 'The login session table is not available yet. Apply the latest database migration (user_login_sessions), then refresh.'
              : errMsg}
          </div>
        )}

        {isPending && !data ? (
          <div className="p-12 text-center text-gray-500">Loading sessions…</div>
        ) : (
          <div className="overflow-x-auto">
            {rows.length === 0 ? (
              <div className="p-12 text-center text-gray-600">
                <Monitor className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="font-medium">No login sessions in this range</p>
                <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                  Sessions are recorded from sign-in on this app version. Ask users to sign out to capture duration, or
                  use &quot;Active&quot; to see open sessions.
                </p>
              </div>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500 border-b">
                    <th className="p-3 font-semibold">
                      <span className="inline-flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        User
                      </span>
                    </th>
                    <th className="p-3 font-semibold">Signed in</th>
                    <th className="p-3 font-semibold">Signed out</th>
                    <th className="p-3 font-semibold">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Time on system
                      </span>
                    </th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold hidden md:table-cell max-w-[200px]">Device</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r) => {
                    const ended = r.ended_at != null;
                    const who = userLabels.get(r.user_id) || r.user_id;
                    return (
                      <tr key={r.id} className="hover:bg-gray-50/80 align-top">
                        <td className="p-3 text-gray-800 text-xs leading-snug break-words max-w-[200px]">{who}</td>
                        <td className="p-3 text-gray-700 whitespace-nowrap text-xs">
                          {new Date(r.started_at).toLocaleString()}
                        </td>
                        <td className="p-3 text-gray-600 whitespace-nowrap text-xs">
                          {ended ? new Date(r.ended_at!).toLocaleString() : '—'}
                        </td>
                        <td className="p-3 text-gray-800 font-mono text-xs">
                          {formatDuration(r.duration_seconds, ended)}
                        </td>
                        <td className="p-3">
                          {ended ? (
                            <span className="text-xs font-medium text-slate-600">Ended</span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-900">
                              Active
                            </span>
                          )}
                        </td>
                        <td
                          className="p-3 text-gray-500 text-[11px] font-mono hidden md:table-cell max-w-[200px] truncate"
                          title={r.user_agent || undefined}
                        >
                          {r.user_agent ? r.user_agent : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {count > 0 && !isError && (
          <div className="px-4 py-3 border-t bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-600">
            <span>
              {count} session{count === 1 ? '' : 's'}
              {totalPages > 1 && (
                <>
                  {' '}
                  · page {page + 1} of {totalPages}
                </>
              )}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm disabled:opacity-50 hover:bg-gray-50"
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm disabled:opacity-50 hover:bg-gray-50"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserLog;
