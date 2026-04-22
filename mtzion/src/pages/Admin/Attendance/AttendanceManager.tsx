import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { 
  Users, 
  Calendar, 
  QrCode, 
  CheckCircle, 
  Clock, 
  Download,
  Filter,
  Search,
  RefreshCw,
  Eye,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Printer,
  FileText,
  X
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

/** PostgREST returns many-to-one embeds as an object; older code assumed an array. */
function unwrapEmbedded<T>(data: T | T[] | null | undefined): T | null {
  if (data == null) return null;
  return Array.isArray(data) ? (data[0] ?? null) : data;
}

interface AttendanceRecord {
  id: string;
  member_id: string;
  event_id?: string;
  attendance_date: string;
  attendance_type: 'service' | 'sabbath_school' | 'prayer_meeting' | 'event' | 'multi_member';
  check_in_time: string;
  qr_scanned: boolean;
  created_at: string;
  member?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    member_number?: string;
    membership_date?: string;
    occupation?: string;
    address?: string;
  } | null;
  event?: {
    id: string;
    title: string;
    event_date: string;
    location?: string;
  } | null;
}

interface AttendanceStats {
  totalAttendees: number;
  qrScannedCount: number;
  manualCheckInCount: number;
  todayAttendees: number;
  thisWeekAttendees: number;
  thisMonthAttendees: number;
  attendanceRate: number;
  multiMemberCount: number;
  totalIndividualMembers: number;
  averageWeeklyAttendance: number;
  growthRate: number;
}

interface EventAttendance {
  event_id: string;
  event_title: string;
  event_date: string;
  count: number;
  qr_count: number;
  manual_count: number;
}

