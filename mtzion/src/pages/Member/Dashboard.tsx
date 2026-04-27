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
      iconWrap: 'bg-emerald-500/12 text-emerald-600',
      valueClass: 'text-emerald-800',
    },
    {
      name: 'Events Attended',
      value: `${stats.eventsAttended}`,
      icon: Calendar,
      iconWrap: 'bg-sky-500/12 text-sky-600',
      valueClass: 'text-slate-900',
    },
    {
      name: 'Birthdays',
      value: `${stats.upcomingBirthdays.length}`,
      icon: Heart,
      iconWrap: 'bg-violet-500/12 text-violet-600',
      valueClass: 'text-slate-900',
    },
    {
      name: 'Activities',
      value: `${stats.recentActivity.length}`,
      icon: Activity,
      iconWrap: 'bg-amber-500/12 text-amber-600',
      valueClass: 'text-slate-900',
    },
  ] as const;

  if (loading) {
    return (
      <div className="space-y-5 lg:space-y-6">
        <MemberMobileNav title="My Dashboard" showSubtitle={false} />

        <div className="hidden lg:block mb-8">
          <div className="flex items-center gap-4 mb-4">
            <img src={logo} alt="SDA Mt. Zion Logo" className="w-16 h-16 object-contain" />
            <div>
              <h1 className="text-3xl font-bold text-gray-800">My Dashboard</h1>
              <p className="text-gray-600">Welcome to your member portal</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.03] lg:p-5"
            >
              <div className="mb-3 h-10 w-10 rounded-xl bg-slate-100" />
              <div className="mb-2 h-7 w-20 rounded-lg bg-slate-100" />
              <div className="h-3 w-24 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 lg:space-y-6">
      <MemberMobileNav title="My Dashboard" showSubtitle={false} />

      <div className="hidden lg:block mb-8">
        <div className="flex items-center gap-4 mb-4">
          <img src={logo} alt="SDA Mt. Zion Logo" className="w-16 h-16 object-contain" />
          <div>
            <h1 className="text-3xl font-bold text-gray-800">My Dashboard</h1>
            <p className="text-gray-600">Welcome to your member portal</p>
          </div>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-slate-600 lg:hidden">
        Here&apos;s a snapshot of your giving, participation, and what&apos;s coming up at church.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:mb-6 lg:grid-cols-4 lg:gap-6">
        {memberStats.map((stat, index) => (
          <div
            key={index}
            className="relative overflow-hidden rounded-2xl border border-slate-100/90 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.04] transition-shadow hover:shadow-md lg:p-5"
          >
            <div
              className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl lg:h-11 lg:w-11 ${stat.iconWrap}`}
            >
              <stat.icon className="h-5 w-5" strokeWidth={2} />
            </div>
            <p className={`text-lg font-bold tabular-nums tracking-tight lg:text-2xl ${stat.valueClass}`}>{stat.value}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 lg:text-xs lg:normal-case lg:tracking-normal lg:text-slate-600">
              {stat.name}
            </p>
          </div>
        ))}
      </div>

      <div className="lg:grid lg:grid-cols-3 lg:gap-6 lg:space-y-0 space-y-4">
        <div className="rounded-2xl border border-slate-100/90 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.03] lg:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h3 className="text-base font-semibold text-slate-900">Upcoming Events</h3>
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowEventsDropdown(!showEventsDropdown)}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-sky-700 transition hover:bg-sky-50"
              >
                <span>All Events</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showEventsDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showEventsDropdown && (
                <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => setShowEventsDropdown(false)}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    All Events
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEventsDropdown(false)}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    This Week
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEventsDropdown(false)}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    This Month
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2.5">
            {stats.upcomingEvents.length > 0 ? (
              stats.upcomingEvents.map((event, index) => (
                <div
                  key={index}
                  className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition hover:border-slate-200 hover:bg-white"
                >
                  <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug text-slate-900">{event.name}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {event.date}
                      </span>
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <MapPin className="h-3 w-3 flex-shrink-0 text-slate-400" />
                        <span className="truncate">{event.location}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-slate-500">
                <Calendar className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                <p className="text-sm font-medium text-slate-700">No upcoming events</p>
                <p className="mt-1 text-xs text-slate-500">Check back later for updates</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100/90 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.03] lg:p-6">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-semibold text-slate-900">Recent Activity</h3>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700">
              <Activity className="h-5 w-5" />
            </div>
          </div>

          <div className="space-y-2.5">
            {stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition hover:border-slate-200 hover:bg-white"
                >
                  <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <Gift className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{activity.action}</p>
                    <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="h-3 w-3" />
                      <span>{activity.timestamp}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-slate-500">
                <Activity className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                <p className="text-sm font-medium text-slate-700">No recent activity</p>
                <p className="mt-1 text-xs text-slate-500">Your activity will appear here</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100/90 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.03] lg:p-6">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-semibold text-slate-900">Birthdays This Week</h3>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700">
              <Heart className="h-5 w-5" />
            </div>
          </div>

          <div className="space-y-2.5">
            {stats.upcomingBirthdays.length > 0 ? (
              stats.upcomingBirthdays.map((birthday, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition hover:border-slate-200 hover:bg-white"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-sky-600 text-sm font-semibold text-white shadow-sm">
                    {birthday.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{birthday.name}</p>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                      <Heart className="h-3 w-3 text-violet-400" />
                      <span>{birthday.date}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-slate-500">
                <Heart className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                <p className="text-sm font-medium text-slate-700">No birthdays this week</p>
                <p className="mt-1 text-xs text-slate-500">Check back for upcoming celebrations</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberDashboard;
