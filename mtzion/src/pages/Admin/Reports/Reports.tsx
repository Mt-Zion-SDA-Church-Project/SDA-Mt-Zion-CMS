import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { queryKeys } from '../../../lib/queryKeys';
import { ChevronDown, ChevronRight, Download, FileText } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

type KPI = {
  members: number;
  activeMembers: number;
  visitorsThisMonth: number;
  offeringsThisMonth: number;
  attendanceThisMonth: number;
};

type MemberFamilyRow = {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  status: string;
  member_number: string;
  family_id: string | null;
  families: { id: string; family_name: string } | null;
};

type FamilyGroup = {
  key: string;
  familyId: string | null;
  familyName: string;
  members: MemberFamilyRow[];
};

function memberDisplayName(m: MemberFamilyRow): string {
  const mid = m.middle_name?.trim();
  return [m.first_name, mid, m.last_name].filter(Boolean).join(' ');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildMembersByFamilyCsv(rows: MemberFamilyRow[]): string {
  const headers = ['Family name', 'Last name', 'First name', 'Middle name', 'Member number', 'Status'];
  const csvData = rows.map((m) => {
    const fam = m.families?.family_name?.trim() || (m.family_id ? 'Unknown family' : 'No family assigned');
    return [fam, m.last_name, m.first_name, m.middle_name || '', m.member_number, m.status];
  });
  const csv = [headers, ...csvData]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  return csv;
}

function buildGroupedRosterHtml(title: string, groups: FamilyGroup[]): string {
  const blocks = groups
    .map(
      (g) => `
    <section class="family-block">
      <h2>${escapeHtml(g.familyName)} <span class="count">(${g.members.length})</span></h2>
      <table>
        <thead><tr><th>Name</th><th>Member #</th><th>Status</th></tr></thead>
        <tbody>
          ${g.members
            .map(
              (m) =>
                `<tr><td>${escapeHtml(memberDisplayName(m))}</td><td>${escapeHtml(m.member_number || '')}</td><td>${escapeHtml(m.status || '')}</td></tr>`
            )
            .join('')}
        </tbody>
      </table>
    </section>`
    )
    .join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 24px; color: #111; }
    h1 { font-size: 1.35rem; margin-bottom: 8px; }
    .meta { color: #555; font-size: 0.9rem; margin-bottom: 24px; }
    .family-block { margin-bottom: 28px; page-break-inside: avoid; }
    .family-block h2 { font-size: 1.05rem; margin: 0 0 8px 0; border-bottom: 2px solid #0d9488; padding-bottom: 4px; }
    .count { font-weight: normal; color: #666; font-size: 0.95rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
    th { background: #f8fafc; }
    @media print { body { margin: 12mm; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">Generated ${escapeHtml(new Date().toLocaleString())}</p>
  ${blocks}
</body>
</html>`;
}

const Reports: React.FC = () => {
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [tab, setTab] = useState<'summary' | 'members' | 'attendance' | 'offertory' | 'visitors' | 'families'>('summary');
  const [expandedFamilyIds, setExpandedFamilyIds] = useState<Set<string>>(() => new Set());
  const rangeKey = `${from}|${to}`;
  const queryClient = useQueryClient();

  const { data, isPending: loading, isError, error: queryError } = useQuery({
    queryKey: queryKeys.admin.reports(rangeKey),
    queryFn: async () => {
      const start = from ? new Date(from).toISOString() : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const end = to ? new Date(new Date(to).getTime() + 86400000 - 1).toISOString() : new Date().toISOString();

      const [
        { count: membersCount }, 
        { count: activeCount }, 
        { count: visitorsCount }, 
        { data: offertoryData }, 
        { count: attendanceCount }
      ] = await Promise.all([
        supabase.from('members').select('*', { count: 'exact', head: true }),
        supabase.from('members').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('visitors').select('*', { count: 'exact', head: true }).gte('visit_date', start).lte('visit_date', end),
        supabase.from('cash_offering_accounts').select('total').gte('service_date', start).lte('service_date', end),
        supabase.from('attendance').select('*', { count: 'exact', head: true }).gte('attendance_date', start).lte('attendance_date', end),
      ]);

      const sum = (arr: any[] | null | undefined) => (arr || []).reduce((s, a: any) => s + Number(a.total || 0), 0);

      const kpi: KPI = {
        members: membersCount || 0,
        activeMembers: activeCount || 0,
        visitorsThisMonth: visitorsCount || 0,
        offeringsThisMonth: sum(offertoryData),
        attendanceThisMonth: attendanceCount || 0,
      };

      const [
        membersRows,
        attendanceRows,
        visitorRows,
        offeringsRows,
        sabbathOfferingsRows,
        familiesRows,
        sabbathVisitorsRows,
        membersForFamilyRows,
      ] = await Promise.all([
        supabase.from('members').select('id, first_name, last_name, status, created_at').order('created_at', { ascending: false }).limit(25),
        supabase.from('attendance').select('id, attendance_date').order('attendance_date', { ascending: false }).limit(25),
        supabase.from('visitors').select('id, full_name, visit_date').order('visit_date', { ascending: false }).limit(25),
        supabase.from('offerings').select('id, amount, offering_date').gte('offering_date', start).lte('offering_date', end).order('offering_date', { ascending: false }).limit(25),
        supabase.from('cash_offering_accounts').select('service_date, total').gte('service_date', start).lte('service_date', end).order('service_date', { ascending: true }),
        supabase
          .from('families')
          .select('id, family_name, created_at, members(count)')
          .order('family_name', { ascending: true }),
        supabase.from('visitors').select('visit_date').gte('visit_date', start).lte('visit_date', end).order('visit_date', { ascending: true }),
        // Load members without embedding families (same pattern as Members list). Nested
        // `families(...)` selects can return empty rows while `families.members(count)` still works.
        supabase
          .from('members')
          .select('id, first_name, middle_name, last_name, status, member_number, family_id'),
      ]);

      const membersList = membersRows.data || [];
      const attendanceList = attendanceRows.data || [];
      const visitorsList = visitorRows.data || [];
      const offeringsList = offeringsRows.data || [];
      const sabbathOfferings = sabbathOfferingsRows.data || [];
      const sabbathVisitors = sabbathVisitorsRows.data || [];
      if (familiesRows.error) throw familiesRows.error;
      if (membersForFamilyRows.error) throw membersForFamilyRows.error;

      const familiesList = (familiesRows.data || []).map((row: { id: string; family_name: string; created_at: string; members?: { count: number }[] }) => ({
        id: row.id,
        family_name: row.family_name,
        created_at: row.created_at,
        memberCount: row.members?.[0]?.count ?? 0,
      }));

      const familyNameById = new Map<string, string>(
        (familiesRows.data || []).map((r: { id: string; family_name: string }) => [r.id, r.family_name || ''])
      );

      const rawMembers: MemberFamilyRow[] = (membersForFamilyRows.data || []).map((m: Record<string, unknown>) => {
        const familyId = (m.family_id as string | null) ?? null;
        const nameFromDb = familyId ? familyNameById.get(familyId) : undefined;
        return {
          id: m.id as string,
          first_name: (m.first_name as string) || '',
          middle_name: (m.middle_name as string | null) ?? null,
          last_name: (m.last_name as string) || '',
          status: String(m.status ?? ''),
          member_number: String(m.member_number ?? ''),
          family_id: familyId,
          families: familyId
            ? { id: familyId, family_name: (nameFromDb && nameFromDb.trim()) || 'Unknown family' }
            : null,
        };
      });
      const familySortName = (m: MemberFamilyRow) =>
        (m.families?.family_name || '').trim() || (m.family_id ? 'Unknown family' : 'No family assigned');
      const membersWithFamily = [...rawMembers].sort((a, b) => {
        const fa = familySortName(a);
        const fb = familySortName(b);
        if (fa !== fb) return fa.localeCompare(fb, undefined, { sensitivity: 'base' });
        const ln = a.last_name.localeCompare(b.last_name, undefined, { sensitivity: 'base' });
        if (ln !== 0) return ln;
        return a.first_name.localeCompare(b.first_name, undefined, { sensitivity: 'base' });
      });

      return {
        kpi,
        membersList,
        attendanceList,
        visitorsList,
        familiesList,
        membersWithFamily,
        offeringsList,
        sabbathOfferings,
        sabbathVisitors,
      };
    },
  });

  const kpi = data?.kpi ?? null;
  const membersList = data?.membersList ?? [];
  const attendanceList = data?.attendanceList ?? [];
  const visitorsList = data?.visitorsList ?? [];
  const familiesList = data?.familiesList ?? [];
  const membersWithFamily = data?.membersWithFamily ?? [];
  const sabbathOfferings = data?.sabbathOfferings ?? [];
  const sabbathVisitors = data?.sabbathVisitors ?? [];
  const error = isError && queryError ? (queryError as Error).message : null;

  const groupedByFamily = useMemo((): FamilyGroup[] => {
    const byKey = new Map<string, FamilyGroup>();
    for (const m of membersWithFamily) {
      const key = m.family_id ?? '__none__';
      const familyName =
        m.families?.family_name?.trim() || (m.family_id ? 'Unknown family' : 'No family assigned');
      if (!byKey.has(key)) {
        byKey.set(key, { key, familyId: m.family_id, familyName, members: [] });
      }
      byKey.get(key)!.members.push(m);
    }
    for (const g of byKey.values()) {
      g.members.sort((a, b) => {
        const ln = a.last_name.localeCompare(b.last_name, undefined, { sensitivity: 'base' });
        if (ln !== 0) return ln;
        return a.first_name.localeCompare(b.first_name, undefined, { sensitivity: 'base' });
      });
    }
    return [...byKey.values()].sort((a, b) =>
      a.familyName.localeCompare(b.familyName, undefined, { sensitivity: 'base' })
    );
  }, [membersWithFamily]);

  const toggleFamilyExpand = (familyId: string) => {
    setExpandedFamilyIds((prev) => {
      const next = new Set(prev);
      if (next.has(familyId)) next.delete(familyId);
      else next.add(familyId);
      return next;
    });
  };

  const downloadMembersByFamilyCsv = () => {
    const csv = buildMembersByFamilyCsv(membersWithFamily);
    const stamp = new Date().toISOString().split('T')[0];
    downloadBlob(`members-by-family_${stamp}.csv`, new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }));
  };

  const downloadGroupedRosterHtml = () => {
    const html = buildGroupedRosterHtml('Members by family', groupedByFamily);
    const stamp = new Date().toISOString().split('T')[0];
    downloadBlob(`members-by-family-roster_${stamp}.html`, new Blob([html], { type: 'text/html;charset=utf-8;' }));
  };

  useEffect(() => {
    const inv = () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
    };
    const channel = supabase
      .channel('reports_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, inv)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitors' }, inv)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tithes' }, inv)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offerings' }, inv)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, inv)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'families' }, inv)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const currency = (n: number) => new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(n || 0);

  // Chart data for Sabbath offerings grouped by month
  const chartData = useMemo(() => {
    if (sabbathOfferings.length === 0) {
      return {
        labels: [],
        datasets: [{
          label: 'Monthly Sabbath Offertory',
          data: [],
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.1
        }]
      };
    }

    // Group offerings by month
    const monthlyData = sabbathOfferings.reduce((acc, item) => {
      const date = new Date(item.service_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
      });
      
      if (!acc[monthKey]) {
        acc[monthKey] = {
          label: monthLabel,
          total: 0,
          sabbathCount: 0,
          sabbathDays: []
        };
      }
      
      acc[monthKey].total += Number(item.total || 0);
      acc[monthKey].sabbathCount += 1;
      acc[monthKey].sabbathDays.push({
        date: date.toLocaleDateString('en-US', { day: 'numeric' }),
        amount: Number(item.total || 0)
      });
      
      return acc;
    }, {} as Record<string, { label: string; total: number; sabbathCount: number; sabbathDays: Array<{ date: string; amount: number }> }>);

    // Sort by month key and create chart data
    const sortedMonths = Object.keys(monthlyData).sort();
    const labels = sortedMonths.map(key => monthlyData[key].label);
    const data = sortedMonths.map(key => monthlyData[key].total);

    return {
      labels,
      datasets: [{
        label: 'Monthly Sabbath Offertory (USh)',
        data,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.1,
        fill: true,
        pointRadius: 6,
        pointHoverRadius: 8
      }]
    };
  }, [sabbathOfferings]);

  // Chart data for Sabbath visitors grouped by month
  const visitorsChartData = useMemo(() => {
    if (sabbathVisitors.length === 0) {
      return {
        labels: [],
        datasets: [{
          label: 'Monthly Sabbath Visitors',
          data: [],
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.1
        }]
      };
    }

    // Group visitors by month
    const monthlyData = sabbathVisitors.reduce((acc, visitor) => {
      const date = new Date(visitor.visit_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
      });
      
      if (!acc[monthKey]) {
        acc[monthKey] = {
          label: monthLabel,
          total: 0,
          sabbathCount: 0,
          sabbathDays: []
        };
      }
      
      acc[monthKey].total += 1;
      acc[monthKey].sabbathCount += 1;
      acc[monthKey].sabbathDays.push({
        date: date.toLocaleDateString('en-US', { day: 'numeric' }),
        count: 1
      });
      
      return acc;
    }, {} as Record<string, { label: string; total: number; sabbathCount: number; sabbathDays: Array<{ date: string; count: number }> }>);

    // Sort by month key and create chart data
    const sortedMonths = Object.keys(monthlyData).sort();
    const labels = sortedMonths.map(key => monthlyData[key].label);
    const data = sortedMonths.map(key => monthlyData[key].total);

    return {
      labels,
      datasets: [{
        label: 'Monthly Sabbath Visitors',
        data,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.1,
        fill: true,
        pointRadius: 6,
        pointHoverRadius: 8
      }]
    };
  }, [sabbathVisitors]);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Monthly Sabbath Offertory Trends',
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const monthData = sabbathOfferings.reduce((acc, item) => {
              const date = new Date(item.service_date);
              const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
              const monthLabel = date.toLocaleDateString('en-US', { 
                month: 'short', 
                year: 'numeric' 
              });
              
              if (!acc[monthKey]) {
                acc[monthKey] = {
                  label: monthLabel,
                  total: 0,
                  sabbathCount: 0,
                  sabbathDays: []
                };
              }
              
              acc[monthKey].total += Number(item.total || 0);
              acc[monthKey].sabbathCount += 1;
              acc[monthKey].sabbathDays.push({
                date: date.toLocaleDateString('en-US', { day: 'numeric' }),
                amount: Number(item.total || 0)
              });
              
              return acc;
            }, {} as Record<string, { label: string; total: number; sabbathCount: number; sabbathDays: Array<{ date: string; amount: number }> }>);

            const sortedMonths = Object.keys(monthData).sort();
            const currentMonth = monthData[sortedMonths[context.dataIndex]];
            
            if (currentMonth) {
              const sabbathDetails = currentMonth.sabbathDays
                .map(day => `${day.date}: ${currency(day.amount)}`)
                .join('\n');
              
              return [
                `Total: ${currency(context.parsed.y)}`,
                `Sabbath Services: ${currentMonth.sabbathCount}`,
                `Breakdown:`,
                ...sabbathDetails.split('\n')
              ];
            }
            
            return `Monthly Total: ${currency(context.parsed.y)}`;
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Months'
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Amount (USh)'
        },
        ticks: {
          callback: function(value: any) {
            return currency(value);
          }
        }
      }
    },
  };

  const visitorsChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Monthly Sabbath Visitor Trends',
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const monthData = sabbathVisitors.reduce((acc, visitor) => {
              const date = new Date(visitor.visit_date);
              const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
              const monthLabel = date.toLocaleDateString('en-US', { 
                month: 'short', 
                year: 'numeric' 
              });
              
              if (!acc[monthKey]) {
                acc[monthKey] = {
                  label: monthLabel,
                  total: 0,
                  sabbathCount: 0,
                  sabbathDays: []
                };
              }
              
              acc[monthKey].total += 1;
              acc[monthKey].sabbathCount += 1;
              acc[monthKey].sabbathDays.push({
                date: date.toLocaleDateString('en-US', { day: 'numeric' }),
                count: 1
              });
              
              return acc;
            }, {} as Record<string, { label: string; total: number; sabbathCount: number; sabbathDays: Array<{ date: string; count: number }> }>);

            const sortedMonths = Object.keys(monthData).sort();
            const currentMonth = monthData[sortedMonths[context.dataIndex]];
            
            if (currentMonth) {
              const sabbathDetails = currentMonth.sabbathDays
                .map(day => `${day.date}: ${day.count} visitor${day.count !== 1 ? 's' : ''}`)
                .join('\n');
              
              return [
                `Total Visitors: ${context.parsed.y}`,
                `Sabbath Services: ${currentMonth.sabbathCount}`,
                `Breakdown:`,
                ...sabbathDetails.split('\n')
              ];
            }
            
            return `Monthly Total: ${context.parsed.y} visitors`;
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Months'
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Visitors'
        },
        ticks: {
          stepSize: 1
        }
      }
    },
  };

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
            {(['summary','members','attendance','offertory','visitors','families'] as const).map((t) => (
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
                <div className="text-xs text-gray-500">Offertory (range)</div>
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

          {tab === 'offertory' && (
            <div className="space-y-6">
              {/* Chart Section */}
              <div className="bg-white border rounded-lg p-4">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Monthly Sabbath Offertory Trends</h3>
                  <p className="text-sm text-gray-600">Monthly collection trends showing increase/decrease patterns</p>
                </div>
                <div className="h-80">
                  {sabbathOfferings.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <div className="text-4xl mb-2">📊</div>
                        <p>No monthly Sabbath offering data available</p>
                        <p className="text-sm">Monthly trends will appear here once offerings are recorded</p>
                      </div>
                    </div>
                  ) : (
                    <Line data={chartData} options={chartOptions} />
                  )}
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border rounded-lg p-4">
                  <div className="text-xs text-gray-500">Total Sabbath Offerings</div>
                  <div className="text-2xl font-semibold">
                    {currency(sabbathOfferings.reduce((sum, item) => sum + Number(item.total || 0), 0))}
                  </div>
                  <div className="text-sm text-gray-600">{sabbathOfferings.length} Sabbath{'\u00A0'}services</div>
                </div>
                <div className="bg-white border rounded-lg p-4">
                  <div className="text-xs text-gray-500">Average per Sabbath</div>
                  <div className="text-2xl font-semibold">
                    {sabbathOfferings.length > 0 
                      ? currency(sabbathOfferings.reduce((sum, item) => sum + Number(item.total || 0), 0) / sabbathOfferings.length)
                      : currency(0)
                    }
                  </div>
                  <div className="text-sm text-gray-600">Per service average</div>
                </div>
                <div className="bg-white border rounded-lg p-4">
                  <div className="text-xs text-gray-500">Highest Sabbath</div>
                  <div className="text-2xl font-semibold">
                    {sabbathOfferings.length > 0 
                      ? currency(Math.max(...sabbathOfferings.map(item => Number(item.total || 0))))
                      : currency(0)
                    }
                  </div>
                  <div className="text-sm text-gray-600">Peak collection</div>
                </div>
              </div>

            </div>
          )}

          {tab === 'visitors' && (
            <div className="space-y-6">
              {/* Chart Section */}
              <div className="bg-white border rounded-lg p-4">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Monthly Sabbath Visitor Trends</h3>
                  <p className="text-sm text-gray-600">Monthly visitor trends showing increase/decrease patterns</p>
                </div>
                <div className="h-80">
                  {sabbathVisitors.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <div className="text-4xl mb-2">👥</div>
                        <p>No monthly Sabbath visitor data available</p>
                        <p className="text-sm">Monthly trends will appear here once visitors are recorded</p>
                      </div>
                    </div>
                  ) : (
                    <Line data={visitorsChartData} options={visitorsChartOptions} />
                  )}
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border rounded-lg p-4">
                  <div className="text-xs text-gray-500">Total Sabbath Visitors</div>
                  <div className="text-2xl font-semibold">
                    {sabbathVisitors.length}
                  </div>
                  <div className="text-sm text-gray-600">Total visitors recorded</div>
                </div>
                <div className="bg-white border rounded-lg p-4">
                  <div className="text-xs text-gray-500">Average per Month</div>
                  <div className="text-2xl font-semibold">
                    {sabbathVisitors.length > 0 
                      ? Math.round(sabbathVisitors.length / Math.max(1, new Set(sabbathVisitors.map(v => {
                          const date = new Date(v.visit_date);
                          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                        })).size))
                      : 0
                    }
                  </div>
                  <div className="text-sm text-gray-600">Per month average</div>
                </div>
                <div className="bg-white border rounded-lg p-4">
                  <div className="text-xs text-gray-500">Peak Month</div>
                  <div className="text-2xl font-semibold">
                    {sabbathVisitors.length > 0 
                      ? (() => {
                          const monthlyData = sabbathVisitors.reduce((acc, visitor) => {
                            const date = new Date(visitor.visit_date);
                            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                            const monthLabel = date.toLocaleDateString('en-US', { 
                              month: 'short', 
                              year: 'numeric' 
                            });
                            
                            if (!acc[monthKey]) {
                              acc[monthKey] = { label: monthLabel, total: 0 };
                            }
                            
                            acc[monthKey].total += 1;
                            return acc;
                          }, {} as Record<string, { label: string; total: number }>);

                          const sortedMonths = Object.keys(monthlyData).sort();
                          const peakMonth = monthlyData[sortedMonths.reduce((max, key) => 
                            monthlyData[key].total > monthlyData[max].total ? key : max, sortedMonths[0]
                          )];
                          
                          return peakMonth ? peakMonth.total : 0;
                        })()
                      : 0
                    }
                  </div>
                  <div className="text-sm text-gray-600">Highest month</div>
                </div>
              </div>

              {/* Detailed Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 text-sm font-semibold">Recent Visitors</div>
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2 border-b">Visitor</th>
                      <th className="text-left p-2 border-b">Visit Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitorsList.length === 0 ? (
                      <tr><td className="p-2 text-gray-600" colSpan={2}>No visitors in range</td></tr>
                    ) : visitorsList.map((v) => (
                      <tr key={v.id} className="odd:bg-white even:bg-gray-50">
                        <td className="p-2 border-b font-medium">{v.full_name}</td>
                        <td className="p-2 border-b text-gray-600">{new Date(v.visit_date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'families' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-gray-600">
                  Expand a family to see its members. Use the flat list for all members sorted by family, or the grouped
                  preview for an at-a-glance directory. CSV and HTML support download and printing from your browser.
                </p>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={downloadMembersByFamilyCsv}
                    disabled={membersWithFamily.length === 0}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    CSV (by family)
                  </button>
                  <button
                    type="button"
                    onClick={downloadGroupedRosterHtml}
                    disabled={groupedByFamily.length === 0}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4" />
                    HTML roster
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Families</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="w-10 p-2 border-b" aria-label="Expand" />
                        <th className="text-left p-2 border-b">Family name</th>
                        <th className="text-left p-2 border-b">Members</th>
                        <th className="text-left p-2 border-b">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {familiesList.length === 0 ? (
                        <tr>
                          <td className="p-2 text-gray-600" colSpan={4}>
                            No families found.
                          </td>
                        </tr>
                      ) : (
                        familiesList.map((f) => {
                          const open = expandedFamilyIds.has(f.id);
                          const inFamily = membersWithFamily.filter((m) => m.family_id === f.id);
                          return (
                            <React.Fragment key={f.id}>
                              <tr className="odd:bg-white even:bg-gray-50">
                                <td className="p-2 border-b align-top">
                                  <button
                                    type="button"
                                    onClick={() => toggleFamilyExpand(f.id)}
                                    className="p-1 rounded text-gray-600 hover:bg-gray-100"
                                    aria-expanded={open}
                                    aria-label={open ? 'Hide members' : 'Show members'}
                                  >
                                    {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                  </button>
                                </td>
                                <td className="p-2 border-b font-medium">{f.family_name || '—'}</td>
                                <td className="p-2 border-b text-gray-700 tabular-nums">{f.memberCount}</td>
                                <td className="p-2 border-b text-gray-600">
                                  {f.created_at ? new Date(f.created_at).toLocaleDateString() : '—'}
                                </td>
                              </tr>
                              {open && (
                                <tr className="bg-slate-50">
                                  <td colSpan={4} className="p-3 border-b">
                                    {inFamily.length === 0 ? (
                                      <p className="text-sm text-gray-500">No members linked to this family.</p>
                                    ) : (
                                      <table className="min-w-full text-sm border border-gray-200 rounded bg-white">
                                        <thead className="bg-gray-100">
                                          <tr>
                                            <th className="text-left p-2 border-b">Name</th>
                                            <th className="text-left p-2 border-b">Member #</th>
                                            <th className="text-left p-2 border-b">Status</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {inFamily.map((m) => (
                                            <tr key={m.id}>
                                              <td className="p-2 border-b">{memberDisplayName(m)}</td>
                                              <td className="p-2 border-b text-gray-600">{m.member_number}</td>
                                              <td className="p-2 border-b text-gray-600">{m.status}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">All members sorted by family</h3>
                <div className="border rounded-lg overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-2 border-b">Family</th>
                        <th className="text-left p-2 border-b">Name</th>
                        <th className="text-left p-2 border-b">Member #</th>
                        <th className="text-left p-2 border-b">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {membersWithFamily.length === 0 ? (
                        <tr>
                          <td className="p-2 text-gray-600" colSpan={4}>
                            No members loaded.
                          </td>
                        </tr>
                      ) : (
                        membersWithFamily.map((m) => (
                          <tr key={m.id} className="odd:bg-white even:bg-gray-50">
                            <td className="p-2 border-b text-gray-800">
                              {m.families?.family_name?.trim() ||
                                (m.family_id ? 'Unknown family' : 'No family assigned')}
                            </td>
                            <td className="p-2 border-b font-medium">{memberDisplayName(m)}</td>
                            <td className="p-2 border-b text-gray-600">{m.member_number}</td>
                            <td className="p-2 border-b text-gray-600">{m.status}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Grouped preview</h3>
                <div className="border rounded-lg p-4 bg-slate-50/80 space-y-6 max-h-[480px] overflow-y-auto">
                  {groupedByFamily.length === 0 ? (
                    <p className="text-sm text-gray-500">No members to display.</p>
                  ) : (
                    groupedByFamily.map((g) => (
                      <div key={g.key} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <h4 className="text-sm font-semibold text-primary border-b border-teal-100 pb-2 mb-2">
                          {g.familyName}{' '}
                          <span className="font-normal text-gray-500">({g.members.length})</span>
                        </h4>
                        <ul className="text-sm text-gray-800 space-y-1">
                          {g.members.map((m) => (
                            <li key={m.id} className="flex flex-wrap gap-x-2 gap-y-0.5">
                              <span>{memberDisplayName(m)}</span>
                              <span className="text-gray-500">· {m.member_number}</span>
                              <span className="text-gray-400">· {m.status}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;













