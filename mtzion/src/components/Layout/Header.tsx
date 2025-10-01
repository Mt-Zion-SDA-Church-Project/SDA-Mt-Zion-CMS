import React, { useEffect, useState } from 'react';
import { Menu, Bell, LogOut, User, Calendar, Heart, FileText, Gift } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { user, signOut } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, title, message, data, is_read, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      if (!error) setNotifications(data || []);
    };
    load();

    const channel = supabase
      .channel('header-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'event': return Calendar;
      case 'birthday': return Heart;
      case 'receipt': return FileText;
      case 'announcement': return Gift;
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
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold text-gray-800">
            Welcome, {user?.full_name}
          </h2>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <button onClick={() => setOpen(!open)} className="p-2 rounded-md hover:bg-gray-100 relative">
              <Bell className="w-5 h-5 text-gray-600" />
              {notifications.filter(n => !n.is_read).length > 0 && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
            {open && (
              <div className="absolute right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg z-30">
                <div className="px-4 py-2 border-b text-sm font-semibold">Notifications</div>
                <div className="max-h-64 overflow-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-sm text-gray-600">No notifications</div>
                  ) : (
                    notifications.map((n) => {
                      const Icon = getNotificationIcon(n.type);
                      return (
                        <a
                          key={n.id}
                          href={getNotificationLink(n)}
                          onClick={() => markAsRead(n.id)}
                          className={`flex items-start gap-3 px-4 py-3 text-sm hover:bg-gray-50 ${!n.is_read ? 'bg-blue-50' : ''}`}
                        >
                          <Icon className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-800">{n.title}</div>
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
                        </a>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm text-gray-700">{user?.full_name}</span>
          </div>

          <button
            onClick={signOut}
            className="p-2 rounded-md hover:bg-red-50 text-red-600"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;