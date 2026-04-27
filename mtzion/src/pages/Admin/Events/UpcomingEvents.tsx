import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { queryKeys } from '../../../lib/queryKeys';
import { RefreshCw, QrCode } from 'lucide-react';
import QRCodeGenerator from '../../../components/QRCodeGenerator';

const UpcomingEvents: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: events = [], isFetching, isError, error, refetch: load } = useQuery({
    queryKey: queryKeys.events.upcoming(),
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      console.log('Loading upcoming events from:', nowIso); // Debug log

      const { data, error: qError } = await supabase
        .from('events')
        .select('id, title, description, event_date, end_date, event_type, location')
        .gte('event_date', nowIso)
        .order('event_date', { ascending: true });

      if (qError) {
        console.error('Error loading events:', qError); // Debug log
        throw qError;
      }
      console.log('Loaded events:', data); // Debug log
      return data || [];
    },
  });

  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [selectedEventForQR, setSelectedEventForQR] = useState<any>(null);

  const handlePrint = () => window.print();
  const loading = isFetching;

  useEffect(() => {
    const inv = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.upcoming() });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'logs', 'activity'], exact: false });
    };
    const channel = supabase
      .channel('events-upcoming')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, inv)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return (
    <div className="p-4">
      {/* Make this block printable */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden print-area">
        {/* Header */}
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
          <span className="text-sm font-semibold">Upcoming Events</span>
          <div className="flex items-center gap-3 hide-on-print">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs">{events.length}</span>
            <button onClick={handlePrint} className="inline-flex items-center gap-2 px-3 py-2 bg-[#1f3b73] text-white rounded hover:opacity-90 text-sm">Print List</button>
          </div>
        </div>

        {/* Controls */}
        <div className="px-4 py-3 flex items-center gap-3 hide-on-print">
          <button 
            onClick={load} 
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="flex items-center gap-2">
            <select className="border rounded px-2 py-1 text-sm">
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span className="text-sm text-gray-600">records per page</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {loading && <span className="text-sm text-gray-600">Loading...</span>}
            {isError && error && <span className="text-sm text-red-600">{(error as Error).message}</span>}
          </div>
        </div>

        {/* Table */}
        <div className="px-4 pb-4 overflow-x-auto">
          <table className="min-w-full text-sm border border-gray-200 print-table">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2 border-b">TITLE</th>
                <th className="text-left p-2 border-b">DATE & TIME</th>
                <th className="text-left p-2 border-b">TYPE</th>
                <th className="text-left p-2 border-b">LOCATION</th>
                <th className="text-left p-2 border-b">DESCRIPTION</th>
                <th className="text-left p-2 border-b hide-on-print">QR CODE</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td className="p-2 text-gray-600 text-center" colSpan={6}>
                    {loading ? 'Loading events...' : 'No upcoming events found'}
                  </td>
                </tr>
              ) : (
                events.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="p-2 border-b font-medium">{e.title}</td>
                    <td className="p-2 border-b">
                      <div className="text-sm">
                        {new Date(e.event_date).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(e.event_date).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="p-2 border-b">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        {e.event_type || 'General'}
                      </span>
                    </td>
                    <td className="p-2 border-b">{e.location || '—'}</td>
                    <td className="p-2 border-b max-w-xs truncate">{e.description || '—'}</td>
                    <td className="p-2 border-b hide-on-print">
                      <button
                        onClick={() => {
                          setSelectedEventForQR(e);
                          setShowQRGenerator(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Generate QR Code for this event"
                      >
                        <QrCode className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Footer */}
          <div className="flex items-center justify-between text-sm text-gray-600 mt-3">
            <div>Showing {events.length} entr{events.length === 1 ? 'y' : 'ies'}</div>
            <div className="flex items-center gap-2">
              <button className="px-2 py-1 border rounded text-gray-500" disabled>Previous</button>
              <button className="px-2 py-1 border rounded text-gray-500" disabled>Next</button>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Generator Modal */}
      {showQRGenerator && selectedEventForQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Generate QR Code for Check-in</h3>
                <button
                  onClick={() => {
                    setShowQRGenerator(false);
                    setSelectedEventForQR(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <QRCodeGenerator
                eventId={selectedEventForQR.id}
                eventTitle={selectedEventForQR.title}
                eventDate={selectedEventForQR.event_date}
                endDate={selectedEventForQR.end_date ?? null}
                onQRGenerated={(qrCode) => {
                  console.log('QR Code generated for:', selectedEventForQR.title);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpcomingEvents;