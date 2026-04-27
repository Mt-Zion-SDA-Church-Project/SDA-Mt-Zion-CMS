import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { Menu, Bell, LogOut, User, Calendar, Heart, FileText, Gift, Images } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/queryKeys';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const isMemberRoute = location.pathname.startsWith('/member');
  const memberHiName = user?.full_name?.trim().split(/\s+/)[0] || 'there';

  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications.header(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, title, message, data, is_read, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  const notifications = notificationsQuery.data ?? [];

  useEffect(() => {
    const channel = supabase
      .channel('header-notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.header() });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.header() });
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'event':
        return Calendar;
      case 'birthday':
        return Heart;
      case 'receipt':
        return FileText;
      case 'announcement':
        return Gift;
      case 'gallery':
        return Images;
      default:
        return Bell;
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
    await markAsReadMutation.mutateAsync(id);
  };

  const notificationPanel = open && (
    <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-30 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-100 text-sm font-semibold text-slate-800">Notifications</div>
      <div className="max-h-64 overflow-auto">
        {notifications.length === 0 ? (
          <div className="p-4 text-sm text-slate-600">No notifications</div>
        ) : (
          notifications.map((n) => {
            const Icon = getNotificationIcon(n.type);
            return (
              <a
                key={n.id}
                href={getNotificationLink(n)}
                onClick={() => markAsRead(n.id)}
                className={`flex items-start gap-3 px-4 py-3 text-sm hover:bg-slate-50 ${!n.is_read ? 'bg-sky-50/80' : ''}`}
              >
                <Icon className="w-4 h-4 mt-0.5 text-slate-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800">{n.title}</div>
                  {n.message && (
                    <div className="text-xs text-slate-600 mt-1 line-clamp-2">{n.message}</div>
                  )}
                  <div className="text-xs text-slate-500 mt-1">{new Date(n.created_at).toLocaleString()}</div>
                </div>
                {!n.is_read && <div className="w-2 h-2 bg-sky-500 rounded-full flex-shrink-0 mt-1"></div>}
              </a>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <header className="bg-white border-b border-slate-200/80 shadow-sm">
      {isMemberRoute && (
        <div className="flex lg:hidden items-center justify-between gap-3 px-4 py-2.5 bg-gradient-to-r from-slate-50 to-white">
          <p className="text-sm font-semibold text-slate-800 truncate min-w-0">
            Hi, <span className="text-slate-900">{memberHiName}</span>
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div
              className="w-9 h-9 rounded-full bg-slate-100 ring-2 ring-white shadow-sm flex items-center justify-center"
              title={user?.full_name || 'Account'}
            >
              <User className="w-4 h-4 text-slate-600" />
            </div>
            <button
              type="button"
              onClick={signOut}
              className="p-2 rounded-xl hover:bg-red-50 text-red-600 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div
        className={`items-center justify-between px-4 sm:px-6 py-3 lg:py-4 ${isMemberRoute ? 'hidden lg:flex' : 'flex'}`}
      >
        <div className="flex items-center space-x-4 min-w-0">
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-2 rounded-md hover:bg-slate-100 hidden lg:inline-flex"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="text-lg sm:text-xl font-semibold text-slate-800 truncate">
            Welcome, {user?.full_name}
          </h2>
        </div>

        <div className="flex items-center space-x-3 sm:space-x-4 flex-shrink-0">
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="p-2 rounded-lg hover:bg-slate-100 relative border border-transparent hover:border-slate-200/80"
            >
              <Bell className="w-5 h-5 text-slate-600" />
              {notifications.filter((n) => !n.is_read).length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
              )}
            </button>
            {notificationPanel}
          </div>

          <div className="hidden sm:flex items-center space-x-2">
            <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-sky-700" />
            </div>
            <span className="text-sm text-slate-700 max-w-[10rem] truncate">{user?.full_name}</span>
          </div>

          <button
            type="button"
            onClick={signOut}
            className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
