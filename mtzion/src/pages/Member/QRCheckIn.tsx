import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/queryKeys';
import { QrCode, CheckCircle, Clock, Calendar, MapPin, XCircle } from 'lucide-react';
import MemberMobileNav from '../../components/Member/MemberMobileNav';
import PageLoader from '../../components/Layout/PageLoader';

const VALID_ATTENDANCE_TYPES = new Set([
  'service',
  'sabbath_school',
  'prayer_meeting',
  'event',
  'multi_member',
]);

function mapEventTypeToAttendanceType(eventType: string | null | undefined) {
  const t = (eventType || 'event').toLowerCase();
  if (VALID_ATTENDANCE_TYPES.has(t)) {
    return t as 'service' | 'sabbath_school' | 'prayer_meeting' | 'event' | 'multi_member';
  }
  return 'event';
}

function buildLoginUrlWithReturn(encodedData: string) {
  const params = new URLSearchParams();
  params.set('data', encodedData);
  const returnPath = `/member/qr-checkin?${params.toString()}`;
  return `/login?returnTo=${encodeURIComponent(returnPath)}`;
}

const PG_UNIQUE_VIOLATION = '23505';

function runWithCheckInLock(userId: string, eventId: string, fn: () => Promise<void>): Promise<void> {
  const name = `mtz-qr-checkin:${userId}:${eventId}`;
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request(name, { mode: 'exclusive' }, fn);
  }
  return fn();
}

type CheckInMutationResult =
  | { outcome: 'redirect_login' }
  | { outcome: 'success'; message: string; eventDetails: Record<string, unknown> | null; memberName: string };

type RecentCheckInRow = {
  id: string;
  check_in_time: string;
  attendance_date: string;
  event: { title: string; location: string; event_date: string } | null;
};

async function fetchRecentCheckIns(): Promise<RecentCheckInRow[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: member } = await supabase.from('members').select('id').eq('user_id', user.id).single();
  if (!member) return [];

  const { data, error } = await supabase
    .from('attendance')
    .select(
      `
            id,
            check_in_time,
            attendance_date,
            event:events(title, location, event_date)
          `
    )
    .eq('member_id', member.id)
    .order('check_in_time', { ascending: false })
    .limit(5);

  if (error) throw error;
  return (data as RecentCheckInRow[]) || [];
}

