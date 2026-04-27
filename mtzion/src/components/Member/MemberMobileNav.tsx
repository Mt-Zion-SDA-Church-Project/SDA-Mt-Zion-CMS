import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Home, CreditCard, Calendar, BookOpen, Heart, QrCode, Bell, Images, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { UserPrivilege } from '../../types';
import { queryKeys } from '../../lib/queryKeys';
import logo from '../../assets/sda-logo.png';

type MenuItem = {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const items: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/member', icon: Home },
  { id: 'offertory', label: 'Give Offertory', href: '/member/offertory', icon: CreditCard },
  { id: 'events', label: 'Events', href: '/member/events', icon: Calendar },
  { id: 'gallery', label: 'Gallery', href: '/member/gallery', icon: Images },
  { id: 'resources', label: 'Resources', href: '/member/resources', icon: BookOpen },
  { id: 'birthdays', label: 'Birthdays', href: '/member/birthdays', icon: Heart },
  { id: 'qr_checkin', label: 'QR Check-in', href: '/member/qr-checkin', icon: QrCode },
];

interface MemberMobileNavProps {
  title?: string;
  /** When false, hides the small “Member Portal” line under the title for a cleaner dashboard bar. */
  showSubtitle?: boolean;
}

const MemberMobileNav: React.FC<MemberMobileNavProps> = ({ title = 'Member Portal', showSubtitle = true }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const notificationsQuery = useQuery({
    queryKey: queryKeys.memberMobileNav.notifications(user?.id ?? 'none'),
    enabled: !!user?.id,
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

  React.useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('mobile-notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.memberMobileNav.notifications(user.id),
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);

  const privilegesQuery = useQuery({
    queryKey: queryKeys.memberMobileNav.privileges(user?.id ?? 'none'),
    enabled: !!user?.id,
    queryFn: async (): Promise<UserPrivilege[]> => {
      console.log('=== MOBILE NAV LOAD PRIVILEGES ===');
      console.log('User:', user);

      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      console.log('Member lookup:', { member, memberError });

      if (!member?.id) {
        console.log('No member ID found, cannot load privileges');
        return [];
      }

      console.log('Using member ID for privileges:', member.id);
      const { data, error } = await supabase
        .from('user_privileges')
        .select('*')
        .eq('user_id', member.id)
        .eq('user_type', 'member');

      console.log('Mobile nav privileges loaded:', data, 'error:', error);
      if (error) throw error;
      return data ?? [];
    },
  });

  const notifications = notificationsQuery.data ?? [];
  const userPrivileges = privilegesQuery.data ?? [];

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    },
    onSuccess: () => {
      if (user?.id) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.memberMobileNav.notifications(user.id),
        });
      }
    },
  });

  const hasPrivilege = (tabName: string): boolean => {
    if (!user?.id) return true;
    const privilege = userPrivileges.find((p) => p.tab_name === tabName);
    console.log(`Mobile nav checking privilege for ${tabName}:`, privilege);
    return privilege ? privilege.is_allowed : true;
  };

  const onNavigate = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  const isActive = (href: string) => location.pathname === href;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'event':
        return Calendar;
      case 'birthday':
        return Heart;
      case 'receipt':
        return CreditCard;
      case 'announcement':
        return BookOpen;
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

  return (
    <div className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-sm">
      <div className="flex items-center justify-between gap-2 px-3 py-3 sm:px-4">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200/60">
            <img src={logo} alt="" className="h-7 w-7 object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight text-slate-900">{title}</h1>
            {showSubtitle ? (
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Member Portal</p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="relative">
            <button
              type="button"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <Bell className="h-5 w-5" />
              {notifications.filter((n) => !n.is_read).length > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  {notifications.filter((n) => !n.is_read).length}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-[min(100vw-1.5rem,20rem)] rounded-xl border border-slate-200 bg-white shadow-xl z-50 max-h-96 overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
                  <span className="text-sm font-semibold text-slate-800">Notifications</span>
                  <button
                    type="button"
                    onClick={() => setNotificationsOpen(false)}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="max-h-64 overflow-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-600">No notifications</div>
                  ) : (
                    notifications.map((n) => {
                      const Icon = getNotificationIcon(n.type);
                      return (
                        <button
                          type="button"
                          key={n.id}
                          onClick={() => {
                            markAsRead(n.id);
                            onNavigate(getNotificationLink(n));
                            setNotificationsOpen(false);
                          }}
                          className={`flex w-full items-start gap-3 px-3 py-3 text-left transition hover:bg-slate-50 ${!n.is_read ? 'bg-sky-50/70' : ''}`}
                        >
                          <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-slate-800">{n.title}</div>
                            {n.message && (
                              <div className="mt-1 line-clamp-2 text-xs text-slate-600">{n.message}</div>
                            )}
                            <div className="mt-1 text-xs text-slate-500">{new Date(n.created_at).toLocaleString()}</div>
                          </div>
                          {!n.is_read && <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-sky-500" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            aria-label="Open navigation menu"
            aria-expanded={open}
          >
            <Menu className={`h-5 w-5 transition-transform ${open ? 'rotate-90' : ''}`} />
          </button>
        </div>
      </div>

      {open && (
        <div className="relative z-50 border-t border-slate-100 bg-white shadow-lg">
          {items
            .filter((item) => hasPrivilege(item.id))
            .map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={() => onNavigate(m.href)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors ${
                  isActive(m.href) ? 'bg-sky-50 text-sky-800' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <m.icon className="h-5 w-5 text-slate-500" />
                <span>{m.label}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
};

export default MemberMobileNav;
