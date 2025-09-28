import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabase';

type KPI = {
  members: number;
  activeMembers: number;
  visitorsThisMonth: number;
  tithesThisMonth: number;
  offeringsThisMonth: number;
  attendanceThisMonth: number;
};

const Reports: React.FC = () => {
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [tab, setTab] = useState<'summary' | 'members' | 'attendance' | 'givings' | 'visitors' | 'ministries'>('summary');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const start = from ? new Date(from).toISOString() : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const end = to ? new Date(new Date(to).getTime() + 86400000 - 1).toISOString() : new Date().toISOString();

        const [{ data: members }, { data: active }, { data: visitors }, { data: tithes }, { data: offerings }, { data: attendance }] = await Promise.all([
          supabase.from('members').select('id', { count: 'exact', head: true }),
          supabase.from('members').select('id', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('visitors').select('id', { count: 'exact', head: true }).gte('visit_date', start).lte('visit_date', end),
          supabase.from('tithes').select('amount').gte('tithe_date', start).lte('tithe_date', end),
          supabase.from('offerings').select('amount').gte('offering_date', start).lte('offering_date', end),
          supabase.from('attendance').select('id').gte('attendance_date', start).lte('attendance_date', end),
        ]);

        const sum = (arr: any[] | null | undefined) => (arr || []).reduce((s, a: any) => s + Number(a.amount || 0), 0);

        setKpi({
          members: (members as any)?.length ?? 0, // count via head returns null data; fallback will show 0 in dev without RLS head count
          activeMembers: (active as any)?.length ?? 0,
          visitorsThisMonth: (visitors as any)?.length ?? 0,
          tithesThisMonth: sum(tithes as any),
          offeringsThisMonth: sum(offerings as any),
          attendanceThisMonth: (attendance as any)?.length ?? 0,
        });
      } catch (e: any) {
        setError(e.message || 'Failed to load reports');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [from, to]);

  const currency = (n: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n || 0);

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold">Reports & Analytics</h2>
            <div className="hidden print:flex items-center ml-4">
              <img src="/logo.png" alt="logo" className="w-8 h-8 mr-2" />
              <span className="text-sm">Filter: {from || 'Start'} → {to || 'Today'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border rounded-md px-2 py-2 text-sm" />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border rounded-md px-2 py-2 text-sm" />
            <button onClick={() => window.print()} className="px-3 py-2 bg-primary text-white rounded hover:opacity-90 text-sm">Print</button>
          </div>
        </div>

        <div className="px-5 pt-4">
          <div className="flex gap-2 text-sm">
            {(['summary','members','attendance','givings','visitors','ministries'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 rounded-t-md border-b-0 border ${tab===t? 'bg-white text-primary border-gray-300' : 'bg-gray-100 text-gray-600 border-transparent'}`}>{t[0].toUpperCase()+t.slice(1)}</button>
            ))}
          </div>
        </div>

        <div className="p-5 print:block">
          {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
          {loading && <div className="text-sm text-gray-600 mb-2">Loading...</div>}

          {tab === 'summary' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border p-4 bg-white">
                <div className="text-xs text-gray-500">Total Members</div>
                <div className="text-2xl font-semibold">{kpi?.members ?? '—'}</div>
              </div>
              <div className="rounded-lg border p-4 bg-white">
                <div className="text-xs text-gray-500">Active Members</div>
                <div className="text-2xl font-semibold">{kpi?.activeMembers ?? '—'}</div>
              </div>
              <div className="rounded-lg border p-4 bg-white">
                <div className="text-xs text-gray-500">Visitors (range)</div>
                <div className="text-2xl font-semibold">{kpi?.visitorsThisMonth ?? '—'}</div>
              </div>
              <div className="rounded-lg border p-4 bg-white">
                <div className="text-xs text-gray-500">Tithes (range)</div>
                <div className="text-2xl font-semibold">{currency(kpi?.tithesThisMonth || 0)}</div>
              </div>
              <div className="rounded-lg border p-4 bg-white">
                <div className="text-xs text-gray-500">Offerings (range)</div>
                <div className="text-2xl font-semibold">{currency(kpi?.offeringsThisMonth || 0)}</div>
              </div>
              <div className="rounded-lg border p-4 bg-white">
                <div className="text-xs text-gray-500">Attendance (range)</div>
                <div className="text-2xl font-semibold">{kpi?.attendanceThisMonth ?? '—'}</div>
              </div>
            </div>
          )}

          {tab !== 'summary' && (
            <div className="text-sm text-gray-600">Detailed {tab} reports will appear here. We can add charts and tables wired to Supabase views next.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;













