import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import QRScanner from '../../components/QRScanner';
import SimpleQRGenerator from '../../components/SimpleQRGenerator';
import MobileQRTest from '../../components/MobileQRTest';
import { QrCode, CheckCircle, Clock, Calendar, MapPin, Users } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  end_date?: string;
  location?: string;
  event_type: string;
  max_attendees?: number;
  registration_required: boolean;
}

const MemberQRCheckIn: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [recentCheckIns, setRecentCheckIns] = useState<any[]>([]);

  useEffect(() => {
    loadUpcomingEvents();
    loadRecentCheckIns();
  }, []);

  const loadUpcomingEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, description, event_date, end_date, location, event_type, max_attendees, registration_required')
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(10);

      if (error) throw error;
      setEvents(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load events');
    }
  };

  const loadRecentCheckIns = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          id,
          check_in_time,
          qr_scanned,
          event:events(title, location),
          member:members(first_name, last_name)
        `)
        .eq('attendance_date', today)
        .order('check_in_time', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentCheckIns(data || []);
    } catch (err: any) {
      console.error('Failed to load recent check-ins:', err);
    }
  };

  const handleScanSuccess = (memberId: string, memberName: string) => {
    setSuccess(`Successfully checked in: ${memberName}`);
    setError(null);
    loadRecentCheckIns(); // Refresh recent check-ins
  };

  const handleScanError = (errorMessage: string) => {
    setError(errorMessage);
    setSuccess(null);
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'service': return 'bg-blue-100 text-blue-800';
      case 'sabbath_school': return 'bg-green-100 text-green-800';
      case 'prayer_meeting': return 'bg-purple-100 text-purple-800';
      case 'event': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <QrCode className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">QR Code Check-in</h1>
          <p className="text-sm sm:text-base text-gray-600">Scan QR codes to check in to events and services</p>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-green-600">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* QR Scanner */}
        <div className="space-y-4">
          <QRScanner
            eventId={selectedEvent?.id}
            onScanSuccess={handleScanSuccess}
            onScanError={handleScanError}
          />
          
          {/* Mobile QR Test (for phones) */}
          <MobileQRTest />
          
          {/* Desktop QR Generator (for testing) */}
          <SimpleQRGenerator />
        </div>

        {/* Event Selection */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-6 h-6 text-primary" />
            <h3 className="text-lg font-semibold text-gray-900">Select Event</h3>
          </div>

          <div className="space-y-3">
            <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <button
                onClick={() => setSelectedEvent(null)}
                className={`w-full text-left ${!selectedEvent ? 'text-primary font-medium' : 'text-gray-700'}`}
              >
                <div className="flex items-center justify-between">
                  <span>General Service Check-in</span>
                  {!selectedEvent && <CheckCircle className="w-4 h-4 text-primary" />}
                </div>
                <p className="text-sm text-gray-500 mt-1">For regular church services</p>
              </button>
            </div>

            {events.map((event) => (
              <div key={event.id} className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <button
                  onClick={() => setSelectedEvent(event)}
                  className={`w-full text-left ${selectedEvent?.id === event.id ? 'text-primary font-medium' : 'text-gray-700'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{event.title}</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEventTypeColor(event.event_type)}`}>
                        {event.event_type.replace('_', ' ')}
                      </span>
                      {selectedEvent?.id === event.id && <CheckCircle className="w-4 h-4 text-primary" />}
                    </div>
                  </div>
                  
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{new Date(event.event_date).toLocaleDateString()} at {new Date(event.event_date).toLocaleTimeString()}</span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    {event.max_attendees && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>Max {event.max_attendees} attendees</span>
                      </div>
                    )}
                  </div>
                </button>
              </div>
            ))}
          </div>

          {events.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No upcoming events</p>
              <p className="text-sm">Events will appear here when scheduled</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Check-ins */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-50">
          <div className="flex items-center gap-2 text-gray-800">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Recent Check-ins Today</h3>
          </div>
        </div>

        <div className="p-4">
          {recentCheckIns.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No check-ins today</p>
              <p className="text-sm">Check-ins will appear here as members scan QR codes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentCheckIns.map((checkIn) => (
                <div key={checkIn.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="font-medium text-gray-800">
                        {checkIn.member?.first_name} {checkIn.member?.last_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {checkIn.event?.title || 'General Service'}
                        {checkIn.event?.location && ` • ${checkIn.event.location}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-800">
                      {new Date(checkIn.check_in_time).toLocaleTimeString()}
                    </p>
                    <div className="flex items-center gap-1">
                      <QrCode className="w-3 h-3 text-green-600" />
                      <span className="text-xs text-green-600">QR Scan</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberQRCheckIn;
