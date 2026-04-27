import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { queryKeys } from '../../../lib/queryKeys';
import { resolveAuditUserDisplay } from '../../../lib/resolveAuditUserDisplay';
import { dateStampForFilename, downloadCsv, MAX_CSV_EXPORT_ROWS, toCsvLine } from '../../../lib/csvDownload';
import {
  Activity,
  Database,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Search,
  FileJson,
  Download,
} from 'lucide-react';

type LogTable = 'activity_logs';

type AuditRow = {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
  ip_address?: string | null;
  user_agent?: string | null;
};

const PAGE_SIZE = 25;
const FETCH_CHUNK = 1000;

function escapeIlike(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/[%_]/g, '\\$&');
}

function actionClass(action: string): string {
  const a = action.toLowerCase();
  if (a === 'insert') return 'bg-emerald-100 text-emerald-800';
  if (a === 'update') return 'bg-sky-100 text-sky-800';
  if (a === 'delete') return 'bg-rose-100 text-rose-800';
  return 'bg-gray-100 text-gray-700';
}

function formatJson(preview: Record<string, unknown> | null): string {
  if (!preview || Object.keys(preview).length === 0) return '—';
  try {
    const s = JSON.stringify(preview);
    return s.length > 200 ? `${s.slice(0, 200)}…` : s;
  } catch {
    return '—';
  }
}

export type AuditLogPageProps = {
  logTable: LogTable;
  title: string;
  description: string;
};

const listQueryKey = (filterKey: string) => queryKeys.admin.activityLogList(filterKey);

async function fetchAllActivityLogRows(
  logTable: 'activity_logs',
  search: string,
  entityType: string
): Promise<AuditRow[]> {
  const all: AuditRow[] = [];
  for (let from = 0; from < MAX_CSV_EXPORT_ROWS; from += FETCH_CHUNK) {
    const to = from + FETCH_CHUNK - 1;
    let q = supabase
      .from(logTable)
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);
    if (entityType !== 'all') {
      q = q.eq('entity_type', entityType);
    }
    if (search.trim()) {
      const s = escapeIlike(search.trim());
      q = q.or(`action.ilike.%${s}%,entity_type.ilike.%${s}%`);
    }
    const { data, error } = await q;
    if (error) throw error;
    const batch = (data || []) as AuditRow[];
    all.push(...batch);
    if (batch.length < FETCH_CHUNK) break;
  }
  return all;
}

