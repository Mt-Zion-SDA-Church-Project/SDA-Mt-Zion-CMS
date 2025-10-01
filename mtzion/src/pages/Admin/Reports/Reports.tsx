import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  const [membersList, setMembersList] = useState<any[]>([]);
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [visitorsList, setVisitorsList] = useState<any[]>([]);
  const [ministriesList, setMinistriesList] = useState<any[]>([]);
  const [tithesList, setTithesList] = useState<any[]>([]);
  const [offeringsList, setOfferingsList] = useState<any[]>([]);

  const fetchKpi = useCallback(async () => {
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
        members: (members as any)?.length ?? 0,
        activeMembers: (active as any)?.length ?? 0,
        visitorsThisMonth: (visitors as any)?.length ?? 0,
        tithesThisMonth: sum(tithes as any),
        offeringsThisMonth: sum(offerings as any),
        attendanceThisMonth: (attendance as any)?.length ?? 0,
      });

      // Also prefetch lists for tabs
      const [membersRows, attendanceRows, visitorRows, ministryRows, tithesRows, offeringsRows] = await Promise.all([
        supabase.from('members').select('id, first_name, last_name, status, created_at').order('created_at', { ascending: false }).limit(25),
        supabase.from('attendance').select('id, attendance_date').order('attendance_date', { ascending: false }).limit(25),
        supabase.from('visitors').select('id, full_name, visit_date').order('visit_date', { ascending: false }).limit(25),
        supabase.from('ministries').select('id, name, created_at').order('created_at', { ascending: false }).limit(25),
        supabase.from('tithes').select('id, amount, tithe_date').gte('tithe_date', start).lte('tithe_date', end).order('tithe_date', { ascending: false }).limit(25),
        supabase.from('offerings').select('id, amount, offering_date').gte('offering_date', start).lte('offering_date', end).order('offering_date', { ascending: false }).limit(25),
      ]);

      setMembersList(membersRows.data || []);
      setAttendanceList(attendanceRows.data || []);
      setVisitorsList(visitorRows.data || []);
      setMinistriesList(ministryRows.data || []);
      setTithesList(tithesRows.data || []);
      setOfferingsList(offeringsRows.data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchKpi();
  }, [fetchKpi]);

  useEffect(() => {
    // Realtime subscriptions; refresh on CRUD events
    const channel = supabase
      .channel('reports_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, fetchKpi)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitors' }, fetchKpi)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tithes' }, fetchKpi)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offerings' }, fetchKpi)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, fetchKpi)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ministries' }, fetchKpi)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchKpi]);

  const currency = (n: number) => new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(n || 0);

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

          {tab === 'members' && (
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50"><tr><th className="text-left p-2 border-b">Name</th><th className="text-left p-2 border-b">Status</th><th className="text-left p-2 border-b">Joined</th></tr></thead>
                <tbody>
                  {membersList.length === 0 ? (
                    <tr><td className="p-2 text-gray-600" colSpan={3}>No members</td></tr>
                  ) : membersList.map((m) => (
                    <tr key={m.id} className="odd:bg-white even:bg-gray-50"><td className="p-2 border-b">{m.first_name} {m.last_name}</td><td className="p-2 border-b">{m.status}</td><td className="p-2 border-b">{new Date(m.created_at).toLocaleDateString()}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'attendance' && (
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50"><tr><th className="text-left p-2 border-b">Sabbath Date</th></tr></thead>
                <tbody>
                  {attendanceList.length === 0 ? (
                    <tr><td className="p-2 text-gray-600">No attendance records</td></tr>
                  ) : attendanceList.map((a) => (
                    <tr key={a.id} className="odd:bg-white even:bg-gray-50"><td className="p-2 border-b">{new Date(a.attendance_date).toLocaleDateString()}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'givings' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 text-sm font-semibold">Tithes</div>
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50"><tr><th className="text-left p-2 border-b">Date</th><th className="text-left p-2 border-b">Amount</th></tr></thead>
                  <tbody>
                    {tithesList.length === 0 ? (
                      <tr><td className="p-2 text-gray-600" colSpan={2}>No tithes</td></tr>
                    ) : tithesList.map((t) => (
                      <tr key={t.id} className="odd:bg-white even:bg-gray-50"><td className="p-2 border-b">{new Date(t.tithe_date).toLocaleDateString()}</td><td className="p-2 border-b">{currency(Number(t.amount||0))}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 text-sm font-semibold">Offerings</div>
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50"><tr><th className="text-left p-2 border-b">Date</th><th className="text-left p-2 border-b">Amount</th></tr></thead>
                  <tbody>
                    {offeringsList.length === 0 ? (
                      <tr><td className="p-2 text-gray-600" colSpan={2}>No offerings</td></tr>
                    ) : offeringsList.map((o) => (
                      <tr key={o.id} className="odd:bg-white even:bg-gray-50"><td className="p-2 border-b">{new Date(o.offering_date).toLocaleDateString()}</td><td className="p-2 border-b">{currency(Number(o.amount||0))}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'visitors' && (
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50"><tr><th className="text-left p-2 border-b">Visitor</th><th className="text-left p-2 border-b">Visit Date</th></tr></thead>
                <tbody>
                  {visitorsList.length === 0 ? (
                    <tr><td className="p-2 text-gray-600" colSpan={2}>No visitors in range</td></tr>
                  ) : visitorsList.map((v) => (
                    <tr key={v.id} className="odd:bg-white even:bg-gray-50"><td className="p-2 border-b">{v.full_name}</td><td className="p-2 border-b">{new Date(v.visit_date).toLocaleDateString()}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'ministries' && (
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50"><tr><th className="text-left p-2 border-b">Ministry</th><th className="text-left p-2 border-b">Created</th></tr></thead>
                <tbody>
                  {ministriesList.length === 0 ? (
                    <tr><td className="p-2 text-gray-600" colSpan={2}>No ministries</td></tr>
                  ) : ministriesList.map((m) => (
                    <tr key={m.id} className="odd:bg-white even:bg-gray-50"><td className="p-2 border-b">{m.name}</td><td className="p-2 border-b">{new Date(m.created_at).toLocaleDateString()}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;













