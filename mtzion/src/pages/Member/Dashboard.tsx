import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, Heart, Gift, TrendingUp, Users, Clock, Activity, ChevronDown, Menu, X, Home, BookOpen, CreditCard, MapPin, QrCode, LogOut } from 'lucide-react';
import MemberMobileNav from '../../components/Member/MemberMobileNav';
import { useNavigate } from 'react-router-dom';
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
  const [showMobileMenu, setShowMobileMenu] = useState(false);
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
      ] = await Promise.allSettled([
        supabase
          .from('tithes')
          .select('id, amount')
          .eq('member_id', memberData.id),
        
        supabase
          .from('offerings')
          .select('id, amount')
          .eq('member_id', memberData.id),
        
        supabase
          .from('attendance')
          .select('id')
          .eq('member_id', memberData.id),
        
        supabase
          .from('member_ministries')
          .select('id')
          .eq('member_id', memberData.id),
        
        supabase
          .from('events')
          .select('id, title, event_date, location')
          .gte('event_date', new Date().toISOString())
          .order('event_date', { ascending: true })
          .limit(5),
        
        supabase
          .from('members')
          .select('id, first_name, last_name, date_of_birth')
          .not('date_of_birth', 'is', null),
        
        supabase
          .from('activity_log')
          .select('action, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      // Process results
      const totalTithes = tithesResult.status === 'fulfilled' 
        ? (tithesResult.value.data || []).reduce((sum: number, tithe: any) => sum + (parseFloat(tithe.amount) || 0), 0)
        : 0;
      
      const totalOfferings = offeringsResult.status === 'fulfilled'
        ? (offeringsResult.value.data || []).reduce((sum: number, offering: any) => sum + (parseFloat(offering.amount) || 0), 0)
        : 0;

      const formattedEvents = eventsResult.status === 'fulfilled'
        ? (eventsResult.value.data || []).map((event: any) => ({
            id: event.id,
            name: event.title,
            date: new Date(event.event_date).toLocaleDateString(),
            location: event.location || 'TBD'
          }))
        : [];

      const formattedBirthdays = birthdaysResult.status === 'fulfilled'
        ? (() => {
            console.log('Member Dashboard - Birthday data:', birthdaysResult.value.data);
            const today = new Date();
            const all = (birthdaysResult.value.data || []).map((member: any) => {
              const birthDate = new Date(member.date_of_birth);
              const thisYear = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
              const nextYear = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
              const upcomingDate = thisYear > today ? thisYear : nextYear;
              const daysUntil = Math.ceil((upcomingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              console.log(`Member: ${member.first_name} ${member.last_name}, Birth date: ${member.date_of_birth}, Days until: ${daysUntil}`);
              return {
                id: member.id,
                name: `${member.first_name} ${member.last_name}`,
                upcomingDate,
                daysUntil
              };
            });
            console.log('All birthdays with days until:', all);
            // Next 7 days only, sorted by soonest
            const next7 = all
              .filter(b => b.daysUntil >= 0 && b.daysUntil <= 7)
              .sort((a, b) => a.daysUntil - b.daysUntil)
              .slice(0, 5)
              .map(b => ({
                id: b.id,
                name: b.name,
                date: b.upcomingDate.toLocaleDateString()
              }));
            console.log('Filtered birthdays (next 7 days):', next7);
            return next7;
          })()
        : [];

      const formattedActivity = activityResult.status === 'fulfilled'
        ? (activityResult.value.data || []).map((log: any) => ({
            action: log.action,
            timestamp: new Date(log.created_at).toLocaleDateString()
          }))
        : [];

      // Mock recent activity for demo
      const mockActivity = [
        { action: 'Completed tithe payment', timestamp: 'Today' },
        { action: 'Attended Sabbath School', timestamp: 'Yesterday' }
      ];

      setStats({
        myTithes: totalTithes,
        myOfferings: totalOfferings,
        eventsAttended: attendanceResult.status === 'fulfilled' ? attendanceResult.value.data?.length || 0 : 0,
        myMinistries: ministriesResult.status === 'fulfilled' ? ministriesResult.value.data?.length || 0 : 0,
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

  const allMenus = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, href: '/member/dashboard', order: 0 },
    { id: 'offertory', label: 'Give Offertory', icon: CreditCard, href: '/member/offertory', order: 1 },
    { id: 'events', label: 'Events', icon: Calendar, href: '/member/events', order: 2 },
    { id: 'resources', label: 'Resources', icon: BookOpen, href: '/member/resources', order: 3 },
    { id: 'birthdays', label: 'Birthdays', icon: Heart, href: '/member/birthdays', order: 4 },
    { id: 'qr', label: 'QR Check-in', icon: QrCode, href: '/member/qr-checkin', order: 5 }
  ].sort((a, b) => a.order - b.order);

  const toggleMenu = () => {
    console.log('Toggling mobile menu. Current state:', showMobileMenu);
    setShowMobileMenu(!showMobileMenu);
  };
  const closeMobileMenu = () => {
    console.log('Closing mobile menu');
    setShowMobileMenu(false);
  };

  const handleNavClick = (href: string) => {
    closeMobileMenu();
    navigate(href);
  };

  const formatCurrency = (amount: number) => {
    const formatted = new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0
    }).format(amount);
    // Ensure USh label for clarity
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
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <MemberMobileNav title="My Dashboard" />

        {/* Desktop Header - Hidden on Mobile */}
        <div className="hidden lg:block mb-8">
          <div className="flex items-center gap-4 mb-4">
            <img 
              src={logo} 
              alt="SDA Mt. Zion Logo" 
              className="w-16 h-16 object-contain"
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
    <div className="lg:space-y-6">
      <MemberMobileNav title="My Dashboard" />

      {/* Desktop Header - Hidden on Mobile */}
      <div className="hidden lg:block mb-8">
        <div className="flex items-center gap-4 mb-4">
          <img 
            src={logo} 
            alt="SDA Mt. Zion Logo" 
            className="w-16 h-16 object-contain"
          />
          <div>
            <h1 className="text-3xl font-bold text-gray-800">My Dashboard</h1>
            <p className="text-gray-600">Welcome to your member portal</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
        {memberStats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-4 lg:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <div className="text-right">
                <p className={`text-lg lg:text-xl font-bold ${stat.color.replace('bg-', 'text-')}`}>
                  {stat.value}
                </p>
                <p className="text-xs lg:text-sm text-gray-600">{stat.name}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Section */}
      <div className="lg:grid lg:grid-cols-3 lg:gap-6">
        {/* Upcoming Events */}
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

        {/* Recent Activity */}
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

        {/* Upcoming Birthdays */}
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