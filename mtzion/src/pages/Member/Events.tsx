import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/queryKeys';
import { Calendar, Clock, MapPin, Users, Filter, Search, Share2, Mail, MessageCircle, Link as LinkIcon, Check } from 'lucide-react';
import MemberMobileNav from '../../components/Member/MemberMobileNav';

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

function formatEventDate(dateString: string) {
  const date = new Date(dateString);
  return {
    date: date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    time: date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }),
  };
}

async function fetchMemberEvents(filterType: string, filterDate: string): Promise<Event[]> {
  let query = supabase
    .from('events')
    .select('id, title, description, event_date, end_date, location, event_type, max_attendees, registration_required')
    .order('event_date', { ascending: true });

  if (filterDate === 'upcoming') {
    query = query.gte('event_date', new Date().toISOString());
  } else if (filterDate === 'past') {
    query = query.lt('event_date', new Date().toISOString());
  } else if (filterDate === 'today') {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    query = query.gte('event_date', startOfDay.toISOString()).lt('event_date', endOfDay.toISOString());
  }

  if (filterType !== 'all') {
    query = query.eq('event_type', filterType);
  }

  const { data, error: fetchError } = await query;
  if (fetchError) throw fetchError;
  return (data as Event[]) || [];
}

const MemberEvents: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('upcoming');
  const [shareOpenId, setShareOpenId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const eventsQuery = useQuery({
    queryKey: queryKeys.memberPortal.eventsList(filterType, filterDate),
    queryFn: () => fetchMemberEvents(filterType, filterDate),
  });

  const events = eventsQuery.data ?? [];
  const loading = eventsQuery.isPending;
  const error = eventsQuery.error ? (eventsQuery.error as Error).message : null;

  useEffect(() => {
    const channel = supabase
      .channel('member-events-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['member', 'events', 'list'] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const filteredEvents = events.filter((event) => {
    if (!searchQuery.trim()) return true;

    const searchTerm = searchQuery.toLowerCase();
    return (
      event.title.toLowerCase().includes(searchTerm) ||
      event.description?.toLowerCase().includes(searchTerm) ||
      event.location?.toLowerCase().includes(searchTerm) ||
      event.event_type.toLowerCase().includes(searchTerm)
    );
  });

  const buildEventShareUrl = (eventId: string) => {
    const base = window.location.origin || '';
    return `${base}/member/events?eid=${encodeURIComponent(eventId)}`;
  };

  const buildEventShareText = (e: Event) => {
    const { date, time } = formatEventDate(e.event_date);
    const lines = [e.title, e.description ? e.description : undefined, `When: ${date} at ${time}`, e.location ? `Where: ${e.location}` : undefined]
      .filter(Boolean)
      .join('\n');
    return lines;
  };

  const shareViaWeb = async (e: Event) => {
    try {
      if ((navigator as { share?: (opts: object) => Promise<void> }).share) {
        await (navigator as { share: (opts: object) => Promise<void> }).share({
          title: e.title,
          text: buildEventShareText(e),
          url: buildEventShareUrl(e.id),
        });
      } else {
        await copyEventLink(e);
      }
    } catch {
      /* user may cancel */
    }
  };

  const copyEventLink = async (e: Event) => {
    try {
      await navigator.clipboard.writeText(`${buildEventShareText(e)}\n${buildEventShareUrl(e.id)}`);
      setCopiedId(e.id);
      setTimeout(() => setCopiedId((prev) => (prev === e.id ? null : prev)), 1500);
    } catch {
      /* ignore */
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'service':
        return 'bg-blue-100 text-blue-800';
      case 'sabbath_school':
        return 'bg-green-100 text-green-800';
      case 'prayer_meeting':
        return 'bg-purple-100 text-purple-800';
      case 'event':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <MemberMobileNav title="Events" />
      <div className="flex items-center gap-3">
        <Calendar className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Upcoming Events</h1>
          <p className="text-gray-600">View and manage church events</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-2 text-gray-800">
            <Filter className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Filters</h3>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" />
              <input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-3 py-2 border rounded-md text-sm w-64"
              />
            </div>

            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="border rounded-md px-3 py-2 text-sm">
              <option value="all">All Types</option>
              <option value="service">Service</option>
              <option value="sabbath_school">Sabbath School</option>
              <option value="prayer_meeting">Prayer Meeting</option>
              <option value="event">Events</option>
            </select>

            <select value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="border rounded-md px-3 py-2 text-sm">
              <option value="upcoming">Upcoming</option>
              <option value="today">Today</option>
              <option value="past">Past Events</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800">Events</h3>
        </div>

        <div className="p-4">
          {error && <div className="text-sm text-red-600 mb-4 p-3 bg-red-50 rounded-md">{error}</div>}

          {loading && <div className="text-sm text-gray-600 mb-4 p-3 bg-gray-50 rounded-md">Loading events...</div>}

          <div className="space-y-4">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No events found</h3>
                <p className="text-sm">
                  {searchQuery ? 'Try adjusting your search criteria' : 'No events match your current filters'}
                </p>
              </div>
            ) : (
              filteredEvents.map((event) => {
                const { date, time } = formatEventDate(event.event_date);
                return (
                  <div key={event.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-semibold text-gray-900 mb-1">{event.title}</h4>
                        {event.description && <p className="text-gray-600 text-sm mb-2 line-clamp-2">{event.description}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEventTypeColor(event.event_type)}`}>
                          {event.event_type.replace('_', ' ')}
                        </span>
                        <div className="relative">
                          <button
                            onClick={() => setShareOpenId((id) => (id === event.id ? null : event.id))}
                            className="p-2 rounded-md border hover:bg-gray-50"
                            title="Share"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          {shareOpenId === event.id && (
                            <div className="absolute right-0 mt-2 w-56 bg-white border rounded-lg shadow-lg z-10">
                              <div className="p-2">
                                <button
                                  onClick={() => {
                                    void shareViaWeb(event);
                                    setShareOpenId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-50 text-sm"
                                >
                                  <Share2 className="w-4 h-4" /> Share (device)
                                </button>
                                <a
                                  href={`mailto:?subject=${encodeURIComponent(event.title)}&body=${encodeURIComponent(buildEventShareText(event) + '\n' + buildEventShareUrl(event.id))}`}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-50 text-sm"
                                  onClick={() => setShareOpenId(null)}
                                >
                                  <Mail className="w-4 h-4" /> Email
                                </a>
                                <a
                                  href={`https://wa.me/?text=${encodeURIComponent(buildEventShareText(event) + '\n' + buildEventShareUrl(event.id))}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-50 text-sm"
                                  onClick={() => setShareOpenId(null)}
                                >
                                  <MessageCircle className="w-4 h-4" /> WhatsApp
                                </a>
                                <button
                                  onClick={() => {
                                    void copyEventLink(event);
                                    setShareOpenId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-50 text-sm"
                                >
                                  {copiedId === event.id ? <Check className="w-4 h-4 text-green-600" /> : <LinkIcon className="w-4 h-4" />}
                                  {copiedId === event.id ? 'Copied!' : 'Copy link'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <div>
                          <p className="font-medium">{date}</p>
                          <p className="text-xs">{time}</p>
                        </div>
                      </div>

                      {event.location && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="w-4 h-4 text-green-600" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}

                      {event.max_attendees && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Users className="w-4 h-4 text-purple-600" />
                          <span>Max {event.max_attendees} attendees</span>
                        </div>
                      )}
                    </div>

                    {event.registration_required && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-orange-600 text-sm">
                          <Clock className="w-4 h-4" />
                          <span className="font-medium">Registration Required</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
            <div>
              Showing {filteredEvents.length} of {events.length} events
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberEvents;