const AttendanceManager: React.FC = () => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [eventAttendance, setEventAttendance] = useState<EventAttendance[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEventDetails, setSelectedEventDetails] = useState<EventAttendance | null>(null);
  const [stats, setStats] = useState<AttendanceStats>({
    totalAttendees: 0,
    qrScannedCount: 0,
    manualCheckInCount: 0,
    todayAttendees: 0,
    thisWeekAttendees: 0,
    thisMonthAttendees: 0,
    attendanceRate: 0,
    multiMemberCount: 0,
    totalIndividualMembers: 0,
    averageWeeklyAttendance: 0,
    growthRate: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('all');
  const [trendData, setTrendData] = useState<any[]>([]);
  const [typeDistribution, setTypeDistribution] = useState<any[]>([]);

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // Real-time subscription
  useEffect(() => {
    loadAttendanceData();
    
    // Subscribe to real-time changes
    const channel = supabase
      .channel('attendance-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance' },
        (payload) => {
          console.log('Real-time update:', payload);
          loadAttendanceData(); // Refresh data on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterType, filterDate, selectedEvent]);

  const loadAttendanceData = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('attendance')
        .select(`
          id,
          member_id,
          event_id,
          attendance_date,
          attendance_type,
          check_in_time,
          qr_scanned,
          created_at,
          member:members(
            id,
            first_name,
            last_name,
            email,
            phone,
            member_number,
            membership_date,
            occupation,
            address
          ),
          event:events(id, title, event_date, location)
        `)
        .order('check_in_time', { ascending: false });

      if (filterType !== 'all') {
        query = query.eq('attendance_type', filterType);
      }

      if (selectedEvent !== 'all') {
        query = query.eq('event_id', selectedEvent);
      }

      if (filterDate !== 'all') {
        const now = new Date();
        if (filterDate === 'today') {
          const today = now.toISOString().split('T')[0];
          query = query.eq('attendance_date', today);
        } else if (filterDate === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          query = query.gte('attendance_date', weekAgo.toISOString().split('T')[0]);
        } else if (filterDate === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          query = query.gte('attendance_date', monthAgo.toISOString().split('T')[0]);
        }
      }

      const { data, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;

      const transformedData = (data || []).map((record: any) => ({
        ...record,
        member: unwrapEmbedded(record.member),
        event: unwrapEmbedded(record.event),
      }));

      setAttendanceRecords(transformedData);
      await calculateStats(transformedData);
      calculateTrendData(transformedData);
      calculateTypeDistribution(transformedData);
      await loadEventAttendance();

    } catch (err: any) {
      setError(err.message || 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const loadEventAttendance = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          event_id,
          qr_scanned,
          event:events(id, title, event_date)
        `)
        .not('event_id', 'is', null);

      if (error) throw error;

      const eventMap = new Map<string, EventAttendance>();
      (data || []).forEach((record: any) => {
        const event = unwrapEmbedded(record.event);
        if (event && record.event_id) {
          if (!eventMap.has(record.event_id)) {
            eventMap.set(record.event_id, {
              event_id: record.event_id,
              event_title: event.title,
              event_date: event.event_date,
              count: 0,
              qr_count: 0,
              manual_count: 0
            });
          }
          const current = eventMap.get(record.event_id)!;
          current.count++;
          if (record.qr_scanned) {
            current.qr_count++;
          } else {
            current.manual_count++;
          }
        }
      });

      setEventAttendance(Array.from(eventMap.values()).sort((a, b) => b.count - a.count));
    } catch (err) {
      console.error('Failed to load event attendance:', err);
    }
  };

  const calculateStats = async (data: AttendanceRecord[]) => {
    const totalAttendees = data.length;
    const qrScannedCount = data.filter(r => r.qr_scanned).length;
    const manualCheckInCount = totalAttendees - qrScannedCount;
    
    const today = new Date().toISOString().split('T')[0];
    const todayAttendees = data.filter(r => r.attendance_date === today).length;
    
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const thisWeekAttendees = data.filter(r => r.attendance_date >= weekAgo).length;
    
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const thisMonthAttendees = data.filter(r => r.attendance_date >= monthAgo).length;

    // Calculate average weekly attendance (last 4 weeks)
    const weeklyData = [];
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
      const weekCount = data.filter(r => {
        const recordDate = new Date(r.attendance_date);
        return recordDate >= weekStart && recordDate < weekEnd;
      }).length;
      weeklyData.push(weekCount);
    }
    const averageWeeklyAttendance = Math.round(weeklyData.reduce((a, b) => a + b, 0) / 4) || 0;
    
    // Calculate growth rate (compare last 2 weeks)
    const lastWeek = weeklyData[0] || 0;
    const prevWeek = weeklyData[1] || 0;
    const growthRate = prevWeek > 0 ? Math.round(((lastWeek - prevWeek) / prevWeek) * 100) : 0;

    const { data: membersData } = await supabase
      .from('members')
      .select('id')
      .eq('status', 'active');
    
    const totalMembers = membersData?.length || 1;
    const attendanceRate = Math.round((thisWeekAttendees / totalMembers) * 100);

    setStats({
      totalAttendees,
      qrScannedCount,
      manualCheckInCount,
      todayAttendees,
      thisWeekAttendees,
      thisMonthAttendees,
      attendanceRate,
      multiMemberCount: 0,
      totalIndividualMembers: totalAttendees,
      averageWeeklyAttendance,
      growthRate
    });
  };

  const calculateTrendData = (data: AttendanceRecord[]) => {
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const filtered = data.filter(r => new Date(r.attendance_date) >= last30Days);
    
    const dailyMap = new Map<string, { date: string; count: number; qr: number }>();
    
    filtered.forEach(record => {
      const date = record.attendance_date;
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { date, count: 0, qr: 0 });
      }
      const entry = dailyMap.get(date)!;
      entry.count++;
      if (record.qr_scanned) entry.qr++;
    });
    
    const trendArray = Array.from(dailyMap.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(d => ({ ...d, date: new Date(d.date).toLocaleDateString() }));
    
    setTrendData(trendArray);
  };

  const calculateTypeDistribution = (data: AttendanceRecord[]) => {
    const typeMap = new Map<string, number>();
    data.forEach(record => {
      const type = record.attendance_type;
      typeMap.set(type, (typeMap.get(type) || 0) + 1);
    });
    
    const distribution = Array.from(typeMap.entries()).map(([name, value]) => ({
      name: name.replace('_', ' ').toUpperCase(),
      value
    }));
    
    setTypeDistribution(distribution);
  };

  const exportAttendanceCSV = () => {
    const headers = [
      'Date',
      'Member Name',
      'Member No',
      'Email',
      'Phone',
      'Occupation',
      'Member Since',
      'Address',
      'Event',
      'Type',
      'Check-in Time',
      'QR Scanned',
      'Location',
    ];
    const csvData = filteredRecords.map(record => [
      record.attendance_date,
      `${record.member?.first_name || ''} ${record.member?.last_name || ''}`.trim(),
      record.member?.member_number || '',
      record.member?.email || '',
      record.member?.phone || '',
      record.member?.occupation || '',
      record.member?.membership_date
        ? new Date(record.member.membership_date).toLocaleDateString()
        : '',
      record.member?.address || '',
      record.event?.title || 'General Service',
      record.attendance_type,
      new Date(record.check_in_time).toLocaleString(),
      record.qr_scanned ? 'Yes' : 'No',
      record.event?.location || 'Main Sanctuary',
    ]);

    const csv = [headers, ...csvData].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredRecords = attendanceRecords.filter(record => {
    if (!searchQuery.trim()) return true;
    const searchTerm = searchQuery.toLowerCase();
    return (
      record.member?.first_name?.toLowerCase().includes(searchTerm) ||
      record.member?.last_name?.toLowerCase().includes(searchTerm) ||
      record.member?.email?.toLowerCase().includes(searchTerm) ||
      record.member?.member_number?.toLowerCase().includes(searchTerm) ||
      record.member?.occupation?.toLowerCase().includes(searchTerm) ||
      record.event?.title?.toLowerCase().includes(searchTerm)
    );
  });

  const getAttendanceTypeColor = (type: string) => {
    switch (type) {
      case 'service': return 'bg-blue-100 text-blue-800';
      case 'sabbath_school': return 'bg-green-100 text-green-800';
      case 'prayer_meeting': return 'bg-purple-100 text-purple-800';
      case 'event': return 'bg-orange-100 text-orange-800';
      case 'multi_member': return 'bg-teal-100 text-teal-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
            <p className="text-gray-600">Real-time tracking with QR code check-ins</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => loadAttendanceData()} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button onClick={exportAttendanceCSV} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards with Growth Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Attendees</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalAttendees}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">QR Scanned</p>
              <p className="text-2xl font-bold text-green-600">{stats.qrScannedCount}</p>
            </div>
            <QrCode className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Weekly</p>
              <p className="text-2xl font-bold text-indigo-600">{stats.averageWeeklyAttendance}</p>
            </div>
            <div className={`flex items-center gap-1 text-sm ${stats.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.growthRate >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {Math.abs(stats.growthRate)}%
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
              <p className="text-2xl font-bold text-purple-600">{stats.attendanceRate}%</p>
            </div>
            <BarChart3 className="w-8 h-8 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Week</p>
              <p className="text-2xl font-bold text-orange-600">{stats.thisWeekAttendees}</p>
            </div>
            <Calendar className="w-8 h-8 text-orange-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-cyan-600">{stats.thisMonthAttendees}</p>
            </div>
            <Eye className="w-8 h-8 text-cyan-600" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend Chart */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Attendance Trend (Last 30 Days)</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="count" stackId="1" stroke="#0088FE" fill="#0088FE" fillOpacity={0.3} name="Total Attendance" />
                <Area type="monotone" dataKey="qr" stackId="2" stroke="#00C49F" fill="#00C49F" fillOpacity={0.3} name="QR Scans" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-72 flex items-center justify-center text-gray-500">No data available</div>
          )}
        </div>

        {/* Attendance Type Distribution */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Attendance by Type</h3>
          </div>
          {typeDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={typeDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {typeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-72 flex items-center justify-center text-gray-500">No data available</div>
          )}
        </div>
      </div>

      {/* Event Attendance Cards */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-gray-800">Event Attendance Summary</h3>
            </div>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="border rounded-md px-3 py-1 text-sm"
            >
              <option value="all">All Events</option>
              {eventAttendance.map(event => (
                <option key={event.event_id} value={event.event_id}>{event.event_title}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {eventAttendance.slice(0, 6).map(event => (
              <div
                key={event.event_id}
                onClick={() => {
                  setSelectedEventDetails(event);
                  setShowEventModal(true);
                }}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-800 truncate">{event.event_title}</h4>
                  <QrCode className="w-4 h-4 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 mb-3">
                  {new Date(event.event_date).toLocaleDateString()}
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{event.count}</p>
                    <p className="text-xs text-gray-500">Total Attendees</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-green-600">QR: {event.qr_count}</p>
                    <p className="text-sm text-orange-600">Manual: {event.manual_count}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {eventAttendance.length === 0 && (
            <div className="text-center py-8 text-gray-500">No event attendance data available</div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-2 text-gray-800">
            <Filter className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Filters</h3>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" />
              <input
                placeholder="Search members or events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-3 py-2 border rounded-md text-sm w-64"
              />
            </div>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="border rounded-md px-3 py-2 text-sm">
              <option value="all">All Types</option>
              <option value="service">Service</option>
              <option value="sabbath_school">Sabbath School</option>
              <option value="prayer_meeting">Prayer Meeting</option>
              <option value="event">Events</option>
            </select>
            <select value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="border rounded-md px-3 py-2 text-sm">
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800">Attendance Records</h3>
          <p className="text-sm text-gray-500">Updates in real-time when members scan QR codes</p>
        </div>

        <div className="p-4">
          {error && <div className="text-sm text-red-600 mb-4 p-3 bg-red-50 rounded-md">{error}</div>}
          {loading && <div className="text-sm text-gray-600 mb-4 p-3 bg-gray-50 rounded-md">Loading attendance records...</div>}

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 border-b font-medium">DATE</th>
                  <th className="text-left p-3 border-b font-medium">MEMBER</th>
                  <th className="text-left p-3 border-b font-medium">EVENT</th>
                  <th className="text-left p-3 border-b font-medium">TYPE</th>
                  <th className="text-left p-3 border-b font-medium">CHECK-IN TIME</th>
                  <th className="text-left p-3 border-b font-medium">METHOD</th>
                  <th className="text-left p-3 border-b font-medium">LOCATION</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">
                      {loading ? 'Loading records...' : 'No attendance records found'}
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3 border-b">{new Date(record.attendance_date).toLocaleDateString()}</td>
                      <td className="p-3 border-b max-w-[14rem] sm:max-w-xs lg:max-w-md align-top">
                        {record.member ? (
                          <>
                            <div className="font-medium text-gray-900">
                              {[record.member.first_name, record.member.last_name].filter(Boolean).join(' ') || '—'}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {[
                                record.member.member_number ? `No. ${record.member.member_number}` : null,
                                record.member.phone || null,
                                record.member.email || null,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 leading-snug">
                              {[
                                record.member.occupation || null,
                                record.member.membership_date
                                  ? `Member since ${new Date(record.member.membership_date).toLocaleDateString()}`
                                  : null,
                                record.member.address || null,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-amber-700">
                            {record.member_id ? 'Member profile not linked or hidden' : 'No member'}
                          </span>
                        )}
                       </td>
                      <td className="p-3 border-b">
                        <div className="font-medium">{record.event?.title || 'General Service'}</div>
                        {record.event?.location && <div className="text-xs text-gray-500">{record.event.location}</div>}
                       </td>
                      <td className="p-3 border-b">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAttendanceTypeColor(record.attendance_type)}`}>
                          {record.attendance_type.replace('_', ' ')}
                        </span>
                       </td>
                      <td className="p-3 border-b">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          {new Date(record.check_in_time).toLocaleTimeString()}
                        </div>
                       </td>
                      <td className="p-3 border-b">
                        <div className="flex items-center gap-2">
                          {record.qr_scanned ? (
                            <><QrCode className="w-4 h-4 text-green-600" /><span className="text-green-600 font-medium">QR Scan</span></>
                          ) : (
                            <><CheckCircle className="w-4 h-4 text-orange-600" /><span className="text-orange-600 font-medium">Manual</span></>
                          )}
                        </div>
                       </td>
                      <td className="p-3 border-b text-gray-600">{record.event?.location || 'Main Sanctuary'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <div>Showing {filteredRecords.length} of {attendanceRecords.length} records</div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Last updated: {new Date().toLocaleTimeString()}</span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-600">Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Event Details Modal */}
      {showEventModal && selectedEventDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">{selectedEventDetails.event_title}</h3>
                <button onClick={() => setShowEventModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-600">{selectedEventDetails.count}</p>
                    <p className="text-sm text-gray-600">Total Attendees</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600">{selectedEventDetails.qr_count}</p>
                    <p className="text-sm text-gray-600">QR Scans</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-orange-600">{selectedEventDetails.manual_count}</p>
                    <p className="text-sm text-gray-600">Manual Check-ins</p>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Attendees List</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {attendanceRecords
                      .filter(r => r.event_id === selectedEventDetails.event_id)
                      .map(record => (
                        <div key={record.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium">{record.member?.first_name} {record.member?.last_name}</p>
                            <p className="text-xs text-gray-500">{record.member?.email}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">{new Date(record.check_in_time).toLocaleTimeString()}</p>
                            <span className={`text-xs ${record.qr_scanned ? 'text-green-600' : 'text-orange-600'}`}>
                              {record.qr_scanned ? 'QR Scan' : 'Manual'}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceManager;