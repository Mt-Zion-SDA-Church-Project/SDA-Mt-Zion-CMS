import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabase';
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

const Reports: React.FC = () => {
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [tab, setTab] = useState<'summary' | 'members' | 'attendance' | 'offertory' | 'visitors' | 'ministries'>('summary');
  const [membersList, setMembersList] = useState<any[]>([]);
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [visitorsList, setVisitorsList] = useState<any[]>([]);
  const [ministriesList, setMinistriesList] = useState<any[]>([]);
  const [ministriesWithMembers, setMinistriesWithMembers] = useState<any[]>([]);
  const [offeringsList, setOfferingsList] = useState<any[]>([]);
  const [sabbathOfferings, setSabbathOfferings] = useState<any[]>([]);
  const [sabbathVisitors, setSabbathVisitors] = useState<any[]>([]);

  const fetchKpi = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
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

      setKpi({
        members: membersCount || 0,
        activeMembers: activeCount || 0,
        visitorsThisMonth: visitorsCount || 0,
        offeringsThisMonth: sum(offertoryData),
        attendanceThisMonth: attendanceCount || 0,
      });

      // Also prefetch lists for tabs
      const [membersRows, attendanceRows, visitorRows, ministryRows, offeringsRows, sabbathOfferingsRows, ministriesWithMembersRows, sabbathVisitorsRows] = await Promise.all([
        supabase.from('members').select('id, first_name, last_name, status, created_at').order('created_at', { ascending: false }).limit(25),
        supabase.from('attendance').select('id, attendance_date').order('attendance_date', { ascending: false }).limit(25),
        supabase.from('visitors').select('id, full_name, visit_date').order('visit_date', { ascending: false }).limit(25),
        supabase.from('ministries').select('id, name, description, created_at').order('created_at', { ascending: false }),
        supabase.from('offerings').select('id, amount, offering_date').gte('offering_date', start).lte('offering_date', end).order('offering_date', { ascending: false }).limit(25),
        supabase.from('cash_offering_accounts').select('service_date, total').gte('service_date', start).lte('service_date', end).order('service_date', { ascending: true }),
        supabase.from('ministries').select(`
          id, 
          name, 
          created_at,
          member_ministries(count)
        `).order('created_at', { ascending: false }),
        supabase.from('visitors').select('visit_date').gte('visit_date', start).lte('visit_date', end).order('visit_date', { ascending: true })
      ]);

      setMembersList(membersRows.data || []);
      setAttendanceList(attendanceRows.data || []);
      setVisitorsList(visitorRows.data || []);
      
      // Debug ministries data
      console.log('Ministries query result:', ministryRows);
      console.log('Ministries data:', ministryRows.data);
      console.log('Ministries error:', ministryRows.error);
      
      setMinistriesList(ministryRows.data || []);
      setOfferingsList(offeringsRows.data || []);
      setSabbathOfferings(sabbathOfferingsRows.data || []);
      setSabbathVisitors(sabbathVisitorsRows.data || []);
      
      // Process ministries with member counts and sort by member count (highest to lowest)
      const processedMinistries = (ministriesWithMembersRows.data || []).map(ministry => ({
        ...ministry,
        memberCount: ministry.member_ministries?.[0]?.count || 0
      })).sort((a, b) => b.memberCount - a.memberCount);
      
      setMinistriesWithMembers(processedMinistries);
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
            {(['summary','members','attendance','offertory','visitors','ministries'] as const).map((t) => (
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

          {tab === 'ministries' && (
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2 border-b">Ministry</th>
                    <th className="text-left p-2 border-b">Description</th>
                    <th className="text-left p-2 border-b">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {ministriesList.length === 0 ? (
                    <tr><td className="p-2 text-gray-600" colSpan={3}>No ministries found (Debug: {ministriesList.length} items)</td></tr>
                  ) : ministriesList.map((m) => (
                    <tr key={m.id} className="odd:bg-white even:bg-gray-50">
                      <td className="p-2 border-b font-medium">{m.name}</td>
                      <td className="p-2 border-b text-gray-600">{m.description || 'No description'}</td>
                      <td className="p-2 border-b text-gray-600">{m.created_at ? new Date(m.created_at).toLocaleDateString() : 'N/A'}</td>
                    </tr>
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













