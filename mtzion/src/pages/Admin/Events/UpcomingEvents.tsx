import React from 'react';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { RefreshCw } from 'lucide-react';

const UpcomingEvents: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePrint = () => window.print();

  const load = async () => {
    setLoading(true);
    setError(null);
    const nowIso = new Date().toISOString();
    console.log('Loading upcoming events from:', nowIso); // Debug log
    
    const { data, error } = await supabase
      .from('events')
      .select('id, title, description, event_date, event_type, location')
      .gte('event_date', nowIso)
      .order('event_date', { ascending: true });
    
    if (error) {
      console.error('Error loading events:', error); // Debug log
      setError(error.message);
    } else {
      console.log('Loaded events:', data); // Debug log
      setEvents(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel('events-upcoming')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        load();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
            {error && <span className="text-sm text-red-600">{error}</span>}
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
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td className="p-2 text-gray-600 text-center" colSpan={5}>
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
    </div>
  );
};

export default UpcomingEvents;




