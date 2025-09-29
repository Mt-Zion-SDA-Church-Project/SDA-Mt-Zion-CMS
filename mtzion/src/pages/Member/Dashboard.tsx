import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, Heart, Gift, TrendingUp, Users, Clock, Activity, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/sda-logo.png';

interface MemberStats {
  myTithes: number;
  myOfferings: number;
  eventsAttended: number;
  myMinistries: number;
  upcomingEvents: Array<{
    id: string;
    title: string;
    date: string;
    time: string;
    type: string;
    location: string;
  }>;
  upcomingBirthdays: Array<{
    name: string;
    date: string;
    avatar: string;
  }>;
  recentActivity: Array<{
    action: string;
    date: string;
    amount?: string;
    icon: React.ComponentType<any>;
  }>;
}

const MemberDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<MemberStats>({
    myTithes: 0,
    myOfferings: 0,
    eventsAttended: 0,
    myMinistries: 0,
    upcomingEvents: [],
    upcomingBirthdays: [],
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [showEventsDropdown, setShowEventsDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUserData();
    
    // Set up real-time subscriptions
    const membersChannel = supabase
      .channel('member-dashboard-members')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => {
        loadUserData();
      })
      .subscribe();

    const eventsChannel = supabase
      .channel('member-dashboard-events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        loadUserData();
      })
      .subscribe();

    const attendanceChannel = supabase
      .channel('member-dashboard-attendance')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
        loadUserData();
      })
      .subscribe();

    const tithesChannel = supabase
      .channel('member-dashboard-tithes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tithes' }, () => {
        loadUserData();
      })
      .subscribe();

    const offeringsChannel = supabase
      .channel('member-dashboard-offerings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offerings' }, () => {
        loadUserData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(membersChannel);
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(attendanceChannel);
      supabase.removeChannel(tithesChannel);
      supabase.removeChannel(offeringsChannel);
    };
  }, []);

  // Close dropdown when clicking outside
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

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get member data
      const { data: memberData } = await supabase
        .from('members')
        .select('id, first_name, last_name')
        .eq('user_id', user.id)
        .single();

      if (!memberData) return;

      // Load all data in parallel
      const [
        tithesResult,
        offeringsResult,
        attendanceResult,
        ministriesResult,
        eventsResult,
        birthdaysResult,
        activityResult
      ] = await Promise.all([
        // My tithes for current year
        supabase
          .from('tithes')
          .select('amount')
          .eq('member_id', memberData.id)
          .gte('tithe_date', new Date(new Date().getFullYear(), 0, 1).toISOString()),
        
        // My offerings for current year
        supabase
          .from('offerings')
          .select('amount')
          .eq('member_id', memberData.id)
          .gte('offering_date', new Date(new Date().getFullYear(), 0, 1).toISOString()),
        
        // Events attended count
        supabase
          .from('attendance')
          .select('id', { count: 'exact', head: true })
          .eq('member_id', memberData.id),
        
        // My ministries count
        supabase
          .from('member_ministries')
          .select('id', { count: 'exact', head: true })
          .eq('member_id', memberData.id)
          .eq('is_active', true),
        
        // Upcoming events
        supabase
          .from('events')
          .select('id, title, event_date, event_type, location')
          .gte('event_date', new Date().toISOString())
          .order('event_date', { ascending: true })
          .limit(5),
        
        // Upcoming birthdays (next 7 days)
        supabase
          .from('members')
          .select('first_name, last_name, date_of_birth')
          .not('date_of_birth', 'is', null)
          .neq('id', memberData.id)
          .limit(20),
        
        // Recent activity
        supabase
          .from('activity_logs')
          .select('action, created_at')
          .eq('member_id', memberData.id)
          .order('created_at', { ascending: false })
          .limit(3)
      ]);

      // Calculate totals
      const totalTithes = tithesResult.data?.reduce((sum, tithe) => sum + Number(tithe.amount), 0) || 0;
      const totalOfferings = offeringsResult.data?.reduce((sum, offering) => sum + Number(offering.amount), 0) || 0;

      // Format upcoming events
      const formattedEvents = eventsResult.data?.map((event) => {
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

      // Format upcoming birthdays (next 7 days)
      const formattedBirthdays = birthdaysResult.data?.map(member => {
        const birthDate = new Date(member.date_of_birth);
        const today = new Date();
        const thisYear = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        const nextYear = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
        
        const upcomingDate = thisYear > today ? thisYear : nextYear;
        const daysUntil = Math.ceil((upcomingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          name: `${member.first_name} ${member.last_name}`,
          date: `${birthDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          daysUntil,
          avatar: `${member.first_name[0]}${member.last_name[0]}`
        };
      }).filter(birthday => birthday.daysUntil >= 0 && birthday.daysUntil <= 7) || [];

      // Format recent activity
      const formattedActivity = activityResult.data?.map(activity => ({
        action: activity.action,
        date: new Date(activity.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }),
        icon: Activity
      })) || [];

      // Add some mock recent activity for demonstration
      const mockActivity = [
        {
          action: 'Attended Sunday Service',
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          }),
          icon: Clock
        },
        {
          action: 'Tithe payment recorded',
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          }),
          amount: '$200',
          icon: Heart
        },
        {
          action: 'Special offering given',
          date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          }),
          amount: '$50',
          icon: Gift
        }
      ];

      // Sort birthdays by days until
      formattedBirthdays.sort((a, b) => a.daysUntil - b.daysUntil);

      setStats({
        myTithes: totalTithes,
        myOfferings: totalOfferings,
        eventsAttended: attendanceResult.count || 0,
        myMinistries: ministriesResult.count || 0,
        upcomingEvents: formattedEvents,
        upcomingBirthdays: formattedBirthdays.slice(0, 5),
        recentActivity: [...formattedActivity, ...mockActivity].slice(0, 3)
      });

    } catch (error) {
      console.error('Error loading member dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const memberStats = [
    {
      name: 'My Tithes (2024)',
      value: formatCurrency(stats.myTithes),
      icon: Heart,
      color: 'bg-blue-500',
      change: '+12%',
    },
    {
      name: 'My Offerings',
      value: formatCurrency(stats.myOfferings),
      icon: Gift,
      color: 'bg-green-500',
      change: '+8%',
    },
    {
      name: 'Events Attended',
      value: stats.eventsAttended.toString(),
      icon: Calendar,
      color: 'bg-purple-500',
      change: '+3',
    },
    {
      name: 'My Ministries',
      value: stats.myMinistries.toString(),
      icon: Users,
      color: 'bg-yellow-500',
      change: 'Active',
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
              <h1 className="text-3xl font-bold text-gray-800">My Dashboard</h1>
              <p className="text-gray-600">Welcome to your member portal</p>
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
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">My Dashboard</h1>
            <p className="text-sm lg:text-base text-gray-600">Welcome to your member portal</p>
          </div>
        </div>
      </div>

      {/* Stats Grid - Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {memberStats.map((stat) => (
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
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions - Responsive */}
      <div className="bg-white rounded-lg shadow-md p-4 lg:p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
          <button className="p-3 lg:p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center space-x-2 lg:space-x-3 group">
            <Heart className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600 group-hover:scale-110 transition-transform" />
            <span className="text-sm lg:text-base font-medium text-blue-600">Give Tithe</span>
          </button>
          <button className="p-3 lg:p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors flex items-center justify-center space-x-2 lg:space-x-3 group">
            <Gift className="w-5 h-5 lg:w-6 lg:h-6 text-green-600 group-hover:scale-110 transition-transform" />
            <span className="text-sm lg:text-base font-medium text-green-600">Give Offering</span>
          </button>
          <button className="p-3 lg:p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors flex items-center justify-center space-x-2 lg:space-x-3 group">
            <Calendar className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600 group-hover:scale-110 transition-transform" />
            <span className="text-sm lg:text-base font-medium text-purple-600">View Events</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid - Responsive */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
        {/* Upcoming Events */}
        <div className="bg-white rounded-lg shadow-md p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Upcoming Events</h2>
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setShowEventsDropdown(!showEventsDropdown)}
                className="flex items-center gap-1 text-blue-600 text-sm hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50"
              >
                <span>More</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showEventsDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showEventsDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-20">
                  <button 
                    onClick={() => {
                      navigate('/member/events');
                      setShowEventsDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 rounded-t-lg text-gray-700"
                  >
                    Upcoming Events
                  </button>
                  <button 
                    onClick={() => {
                      navigate('/member/birthdays');
                      setShowEventsDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 rounded-b-lg text-gray-700"
                  >
                    Upcoming Birthdays
                  </button>
              </div>
              )}
            </div>
          </div>
          <div className="space-y-3 lg:space-y-4">
            {stats.upcomingEvents.length > 0 ? (
              stats.upcomingEvents.map((event, index) => (
                <div key={event.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0" />
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
                <p className="text-sm">Check back for new events</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Birthdays */}
        <div className="bg-white rounded-lg shadow-md p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Upcoming Birthdays</h2>
            <button 
              onClick={() => navigate('/member/birthdays')}
              className="text-blue-600 text-sm hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50"
            >
              View All
            </button>
          </div>
          <div className="space-y-3 lg:space-y-4">
            {stats.upcomingBirthdays.length > 0 ? (
              stats.upcomingBirthdays.map((birthday, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-yellow-100 to-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-yellow-600 font-medium text-xs lg:text-sm">{birthday.avatar}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{birthday.name}</p>
                    <p className="text-sm text-gray-600 truncate">
                      {birthday.date}
                      {birthday.daysUntil === 0 && <span className="text-red-600 font-medium ml-1">(Today!)</span>}
                      {birthday.daysUntil === 1 && <span className="text-orange-600 font-medium ml-1">(Tomorrow)</span>}
                      {birthday.daysUntil > 1 && <span className="text-blue-600 font-medium ml-1">({birthday.daysUntil} days)</span>}
                    </p>
                </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Heart className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No upcoming birthdays</p>
                <p className="text-sm">Birthdays will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-md p-4 lg:p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">My Recent Activity</h2>
        <div className="space-y-3 lg:space-y-4">
          {stats.recentActivity.length > 0 ? (
            stats.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center space-x-3 lg:space-x-4 p-3 bg-gray-50 rounded-lg">
                <activity.icon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 break-words">{activity.action}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {activity.date}
                    {activity.amount && ` • ${activity.amount}`}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No recent activity</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberDashboard;