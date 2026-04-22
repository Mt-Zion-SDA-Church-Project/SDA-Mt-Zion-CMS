import React, { useEffect, useState } from 'react';
import { Users, UserCheck, Calendar, DollarSign, TrendingUp, Heart, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import logo from '../../assets/sda-logo.png';

interface DashboardStats {
  totalMembers: number;
  visitorsThisMonth: number;
  upcomingEvents: number;
  monthlyOfferings: number;
  recentActivities: Array<{
    action: string;
    user: string;
    time: string;
    timestamp: string;
  }>;
  upcomingBirthdays: Array<{
    name: string;
    date: string;
    avatar: string;
  }>;
  upcomingEventsList: Array<{
    id: string;
    title: string;
    date: string;
    time: string;
    type: string;
    location: string;
  }>;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    visitorsThisMonth: 0,
    upcomingEvents: 0,
    monthlyOfferings: 0,
    recentActivities: [],
    upcomingBirthdays: [],
    upcomingEventsList: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Realtime refresh when financial summaries change
  useEffect(() => {
    const channel = supabase
      .channel('cash_offering_accounts_dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_offering_accounts' }, () => {
        void loadDashboardData({ silent: true });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadDashboardData = async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) setLoading(true);

      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString();
      const nowIso = new Date().toISOString();
      const in30Iso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const in7Ms = Date.now() + 7 * 24 * 60 * 60 * 1000;

      // Fewer round-trips: one events window query; DB sum for offertory (no row fan-out)
      const [
        membersResult,
        visitorsResult,
        eventsWindowResult,
        offeringsSumResult,
        activitiesResult,
        birthdaysResult,
      ] = await Promise.all([
        supabase.from('members').select('id', { count: 'exact', head: true }),

        supabase
          .from('visitors')
          .select('id', { count: 'exact', head: true })
          .gte('visit_date', monthStart),

        supabase
          .from('events')
          .select('id, title, event_date, event_type, location')
          .gte('event_date', nowIso)
          .lte('event_date', in30Iso)
          .order('event_date', { ascending: true })
          .limit(250),

        supabase
          .from('cash_offering_accounts')
          .select('total.sum()')
          .gte('service_date', monthStart)
          .lte('service_date', monthEnd),

        supabase
          .from('activity_logs')
          .select(`
            action,
            created_at,
            members!activity_logs_member_id_fkey(first_name, last_name)
          `)
          .order('created_at', { ascending: false })
          .limit(5),

        supabase
          .from('members')
          .select('first_name, last_name, date_of_birth')
          .not('date_of_birth', 'is', null)
          .limit(120),
      ]);

      const eventsInWindow = eventsWindowResult.data ?? [];
      const upcomingEventsCount = eventsInWindow.length;

      const sumRow = offeringsSumResult.data?.[0] as { sum: string | number | null } | undefined;
      const totalOfferings = Number(sumRow?.sum ?? 0);

      const unwrapMember = (m: unknown): { first_name?: string; last_name?: string } | null => {
        if (m == null) return null;
        if (Array.isArray(m)) return (m[0] as { first_name?: string; last_name?: string }) ?? null;
        return m as { first_name?: string; last_name?: string };
      };

      // Format recent activities
      const formattedActivities = activitiesResult.data?.map(activity => {
        const mem = unwrapMember((activity as { members?: unknown }).members);
        return {
          action: activity.action,
          user: mem?.first_name != null ? `${mem.first_name} ${mem.last_name ?? ''}`.trim() : 'System',
          time: formatTimeAgo(activity.created_at),
          timestamp: activity.created_at,
        };
      }) || [];

      // If there are no recent activities in the database, generate helpful insights
      const eventsNext7 = eventsInWindow.filter((e) => new Date(e.event_date).getTime() <= in7Ms);

      const fallbackActivities = formattedActivities.length === 0
        ? [
            {
              action: `Upcoming events this week: ${eventsNext7.length}`,
              user: 'System',
              time: 'Just now',
              timestamp: new Date().toISOString()
            },
            {
              action: `Monthly offertory so far: ${formatCurrency(totalOfferings)}`,
              user: 'System',
              time: 'Just now',
              timestamp: new Date().toISOString()
            },
            {
              action: `New visitors this month: ${visitorsResult.count || 0}`,
              user: 'System',
              time: 'Just now',
              timestamp: new Date().toISOString()
            }
          ]
        : formattedActivities;

      // Format upcoming birthdays (client filter from capped sample)
      const formattedBirthdays = birthdaysResult.data?.map(member => {
        const birthDate = new Date(member.date_of_birth);
        const today = new Date();
        const thisYear = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        const nextYear = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
        
        const upcomingDate = thisYear > today ? thisYear : nextYear;
        const daysUntil = Math.ceil((upcomingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          name: `${member.first_name} ${member.last_name}`,
          date: `${birthDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${daysUntil} days)`,
          avatar: `${member.first_name[0]}${member.last_name[0]}`,
          daysUntil
        };
      }).filter(birthday => {
        return birthday.daysUntil >= 0 && birthday.daysUntil <= 30;
      }) || [];

      // Format upcoming events list (next 7 days, max 5)
      const formattedEventsList = eventsNext7.slice(0, 5).map(event => {
        const eventDate = new Date(event.event_date);
        return {
          id: event.id,
          title: event.title,
          date: eventDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          }),
          time: eventDate.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true
          }),
          type: event.event_type || 'General',
          location: event.location || 'TBD'
        };
      }) || [];

      setStats({
        totalMembers: membersResult.count || 0,
        visitorsThisMonth: visitorsResult.count || 0,
        upcomingEvents: upcomingEventsCount,
        monthlyOfferings: totalOfferings,
        recentActivities: fallbackActivities,
        upcomingBirthdays: formattedBirthdays.slice(0, 5),
        upcomingEventsList: formattedEventsList
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  const formatCurrency = (amount: number) => {
    const formatted = new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0
    }).format(amount);
    return formatted.replace('UGX', 'USh');
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'add-member':
        navigate('/admin/members/add');
        break;
      case 'new-event':
        navigate('/admin/events/add');
        break;
      case 'record-tithe':
        navigate('/admin/givings/add-tithe');
        break;
      case 'add-visitor':
        navigate('/admin/visitors/add');
        break;
      default:
        break;
    }
  };

  const statsCards = [
    {
      name: 'Total Members',
      value: stats.totalMembers.toString(),
      icon: Users,
      color: 'bg-blue-500',
      change: '+12',
      changeType: 'increase',
    },
    {
      name: 'Visitors This Month',
      value: stats.visitorsThisMonth.toString(),
      icon: UserCheck,
      color: 'bg-green-500',
      change: '+5',
      changeType: 'increase',
    },
    {
      name: 'Upcoming Events',
      value: stats.upcomingEvents.toString(),
      icon: Calendar,
      color: 'bg-purple-500',
      change: '+2',
      changeType: 'increase',
    },
    {
      name: 'Monthly Offertory',
      value: formatCurrency(stats.monthlyOfferings),
      icon: Heart,
      color: 'bg-yellow-500',
      change: '+8.5%',
      changeType: 'increase',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <img 
              src={logo} 
              alt="SDA Mt. Zion Logo" 
              className="w-12 h-12 lg:w-16 lg:h-16 object-contain"
            />
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Church Dashboard</h1>
              <p className="text-gray-600">Overview of church activities and statistics</p>
            </div>
          </div>
        </div>
        
        {/* Loading skeleton */}
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
    <div className="space-y-4 lg:space-y-6 p-4 lg:p-0">
      <div className="mb-6 lg:mb-8">
        <div className="flex items-center gap-4 mb-4">
          <img 
            src={logo} 
            alt="SDA Mt. Zion Logo" 
            className="w-12 h-12 lg:w-16 lg:h-16 object-contain"
          />
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">Church Dashboard</h1>
            <p className="text-sm lg:text-base text-gray-600">Overview of church activities and statistics</p>
          </div>
        </div>
      </div>

      {/* Stats Grid - Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {statsCards.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg shadow-md p-4 lg:p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs lg:text-sm font-medium text-gray-600 truncate">{stat.name}</p>
                <p className="text-xl lg:text-2xl font-bold text-gray-800 truncate">{stat.value}</p>
              </div>
              <div className={`${stat.color} rounded-full p-2 lg:p-3 flex-shrink-0 ml-2`}>
                <stat.icon className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
              </div>
            </div>
            <div className="mt-3 lg:mt-4 flex items-center">
              <TrendingUp className="w-3 h-3 lg:w-4 lg:h-4 text-green-500 mr-1 flex-shrink-0" />
              <span className="text-xs lg:text-sm text-green-500">{stat.change}</span>
              <span className="text-xs lg:text-sm text-gray-500 ml-2 hidden sm:inline">from last month</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid - Responsive */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
        {/* Recent Activities */}
        <div className="bg-white rounded-lg shadow-md p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Recent Activities</h2>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3 lg:space-y-4">
            {stats.recentActivities.length > 0 ? (
              stats.recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 lg:space-x-4">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 break-words">{activity.action}</p>
                    <p className="text-xs text-gray-500 truncate">{activity.user} • {activity.time}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No recent activities</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-4 lg:p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3 lg:gap-4">
            <button 
              onClick={() => handleQuickAction('add-member')}
              className="p-3 lg:p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors group"
            >
              <Users className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-xs lg:text-sm font-medium text-blue-600">Add Member</p>
            </button>
            <button 
              onClick={() => handleQuickAction('new-event')}
              className="p-3 lg:p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors group"
            >
              <Calendar className="w-5 h-5 lg:w-6 lg:h-6 text-green-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-xs lg:text-sm font-medium text-green-600">New Event</p>
            </button>
            <button 
              onClick={() => handleQuickAction('record-tithe')}
              className="p-3 lg:p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors group"
            >
              <DollarSign className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-xs lg:text-sm font-medium text-purple-600">Record Tithe</p>
            </button>
            <button 
              onClick={() => handleQuickAction('add-visitor')}
              className="p-3 lg:p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors group"
            >
              <UserCheck className="w-5 h-5 lg:w-6 lg:h-6 text-yellow-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-xs lg:text-sm font-medium text-yellow-600">Add Visitor</p>
            </button>
          </div>
        </div>
      </div>

      {/* Upcoming Events & Birthdays - Responsive */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
        <div className="bg-white rounded-lg shadow-md p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Upcoming Events</h2>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-500">Next 7 days</span>
            </div>
          </div>
          <div className="space-y-3 lg:space-y-4">
            {stats.upcomingEventsList.length > 0 ? (
              stats.upcomingEventsList.map((event, index) => (
                <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{event.title}</p>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span>{event.date}</span>
                        <span>•</span>
                        <span>{event.time}</span>
                        {event.location !== 'TBD' && (
                          <>
                            <span>•</span>
                            <span className="truncate">{event.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded flex-shrink-0 ml-2">
                    {event.type}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No upcoming events</p>
                <p className="text-sm">Events will appear here when scheduled</p>
              </div>
            )}
          </div>
          {stats.upcomingEventsList.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                Showing {stats.upcomingEventsList.length} of {stats.upcomingEvents} upcoming events
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 lg:p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Upcoming Birthdays</h2>
          <div className="space-y-3 lg:space-y-4">
            {stats.upcomingBirthdays.length > 0 ? (
              stats.upcomingBirthdays.map((birthday, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-yellow-100 to-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-yellow-600 font-medium text-xs lg:text-sm">{birthday.avatar}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{birthday.name}</p>
                    <p className="text-sm text-gray-600 truncate">{birthday.date}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Heart className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No upcoming birthdays</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;