const MemberQRCheckIn: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dataParam = searchParams.get('data');

  useEffect(() => {
    const channel = supabase
      .channel('member-qr-checkin-attendance')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.qrCheckIn.recentCheckIns() });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const recentQuery = useQuery({
    queryKey: queryKeys.qrCheckIn.recentCheckIns(),
    queryFn: fetchRecentCheckIns,
  });

  const recentCheckIns = recentQuery.data ?? [];

  const checkInMutation = useMutation({
    mutationFn: async (encodedData: string): Promise<CheckInMutationResult> => {
      const payload = JSON.parse(atob(encodedData));

      if (!payload.eventId || payload.type !== 'event_checkin') {
        throw new Error('Invalid QR code. Please scan a valid event QR code.');
      }

      if (payload.expiresAt && Date.now() > payload.expiresAt) {
        throw new Error('This QR code has expired. Please contact an administrator.');
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        try {
          localStorage.setItem('pendingCheckIn', encodedData);
        } catch {
          /* ignore */
        }
        navigate(buildLoginUrlWithReturn(encodedData), { replace: true });
        return { outcome: 'redirect_login' as const };
      }

      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('id, first_name, last_name')
        .eq('user_id', user.id)
        .single();

      if (memberError || !member) {
        throw new Error('Member profile not found. Please contact the church office.');
      }

      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, title, event_date, location, event_type')
        .eq('id', payload.eventId)
        .single();

      if (eventError) {
        throw new Error('Event not found. Please contact an administrator.');
      }

      let successMessage = '';

      await runWithCheckInLock(user.id, payload.eventId, async () => {
        const { data: existingRows } = await supabase
          .from('attendance')
          .select('id')
          .eq('member_id', member.id)
          .eq('event_id', payload.eventId)
          .limit(1);

        if (existingRows && existingRows.length > 0) {
          successMessage = `You're already checked in for "${event.title}", ${member.first_name}. Welcome!`;
          localStorage.removeItem('pendingCheckIn');
          return;
        }

        const { error: insertError } = await supabase.from('attendance').insert({
          member_id: member.id,
          event_id: payload.eventId,
          attendance_date: new Date().toISOString().split('T')[0],
          attendance_type: mapEventTypeToAttendanceType(event.event_type),
          check_in_time: new Date().toISOString(),
          qr_scanned: true,
          created_at: new Date().toISOString(),
        });

        if (insertError) {
          const msg = (insertError.message || '').toLowerCase();
          const isUniqueViolation =
            insertError.code === PG_UNIQUE_VIOLATION ||
            msg.includes('duplicate key') ||
            msg.includes('unique constraint');

          if (isUniqueViolation) {
            successMessage = `You're already checked in for "${event.title}", ${member.first_name}. Welcome!`;
            localStorage.removeItem('pendingCheckIn');
            return;
          }
          console.error('Attendance insert failed:', insertError);
          throw new Error(
            insertError.message ||
              'Could not save attendance. If this persists, ask an admin to verify database permissions for the attendance table.'
          );
        }

        successMessage = `Welcome, ${member.first_name}! You have successfully checked in to "${event.title}".`;
        localStorage.removeItem('pendingCheckIn');
      });

      return {
        outcome: 'success' as const,
        message: successMessage,
        eventDetails: event as Record<string, unknown>,
        memberName: `${member.first_name} ${member.last_name}`,
      };
    },
    onSuccess: (data) => {
      if (data.outcome === 'redirect_login') return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.qrCheckIn.recentCheckIns() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.memberPortal.dashboardMe() });
    },
  });

  const { mutate: runCheckIn, reset: resetCheckIn } = checkInMutation;

  useEffect(() => {
    if (!dataParam) {
      resetCheckIn();
      return;
    }
    runCheckIn(dataParam);
  }, [dataParam, runCheckIn, resetCheckIn]);

  useEffect(() => {
    const run = async () => {
      if (dataParam) return;

      const pendingData = localStorage.getItem('pendingCheckIn');
      if (!pendingData) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      navigate(`/member/qr-checkin?${new URLSearchParams({ data: pendingData }).toString()}`, { replace: true });
    };

    void run();
  }, [dataParam, navigate]);

  const processing = !!dataParam && checkInMutation.isPending;
  const successData = checkInMutation.isSuccess && checkInMutation.data?.outcome === 'success' ? checkInMutation.data : null;
  const errorMessage = checkInMutation.isError
    ? (checkInMutation.error as Error).message || 'Failed to check in. Please try again or contact the administrator.'
    : null;

  if (processing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MemberMobileNav title="Processing Check-in" />
        <PageLoader variant="inline" message="Recording your attendance…" className="bg-gray-50/80" />
      </div>
    );
  }

  if (successData) {
    const eventDetails = successData.eventDetails;
    return (
      <div className="min-h-screen bg-gray-50">
        <MemberMobileNav title="Check-in Successful" />
        <div className="max-w-md mx-auto p-4 mt-8">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h2>
            <p className="text-gray-600 mb-4">{successData.message}</p>
            {eventDetails && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-semibold text-gray-900 mb-2">Event Details:</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(String(eventDetails.event_date)).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(String(eventDetails.event_date)).toLocaleTimeString()}</span>
                  </div>
                  {eventDetails.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{String(eventDetails.location)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            <button
              onClick={() => navigate('/member/dashboard')}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (dataParam && errorMessage) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MemberMobileNav title="Check-in Failed" />
        <div className="max-w-md mx-auto p-4 mt-8">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Check-in Failed</h2>
            <p className="text-red-600 mb-6">{errorMessage}</p>
            <button
              onClick={() => navigate('/member/dashboard')}
              className="w-full py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MemberMobileNav title="QR Check-in" />

      <div className="max-w-md mx-auto p-4 space-y-6">
        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <QrCode className="w-12 h-12 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Scan Event QR Code</h2>
          <p className="text-gray-600 mb-4">Use your phone camera to scan the QR code displayed at the church entrance.</p>

          <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-blue-900 mb-3">How to check in:</h3>
            <ol className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-blue-800">
                <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  1
                </span>
                <span>Open your phone's camera app</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-blue-800">
                <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  2
                </span>
                <span>Point it at the QR code displayed at the entrance</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-blue-800">
                <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  3
                </span>
                <span>Tap the notification that appears</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-blue-800">
                <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  4
                </span>
                <span>Your attendance will be automatically recorded</span>
              </li>
            </ol>
          </div>

          <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
            <p className="font-medium text-gray-700 mb-1">📱 Need help?</p>
            <p>Make sure you're logged into your account. If not, you'll be prompted to log in when you scan.</p>
          </div>
        </div>

        {recentCheckIns.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="px-5 py-4 border-b bg-gray-50">
              <div className="flex items-center gap-2 text-gray-800">
                <Clock className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Your Recent Check-ins</h3>
              </div>
            </div>

            <div className="p-4">
              <div className="space-y-3">
                {recentCheckIns.map((checkIn) => (
                  <div key={checkIn.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <p className="font-medium text-gray-800">{checkIn.event?.title || 'General Service'}</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(checkIn.check_in_time).toLocaleDateString()} at {new Date(checkIn.check_in_time).toLocaleTimeString()}
                      </p>
                      {checkIn.event?.location && (
                        <p className="text-xs text-gray-500 mt-1">📍 {checkIn.event.location}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <QrCode className="w-3 h-3 text-green-600" />
                      <span className="text-xs text-green-600">QR Scan</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {process.env.NODE_ENV === 'development' && (
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <p className="text-sm font-medium text-yellow-800 mb-2">🧪 Development Test Mode</p>
            <p className="text-xs text-yellow-700 mb-3">
              For testing purposes only. In production, members will scan QR codes with their camera.
            </p>
            <button
              onClick={() => {
                const testPayload = btoa(
                  JSON.stringify({
                    eventId: 'YOUR_TEST_EVENT_ID',
                    type: 'event_checkin',
                    timestamp: Date.now(),
                    expiresAt: Date.now() + 4 * 60 * 60 * 1000,
                  })
                );
                window.location.href = `/member/qr-checkin?data=${testPayload}`;
              }}
              className="text-sm text-yellow-800 underline"
            >
              Click here for manual test mode
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberQRCheckIn;
