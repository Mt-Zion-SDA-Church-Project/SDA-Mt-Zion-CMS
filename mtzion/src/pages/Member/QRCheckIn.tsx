import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
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

/** Events store free-text `event_type` (e.g. "general"); attendance uses an enum. */
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

const MemberQRCheckIn: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [checkingIn, setCheckingIn] = useState(false);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [eventDetails, setEventDetails] = useState<any>(null);
  const [memberName, setMemberName] = useState('');
  const [recentCheckIns, setRecentCheckIns] = useState<any[]>([]);

  // Load recent check-ins for the logged-in member
  const loadRecentCheckIns = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: member } = await supabase
        .from('members')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (member) {
        const { data, error } = await supabase
          .from('attendance')
          .select(`
            id,
            check_in_time,
            attendance_date,
            event:events(title, location, event_date)
          `)
          .eq('member_id', member.id)
          .order('check_in_time', { ascending: false })
          .limit(5);

        if (!error && data) {
          setRecentCheckIns(data);
        }
      }
    } catch (err: any) {
      console.error('Failed to load recent check-ins:', err);
    }
  };

  useEffect(() => {
    loadRecentCheckIns();
  }, []);

  useEffect(() => {
    const processCheckIn = async () => {
      const encodedData = searchParams.get('data');
      
      // If no QR data, show scanning instructions
      if (!encodedData) {
        setStatus('idle');
        return;
      }

      setStatus('processing');
      
      try {
        // Decode the QR data
        const payload = JSON.parse(atob(encodedData));
        
        // Validate payload
        if (!payload.eventId || payload.type !== 'event_checkin') {
          throw new Error('Invalid QR code. Please scan a valid event QR code.');
        }
        
        // Check if QR code expired (4 hours validity)
        if (payload.expiresAt && Date.now() > payload.expiresAt) {
          throw new Error('This QR code has expired. Please contact an administrator.');
        }
        
        // Get current logged-in member
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          try {
            localStorage.setItem('pendingCheckIn', encodedData);
          } catch {
            /* ignore quota / private mode */
          }
          navigate(buildLoginUrlWithReturn(encodedData), { replace: true });
          return;
        }
        
        // Get member details
        const { data: member, error: memberError } = await supabase
          .from('members')
          .select('id, first_name, last_name')
          .eq('user_id', user.id)
          .single();
        
        if (memberError || !member) {
          throw new Error('Member profile not found. Please contact the church office.');
        }
        
        setMemberName(`${member.first_name} ${member.last_name}`);
        
        // Get event details
        const { data: event, error: eventError } = await supabase
          .from('events')
          .select('id, title, event_date, location, event_type')
          .eq('id', payload.eventId)
          .single();
        
        if (eventError) {
          throw new Error('Event not found. Please contact an administrator.');
        }
        
        setEventDetails(event);
        
        // Check if already checked in
        const { data: existingCheckIn } = await supabase
          .from('attendance')
          .select('id')
          .eq('member_id', member.id)
          .eq('event_id', payload.eventId)
          .maybeSingle();
        
        if (existingCheckIn) {
          throw new Error(`You have already checked in for "${event.title}".`);
        }
        
        // Record attendance
        const { error: insertError } = await supabase
          .from('attendance')
          .insert({
            member_id: member.id,
            event_id: payload.eventId,
            attendance_date: new Date().toISOString().split('T')[0],
            attendance_type: mapEventTypeToAttendanceType(event.event_type),
            check_in_time: new Date().toISOString(),
            qr_scanned: true,
            created_at: new Date().toISOString()
          });
        
        if (insertError) {
          console.error('Attendance insert failed:', insertError);
          throw new Error(
            insertError.message ||
              'Could not save attendance. If this persists, ask an admin to verify database permissions for the attendance table.'
          );
        }
        
        setStatus('success');
        setMessage(`Welcome, ${member.first_name}! You have successfully checked in to "${event.title}".`);
        
        // Clear pending check-in and refresh recent check-ins
        localStorage.removeItem('pendingCheckIn');
        loadRecentCheckIns();
        
      } catch (err: any) {
        console.error('Check-in error:', err);
        setStatus('error');
        setMessage(err.message || 'Failed to check in. Please try again or contact the administrator.');
      }
    };
    
    processCheckIn();
  }, [searchParams, navigate]);

  // Fallback: older flows stored pending data without returnTo on the URL
  useEffect(() => {
    const run = async () => {
      const encodedData = searchParams.get('data');
      if (encodedData) return;

      const pendingData = localStorage.getItem('pendingCheckIn');
      if (!pendingData) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      navigate(`/member/qr-checkin?${new URLSearchParams({ data: pendingData }).toString()}`, { replace: true });
    };

    void run();
  }, [searchParams, navigate]);

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'service': return 'bg-blue-100 text-blue-800';
      case 'sabbath_school': return 'bg-green-100 text-green-800';
      case 'prayer_meeting': return 'bg-purple-100 text-purple-800';
      case 'event': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Processing state
  if (status === 'processing') {
    return (
      <div className="min-h-screen bg-gray-50">
        <MemberMobileNav title="Processing Check-in" />
        <PageLoader
          variant="inline"
          message="Recording your attendance…"
          className="bg-gray-50/80"
        />
      </div>
    );
  }
  
  // Success state
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50">
        <MemberMobileNav title="Check-in Successful" />
        <div className="max-w-md mx-auto p-4 mt-8">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            {eventDetails && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-semibold text-gray-900 mb-2">Event Details:</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(eventDetails.event_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(eventDetails.event_date).toLocaleTimeString()}</span>
                  </div>
                  {eventDetails.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{eventDetails.location}</span>
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
  
  // Error state
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50">
        <MemberMobileNav title="Check-in Failed" />
        <div className="max-w-md mx-auto p-4 mt-8">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Check-in Failed</h2>
            <p className="text-red-600 mb-6">{message}</p>
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
  
  // Idle state - show instructions for scanning QR code
  return (
    <div className="min-h-screen bg-gray-50">
      <MemberMobileNav title="QR Check-in" />
      
      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Instructions Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <QrCode className="w-12 h-12 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Scan Event QR Code</h2>
          <p className="text-gray-600 mb-4">
            Use your phone camera to scan the QR code displayed at the church entrance.
          </p>
          
          <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-blue-900 mb-3">How to check in:</h3>
            <ol className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-blue-800">
                <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                <span>Open your phone's camera app</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-blue-800">
                <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                <span>Point it at the QR code displayed at the entrance</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-blue-800">
                <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                <span>Tap the notification that appears</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-blue-800">
                <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</span>
                <span>Your attendance will be automatically recorded</span>
              </li>
            </ol>
          </div>
          
          <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
            <p className="font-medium text-gray-700 mb-1">📱 Need help?</p>
            <p>Make sure you're logged into your account. If not, you'll be prompted to log in when you scan.</p>
          </div>
        </div>

        {/* Recent Check-ins */}
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
                        <p className="font-medium text-gray-800">
                          {checkIn.event?.title || 'General Service'}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(checkIn.check_in_time).toLocaleDateString()} at {new Date(checkIn.check_in_time).toLocaleTimeString()}
                      </p>
                      {checkIn.event?.location && (
                        <p className="text-xs text-gray-500 mt-1">
                          📍 {checkIn.event.location}
                        </p>
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

        {/* Test Mode Card (for development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <p className="text-sm font-medium text-yellow-800 mb-2">🧪 Development Test Mode</p>
            <p className="text-xs text-yellow-700 mb-3">
              For testing purposes only. In production, members will scan QR codes with their camera.
            </p>
            <button
              onClick={() => {
                // For testing - simulate a QR scan with a test event
                const testPayload = btoa(JSON.stringify({
                  eventId: 'YOUR_TEST_EVENT_ID', // Replace with an actual event ID from your database
                  type: 'event_checkin',
                  timestamp: Date.now(),
                  expiresAt: Date.now() + (4 * 60 * 60 * 1000)
                }));
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