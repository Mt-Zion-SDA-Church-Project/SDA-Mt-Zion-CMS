import React, { useEffect, useState } from 'react';
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
  BarChart3
} from 'lucide-react';

interface AttendanceRecord {
  id: string;
  member_id: string;
  event_id?: string;
  attendance_date: string;
  attendance_type: 'service' | 'sabbath_school' | 'prayer_meeting' | 'event';
  check_in_time: string;
  qr_scanned: boolean;
  created_at: string;
  member?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
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
  attendanceRate: number;
  multiMemberCount: number;
  totalIndividualMembers: number;
}

const AttendanceManager: React.FC = () => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    totalAttendees: 0,
    qrScannedCount: 0,
    manualCheckInCount: 0,
    todayAttendees: 0,
    thisWeekAttendees: 0,
    attendanceRate: 0,
    multiMemberCount: 0,
    totalIndividualMembers: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('all');

  useEffect(() => {
    loadAttendanceData();
  }, [filterType, filterDate]);

  const loadAttendanceData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Build query based on filters
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
          member:members(id, first_name, last_name, email, phone),
          event:events(id, title, event_date, location)
        `)
        .order('check_in_time', { ascending: false });

      // Apply filters
      if (filterType !== 'all') {
        query = query.eq('attendance_type', filterType);
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

      // Transform the data to handle Supabase join arrays
      const transformedData = (data || []).map((record: any) => ({
        ...record,
        member: record.member?.[0] || null,
        event: record.event?.[0] || null
      }));

      setAttendanceRecords(transformedData);

      // Calculate stats
      const totalAttendees = transformedData.length;
      const qrScannedCount = transformedData.filter(r => r.qr_scanned).length;
      const manualCheckInCount = totalAttendees - qrScannedCount;
      const multiMemberCount = 0; // Multi-member feature not implemented yet
      const totalIndividualMembers = totalAttendees;
      
      const today = new Date().toISOString().split('T')[0];
      const todayAttendees = transformedData.filter(r => r.attendance_date === today).length;
      
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const thisWeekAttendees = transformedData.filter(r => r.attendance_date >= weekAgo).length;

      // Get total members for attendance rate calculation
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
        attendanceRate,
        multiMemberCount,
        totalIndividualMembers
      });

    } catch (err: any) {
      setError(err.message || 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = attendanceRecords.filter(record => {
    if (!searchQuery.trim()) return true;
    
    const searchTerm = searchQuery.toLowerCase();
    return (
      record.member?.first_name?.toLowerCase().includes(searchTerm) ||
      record.member?.last_name?.toLowerCase().includes(searchTerm) ||
      record.member?.email?.toLowerCase().includes(searchTerm) ||
      record.event?.title?.toLowerCase().includes(searchTerm) ||
      record.attendance_type.toLowerCase().includes(searchTerm)
    );
  });

  const exportAttendanceCSV = () => {
    const headers = [
      'Date', 'Member Name', 'Email', 'Phone', 'Event', 'Type', 
      'Check-in Time', 'QR Scanned', 'Location'
    ];
    
    const csvData = filteredRecords.map(record => [
      record.attendance_date,
      `${record.member?.first_name || ''} ${record.member?.last_name || ''}`.trim(),
      record.member?.email || '',
      record.member?.phone || '',
      record.event?.title || 'General Service',
      record.attendance_type,
      new Date(record.check_in_time).toLocaleString(),
      record.qr_scanned ? 'Yes' : 'No',
      record.event?.location || 'Main Sanctuary'
    ]);

    const csv = [headers, ...csvData]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getAttendanceTypeColor = (type: string) => {
    switch (type) {
      case 'service': return 'bg-blue-100 text-blue-800';
      case 'sabbath_school': return 'bg-green-100 text-green-800';
      case 'prayer_meeting': return 'bg-purple-100 text-purple-800';
      case 'event': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
            <p className="text-gray-600">Track and manage member attendance records</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadAttendanceData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={exportAttendanceCSV}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
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
              <p className="text-sm font-medium text-gray-600">Manual Check-in</p>
              <p className="text-2xl font-bold text-orange-600">{stats.manualCheckInCount}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-orange-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today</p>
              <p className="text-2xl font-bold text-purple-600">{stats.todayAttendees}</p>
            </div>
            <Calendar className="w-8 h-8 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Week</p>
              <p className="text-2xl font-bold text-indigo-600">{stats.thisWeekAttendees}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-indigo-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Multi-Member</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.multiMemberCount}</p>
            </div>
            <Users className="w-8 h-8 text-emerald-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Individuals</p>
              <p className="text-2xl font-bold text-cyan-600">{stats.totalIndividualMembers}</p>
            </div>
            <Eye className="w-8 h-8 text-cyan-600" />
          </div>
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
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" />
              <input
                placeholder="Search members or events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-3 py-2 border rounded-md text-sm w-64"
              />
            </div>

            {/* Attendance Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All Types</option>
              <option value="service">Service</option>
              <option value="sabbath_school">Sabbath School</option>
              <option value="prayer_meeting">Prayer Meeting</option>
              <option value="event">Events</option>
            </select>

            {/* Date Filter */}
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm"
            >
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
        </div>

        <div className="p-4">
          {error && (
            <div className="text-sm text-red-600 mb-4 p-3 bg-red-50 rounded-md">
              {error}
            </div>
          )}
          
          {loading && (
            <div className="text-sm text-gray-600 mb-4 p-3 bg-gray-50 rounded-md">
              Loading attendance records...
            </div>
          )}

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
                      <td className="p-3 border-b">
                        <div className="text-sm font-medium">
                          {new Date(record.attendance_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-3 border-b">
                        <div>
                          <div className="font-medium">
                          {record.member?.first_name} {record.member?.last_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {record.member?.email}
                        </div>
                        </div>
                      </td>
                      <td className="p-3 border-b">
                        <div className="font-medium">
                          {record.event?.title || 'General Service'}
                        </div>
                        {record.event?.location && (
                          <div className="text-xs text-gray-500">
                            {record.event.location}
                          </div>
                        )}
                      </td>
                      <td className="p-3 border-b">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAttendanceTypeColor(record.attendance_type)}`}>
                          {record.attendance_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3 border-b">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <div className="text-sm">
                            {new Date(record.check_in_time).toLocaleTimeString()}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 border-b">
                        <div className="flex items-center gap-2">
                          {record.qr_scanned ? (
                            <>
                              <QrCode className="w-4 h-4 text-green-600" />
                              <span className="text-green-600 font-medium">QR Scan</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 text-orange-600" />
                              <span className="text-orange-600 font-medium">Manual</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="p-3 border-b text-gray-600">
                        {record.event?.location || 'Main Sanctuary'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <div>
              Showing {filteredRecords.length} of {attendanceRecords.length} records
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                Last updated: {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceManager;
