import React, { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/queryKeys';
import { Calendar, Heart, Gift, Activity, ChevronDown, MapPin, Clock } from 'lucide-react';
import MemberMobileNav from '../../components/Member/MemberMobileNav';
import logo from '../../assets/sda-logo.png';

interface MemberStats {
  myTithes: number;
  myOfferings: number;
  eventsAttended: number;
  myMinistries: number;
  upcomingEvents: {
    id: string;
    name: string;
    date: string;
    time?: string;
    location?: string;
  }[];
  upcomingBirthdays: {
    id: string;
    name: string;
    date: string;
  }[];
  recentActivity: {
    action: string;
    timestamp: string;
  }[];
}

const emptyStats: MemberStats = {
  myTithes: 0,
  myOfferings: 0,
  eventsAttended: 0,
  myMinistries: 0,
  upcomingEvents: [],
  upcomingBirthdays: [],
  recentActivity: [],
};

async function fetchMemberDashboardStats(): Promise<MemberStats> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return emptyStats;

  const { data: memberData } = await supabase
    .from('members')
    .select('id, first_name, last_name')
    .eq('user_id', user.id)
    .single();

  if (!memberData) return emptyStats;

  const [
    tithesResult,
    offeringsResult,
    attendanceResult,
    ministriesResult,
    eventsResult,
    birthdaysResult,
    activityResult,
  ] = await Promise.allSettled([
    supabase.from('tithes').select('id, amount').eq('member_id', memberData.id),
    supabase.from('offerings').select('id, amount').eq('member_id', memberData.id),
    supabase.from('attendance').select('id').eq('member_id', memberData.id),
    supabase.from('member_ministries').select('id').eq('member_id', memberData.id),
    supabase
      .from('events')
      .select('id, title, event_date, location')
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
      .limit(5),
    supabase.from('members').select('id, first_name, last_name, date_of_birth').not('date_of_birth', 'is', null),
    supabase
      .from('activity_log')
      .select('action, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const totalTithes =
    tithesResult.status === 'fulfilled'
      ? (tithesResult.value.data || []).reduce((sum: number, tithe: { amount?: string }) => sum + (parseFloat(String(tithe.amount)) || 0), 0)
      : 0;

  const totalOfferings =
    offeringsResult.status === 'fulfilled'
      ? (offeringsResult.value.data || []).reduce((sum: number, offering: { amount?: string }) => sum + (parseFloat(String(offering.amount)) || 0), 0)
      : 0;

  const formattedEvents =
    eventsResult.status === 'fulfilled'
      ? (eventsResult.value.data || []).map((event: { id: string; title: string; event_date: string; location?: string }) => ({
          id: event.id,
          name: event.title,
          date: new Date(event.event_date).toLocaleDateString(),
          location: event.location || 'TBD',
        }))
      : [];

  const formattedBirthdays =
    birthdaysResult.status === 'fulfilled'
      ? (() => {
          const today = new Date();
          const all = (birthdaysResult.value.data || []).map((member: { id: string; first_name: string; last_name: string; date_of_birth: string }) => {
            const birthDate = new Date(member.date_of_birth);
            const thisYear = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
            const nextYear = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
            const upcomingDate = thisYear > today ? thisYear : nextYear;
            const daysUntil = Math.ceil((upcomingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return {
              id: member.id,
              name: `${member.first_name} ${member.last_name}`,
              upcomingDate,
              daysUntil,
            };
          });
          return all
            .filter((b) => b.daysUntil >= 0 && b.daysUntil <= 7)
            .sort((a, b) => a.daysUntil - b.daysUntil)
            .slice(0, 5)
            .map((b) => ({
              id: b.id,
              name: b.name,
              date: b.upcomingDate.toLocaleDateString(),
            }));
        })()
      : [];

  const formattedActivity =
    activityResult.status === 'fulfilled'
      ? (activityResult.value.data || []).map((log: { action: string; created_at: string }) => ({
          action: log.action,
          timestamp: new Date(log.created_at).toLocaleDateString(),
        }))
      : [];

  const mockActivity = [
    { action: 'Completed tithe payment', timestamp: 'Today' },
    { action: 'Attended Sabbath School', timestamp: 'Yesterday' },
  ];

  return {
    myTithes: totalTithes,
    myOfferings: totalOfferings,
    eventsAttended: attendanceResult.status === 'fulfilled' ? attendanceResult.value.data?.length || 0 : 0,
    myMinistries: ministriesResult.status === 'fulfilled' ? ministriesResult.value.data?.length || 0 : 0,
    upcomingEvents: formattedEvents,
    upcomingBirthdays: formattedBirthdays.slice(0, 5),
    recentActivity: [...formattedActivity, ...mockActivity].slice(0, 3),
  };
}

const MemberDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const [showEventsDropdown, setShowEventsDropdown] = React.useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const dashboardQuery = useQuery({
    queryKey: queryKeys.memberPortal.dashboardMe(),
    queryFn: async () => {
      try {
        return await fetchMemberDashboardStats();
      } catch (error) {
        console.error('Error loading member dashboard data:', error);
        return emptyStats;
      }
    },
  });

  const stats = dashboardQuery.data ?? emptyStats;
  const loading = dashboardQuery.isLoading;

  useEffect(() => {
    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.memberPortal.dashboardMe() });
    };

    const membersChannel = supabase
      .channel('member-dashboard-members')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, invalidate)
      .subscribe();

    const eventsChannel = supabase
      .channel('member-dashboard-events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, invalidate)
      .subscribe();

    const attendanceChannel = supabase
      .channel('member-dashboard-attendance')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, invalidate)
      .subscribe();

    const tithesChannel = supabase
      .channel('member-dashboard-tithes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tithes' }, invalidate)
      .subscribe();

    const offeringsChannel = supabase
      .channel('member-dashboard-offerings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offerings' }, invalidate)
      .subscribe();

    return () => {
      supabase.removeChannel(membersChannel);
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(attendanceChannel);
      supabase.removeChannel(tithesChannel);
      supabase.removeChannel(offeringsChannel);
    };
  }, [queryClient]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowEventsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const formatCurrency = (amount: number) => {
    const formatted = new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0,
    }).format(amount);
    return formatted.replace('UGX', 'USh');
  };

  const memberStats = [
    {
      name: 'My Offerings',
      value: formatCurrency(stats.myOfferings),
      icon: Gift,
      color: 'bg-green-500',
    },
    {
      name: 'Events Attended',
      value: `${stats.eventsAttended}`,
      icon: Calendar,
      color: 'bg-blue-500',
    },
    {
      name: 'Birthdays',
      value: `${stats.upcomingBirthdays.length}`,
      icon: Heart,
      color: 'bg-purple-500',
    },
    {
      name: 'Activities',
      value: `${stats.recentActivity.length}`,
      icon: Activity,
      color: 'bg-orange-500',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <MemberMobileNav title="My Dashboard" />

        <div className="hidden lg:block mb-8">
          <div className="flex items-center gap-4 mb-4">
            <img src={logo} alt="SDA Mt. Zion Logo" className="w-16 h-16 object-contain" />
            <div>
              <h1 className="text-3xl font-bold text-gray-800">My Dashboard</h1>
              <p className="text-gray-600">Welcome to your member portal</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-md p-4 lg:p-6 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="lg:space-y-6">
      <MemberMobileNav title="My Dashboard" />

      <div className="hidden lg:block mb-8">
        <div className="flex items-center gap-4 mb-4">
          <img src={logo} alt="SDA Mt. Zion Logo" className="w-16 h-16 object-contain" />
          <div>
            <h1 className="text-3xl font-bold text-gray-800">My Dashboard</h1>
            <p className="text-gray-600">Welcome to your member portal</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
        {memberStats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-4 lg:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <div className="text-right">
                <p className={`text-lg lg:text-xl font-bold ${stat.color.replace('bg-', 'text-')}`}>{stat.value}</p>
                <p className="text-xs lg:text-sm text-gray-600">{stat.name}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="lg:grid lg:grid-cols-3 lg:gap-6">
        <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 mb-4 lg:mb-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Upcoming Events</h3>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowEventsDropdown(!showEventsDropdown)}
                className="flex items-center gap-1 text-primary hover:text-blue-700"
              >
                <span>All Events</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showEventsDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showEventsDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                  <button
                    onClick={() => setShowEventsDropdown(false)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    All Events
                  </button>
                  <button
                    onClick={() => setShowEventsDropdown(false)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    This Week
                  </button>
                  <button
                    onClick={() => setShowEventsDropdown(false)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    This Month
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {stats.upcomingEvents.length > 0 ? (
              stats.upcomingEvents.map((event, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Calendar className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{event.name}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{event.date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No upcoming events</p>
                <p className="text-xs">Check back later for updates</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 mb-4 lg:mb-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Recent Activity</h3>
            <Activity className="w-5 h-5 text-primary" />
          </div>

          <div className="space-y-3">
            {stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Gift className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800">{activity.action}</p>
                    <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{activity.timestamp}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Activity className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No recent activity</p>
                <p className="text-xs">Your activity will appear here</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Birthdays This Week</h3>
            <Heart className="w-5 h-5 text-primary" />
          </div>

          <div className="space-y-3">
            {stats.upcomingBirthdays.length > 0 ? (
              stats.upcomingBirthdays.map((birthday, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white">
                    <span className="text-sm font-medium">{birthday.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{birthday.name}</p>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Heart className="w-3 h-3" />
                      <span>{birthday.date}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Heart className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No birthdays this week</p>
                <p className="text-xs">Check back for upcoming celebrations</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberDashboard;
