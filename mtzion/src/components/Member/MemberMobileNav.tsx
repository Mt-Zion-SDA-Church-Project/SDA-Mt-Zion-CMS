import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Home, CreditCard, Calendar, BookOpen, Heart, QrCode, Bell, Images, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { UserPrivilege } from '../../types';
import logo from '../../assets/sda-logo.png';

type MenuItem = {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const items: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/member/dashboard', icon: Home },
  { id: 'offertory', label: 'Give Offertory', href: '/member/offertory', icon: CreditCard },
  { id: 'events', label: 'Events', href: '/member/events', icon: Calendar },
  { id: 'gallery', label: 'Gallery', href: '/member/gallery', icon: Images },
  { id: 'resources', label: 'Resources', href: '/member/resources', icon: BookOpen },
  { id: 'birthdays', label: 'Birthdays', href: '/member/birthdays', icon: Heart },
  { id: 'qr', label: 'QR Check-in', href: '/member/qr-checkin', icon: QrCode }
];

interface MemberMobileNavProps {
  title?: string;
}

const MemberMobileNav: React.FC<MemberMobileNavProps> = ({ title = 'Member Portal' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userPrivileges, setUserPrivileges] = useState<UserPrivilege[]>([]);

  useEffect(() => {
    const loadNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, title, message, data, is_read, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      if (!error) setNotifications(data || []);
    };
    loadNotifications();

    const channel = supabase
      .channel('mobile-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => loadNotifications())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Load user privileges
  useEffect(() => {
    if (user?.id) {
      loadUserPrivileges();
    }
  }, [user?.id]);

  const loadUserPrivileges = async () => {
    try {
      console.log('=== MOBILE NAV LOAD PRIVILEGES ===');
      console.log('User:', user);
      
      // Get the member's database ID
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('id')
        .eq('user_id', user?.id)
        .single();
      
      console.log('Member lookup:', { member, memberError });
      
      if (member?.id) {
        console.log('Using member ID for privileges:', member.id);
        const { data, error } = await supabase
          .from('user_privileges')
          .select('*')
          .eq('user_id', member.id)
          .eq('user_type', 'member');

        console.log('Mobile nav privileges loaded:', data, 'error:', error);
        if (!error && data) {
          setUserPrivileges(data);
        }
      } else {
        console.log('No member ID found, cannot load privileges');
      }
    } catch (error) {
      console.error('Error loading mobile nav privileges:', error);
    }
  };

  const hasPrivilege = (tabName: string): boolean => {
    if (!user?.id) return true; // Default to allowed if no user
    const privilege = userPrivileges.find(p => p.tab_name === tabName);
    console.log(`Mobile nav checking privilege for ${tabName}:`, privilege);
    return privilege ? privilege.is_allowed : true; // Default to allowed
  };

  const onNavigate = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  const isActive = (href: string) => location.pathname === href;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'event': return Calendar;
      case 'birthday': return Heart;
      case 'receipt': return CreditCard;
      case 'announcement': return BookOpen;
      case 'gallery': return Images;
      default: return Bell;
    }
  };

  const getNotificationLink = (notification: any) => {
    switch (notification.type) {
      case 'receipt':
        return `/member/offertory/receipt/${notification.data?.receipt_id}`;
      case 'event':
        return '/member/events';
      case 'birthday':
        return '/member/birthdays';
      case 'gallery':
        return '/member/gallery';
      default:
        return '/member';
    }
  };

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
  };

  return (
    <div className="bg-white shadow-sm border-b lg:hidden">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <img src={logo} alt="SDA Mt. Zion Logo" className="w-8 h-8 object-contain" />
          <div>
            <h1 className="text-lg font-bold text-gray-800">{title}</h1>
            <p className="text-xs text-gray-600">Member Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={() => setNotificationsOpen(!notificationsOpen)} 
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 relative"
            >
              <Bell className="w-5 h-5 text-gray-700" />
              {notifications.filter(n => !n.is_read).length > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  {notifications.filter(n => !n.is_read).length}
                </span>
              )}
            </button>
            
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
                <div className="px-4 py-3 border-b flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800">Notifications</span>
                  <button 
                    onClick={() => setNotificationsOpen(false)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                <div className="max-h-64 overflow-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-sm text-gray-600 text-center">No notifications</div>
                  ) : (
                    notifications.map((n) => {
                      const Icon = getNotificationIcon(n.type);
                      return (
                        <button
                          key={n.id}
                          onClick={() => {
                            markAsRead(n.id);
                            onNavigate(getNotificationLink(n));
                            setNotificationsOpen(false);
                          }}
                          className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 ${!n.is_read ? 'bg-blue-50' : ''}`}
                        >
                          <Icon className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-800 text-sm">{n.title}</div>
                            {n.message && (
                              <div className="text-xs text-gray-600 mt-1 line-clamp-2">{n.message}</div>
                            )}
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(n.created_at).toLocaleString()}
                            </div>
                          </div>
                          {!n.is_read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Menu */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
            aria-label="Open navigation menu"
            aria-expanded={open}
          >
            <Menu className={`w-6 h-6 text-gray-700 transition-transform ${open ? 'rotate-90' : ''}`} />
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t bg-white shadow-lg relative z-50">
          {items.filter(item => hasPrivilege(item.id)).map((m) => (
            <button
              key={m.id}
              onClick={() => onNavigate(m.href)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${isActive(m.href) ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
            >
              <m.icon className="w-5 h-5" />
              <span className="font-medium">{m.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MemberMobileNav;