const AuditLogPage: React.FC<AuditLogPageProps> = ({ logTable, title, description }) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState<string>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filterKey = useMemo(
    () => JSON.stringify({ page, search, entityType, logTable, PAGE_SIZE }),
    [page, search, entityType, logTable]
  );

  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: listQueryKey(filterKey),
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let q = supabase
        .from(logTable)
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (entityType !== 'all') {
        q = q.eq('entity_type', entityType);
      }
      if (search.trim()) {
        const s = escapeIlike(search.trim());
        q = q.or(`action.ilike.%${s}%,entity_type.ilike.%${s}%`);
      }

      const { data: rawRows, error: err, count } = await q;
      if (err) throw err;
      const list = (rawRows || []) as AuditRow[];
      const userIds = list.map((r) => r.user_id).filter((u): u is string => u != null);
      const userLabels = await resolveAuditUserDisplay(supabase, userIds);
      return { rows: list, count: count ?? 0, userLabels };
    },
  });

  useEffect(() => {
    const onFocus = () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'logs', 'activity'], exact: false });
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

  const handleExportCsv = async () => {
    if (count === 0) return;
    setExporting(true);
    try {
      const all = await fetchAllActivityLogRows(logTable, search, entityType);
      const userIds = [...new Set(all.map((r) => r.user_id).filter((u): u is string => u != null))];
      const labels = await resolveAuditUserDisplay(supabase, userIds);
      const header = toCsvLine([
        'created_at',
        'action',
        'entity_type',
        'entity_id',
        'actor',
        'user_id',
        'ip_address',
        'user_agent',
        'old_data_json',
        'new_data_json',
      ]);
      const lines = all.map((r) =>
        toCsvLine([
          r.created_at,
          r.action,
          r.entity_type,
          r.entity_id ?? '',
          r.user_id ? (labels.get(r.user_id) ?? r.user_id) : 'System / unknown',
          r.user_id ?? '',
          r.ip_address ?? '',
          r.user_agent ?? '',
          r.old_data ? JSON.stringify(r.old_data) : '',
          r.new_data ? JSON.stringify(r.new_data) : '',
        ])
      );
      if (all.length >= MAX_CSV_EXPORT_ROWS) {
        alert(
          `Export is limited to ${MAX_CSV_EXPORT_ROWS.toLocaleString()} rows. Narrow search or entity filter and export again for more.`
        );
      }
      downloadCsv(`activity-log-${dateStampForFilename()}.csv`, header, lines);
    } catch (e) {
      console.error(e);
      alert((e as Error).message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
        <div className="px-5 py-4 border-b bg-gradient-to-r from-slate-50 to-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-900">
              {logTable === 'activity_logs' ? (
                <Activity className="w-6 h-6 text-teal-600" />
              ) : (
                <Database className="w-6 h-6 text-indigo-600" />
              )}
              <h1 className="text-xl font-bold tracking-tight">{title}</h1>
            </div>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">{description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start">
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isPending || isFetching}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void handleExportCsv()}
              disabled={isPending || count === 0 || exporting}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-teal-200 bg-teal-50 text-sm font-medium text-teal-900 hover:bg-teal-100 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
          </div>
        </div>

        <div className="p-4 border-b bg-gray-50/80 flex flex-col md:flex-row gap-3 md:items-end md:justify-between">
          <div className="flex-1 min-w-0 max-w-md">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 outline-none"
                placeholder="Action or entity (e.g. update, members)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </div>
          <div className="w-full md:w-52">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Entity</label>
            <select
              className="w-full py-2 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 outline-none"
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value);
                setPage(0);
              }}
            >
              <option value="all">All types</option>
              <option value="members">members</option>
              <option value="events">events</option>
              <option value="visitors">visitors</option>
              <option value="system_users">system_users</option>
            </select>
          </div>
        </div>

        {errMsg && (
          <div className="m-4 p-3 rounded-lg bg-rose-50 text-rose-800 text-sm border border-rose-200">{errMsg}</div>
        )}

        {isPending && !data ? (
          <div className="p-12 text-center text-gray-500">Loading log entries…</div>
        ) : (
          <div className="overflow-x-auto">
            {rows.length === 0 ? (
              <div className="p-12 text-center">
                <FileJson className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No entries match your filters</p>
                <p className="text-sm text-gray-500 mt-1">Try changing search, entity, or time range. New activity will show here as it is recorded.</p>
              </div>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500 border-b">
                    <th className="w-8 p-2" />
                    <th className="p-3 font-semibold">When (local)</th>
                    <th className="p-3 font-semibold">Action</th>
                    <th className="p-3 font-semibold">Entity</th>
                    <th className="p-3 font-semibold hidden lg:table-cell">Id</th>
                    <th className="p-3 font-semibold min-w-[180px]">Actor</th>
                    <th className="p-3 font-semibold hidden xl:table-cell">Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r) => {
                    const isOpen = expanded === r.id;
                    const who = r.user_id ? userLabels.get(r.user_id) ?? r.user_id : 'System / unknown';
                    const sum = formatJson((r.new_data as Record<string, unknown>) || (r.old_data as Record<string, unknown>));
                    return (
                      <React.Fragment key={r.id}>
                        <tr className="hover:bg-gray-50/80 align-top">
                          <td className="p-1">
                            <button
                              type="button"
                              aria-label={isOpen ? 'Collapse' : 'Expand details'}
                              className="p-1 rounded text-gray-500 hover:bg-gray-200/80"
                              onClick={() => setExpanded(isOpen ? null : r.id)}
                            >
                              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                          </td>
                          <td className="p-3 text-gray-700 whitespace-nowrap">
                            {new Date(r.created_at).toLocaleString()}
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-semibold capitalize ${actionClass(
                                r.action
                              )}`}
                            >
                              {r.action}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="font-mono text-xs text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">
                              {r.entity_type}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-xs text-gray-500 hidden lg:table-cell break-all max-w-[120px]">
                            {r.entity_id ? r.entity_id.slice(0, 8) + '…' : '—'}
                          </td>
                          <td className="p-3 text-gray-800 text-xs leading-snug break-words">{who}</td>
                          <td className="p-3 text-gray-500 text-xs font-mono hidden xl:table-cell max-w-xs truncate" title={sum}>
                            {sum}
                          </td>
                        </tr>
                        {isOpen && (
                          <tr>
                            <td colSpan={7} className="p-0 bg-slate-50/90 border-b border-slate-100">
                              <div className="p-4 space-y-3 text-left">
                                <div className="grid sm:grid-cols-2 gap-3 text-xs text-gray-600">
                                  {r.entity_id && <div><span className="text-gray-400">Entity id: </span>{r.entity_id}</div>}
                                  {r.ip_address && <div><span className="text-gray-400">IP: </span>{r.ip_address}</div>}
                                  {r.user_agent && <div className="sm:col-span-2"><span className="text-gray-400">User agent: </span>{r.user_agent}</div>}
                                </div>
                                <div className="grid md:grid-cols-2 gap-3">
                                  <div>
                                    <div className="text-xs font-semibold text-gray-500 mb-1">Previous (delete/update)</div>
                                    <pre className="text-[11px] leading-relaxed p-3 rounded-lg bg-white border border-gray-200 overflow-x-auto max-h-48 overflow-y-auto">
                                      {r.old_data ? JSON.stringify(r.old_data, null, 2) : '—'}
                                    </pre>
                                  </div>
                                  <div>
                                    <div className="text-xs font-semibold text-gray-500 mb-1">New (insert/update)</div>
                                    <pre className="text-[11px] leading-relaxed p-3 rounded-lg bg-white border border-gray-200 overflow-x-auto max-h-48 overflow-y-auto">
                                      {r.new_data ? JSON.stringify(r.new_data, null, 2) : '—'}
                                    </pre>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {count > 0 && (
          <div className="px-4 py-3 border-t bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-600">
            <span>
              {count} record{count === 1 ? '' : 's'}
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
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-medium disabled:opacity-50 hover:bg-gray-50"
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-medium disabled:opacity-50 hover:bg-gray-50"
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

export default AuditLogPage;
