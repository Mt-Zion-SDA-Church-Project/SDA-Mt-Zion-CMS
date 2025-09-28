import React from 'react';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import QRCodeGenerator from '../../../components/QRCodeGenerator';

const AddEvent: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [eventType, setEventType] = useState('general');
  const [registrationRequired, setRegistrationRequired] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [selectedEventForQR, setSelectedEventForQR] = useState<any>(null);

  const loadEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('id, title, description, event_date, end_date, location, event_type')
      .order('event_date', { ascending: true });
    if (error) {
      setError(error.message);
      return;
    }
    setEvents(data || []);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    if (!title || !eventDate) {
      setError('Title and Event Date are required.');
      return;
    }
    
    // Validate that event date is in the future
    const eventDateTime = new Date(eventDate);
    const now = new Date();
    if (eventDateTime <= now) {
      setError('Event date must be in the future.');
      return;
    }
    
    setSaving(true);
    const payload: any = {
      title,
      description: description || null,
      event_date: eventDateTime.toISOString(),
      end_date: endDate ? new Date(endDate).toISOString() : null,
      location: location || null,
      event_type: eventType || 'general',
      registration_required: registrationRequired,
    };
    
    let error: any = null;
    if (editingId) {
      const res = await supabase.from('events').update(payload).eq('id', editingId);
      error = res.error;
    } else {
      const res = await supabase.from('events').insert(payload).single();
      error = res.error;
    }
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSuccess(editingId ? 'Event updated successfully!' : 'Event saved successfully!');
    setEditingId(null);
    setTitle('');
    setDescription('');
    setEventDate('');
    setEndDate('');
    setLocation('');
    setEventType('general');
    setRegistrationRequired(false);
    loadEvents();
  };

  const handleEdit = (ev: any) => {
    setEditingId(ev.id);
    setTitle(ev.title || '');
    setDescription(ev.description || '');
    setEventDate(ev.event_date ? new Date(ev.event_date).toISOString().slice(0,16) : '');
    setEndDate(ev.end_date ? new Date(ev.end_date).toISOString().slice(0,16) : '');
    setLocation(ev.location || '');
    setEventType(ev.event_type || 'general');
    setRegistrationRequired(!!ev.registration_required);
    setSuccess(null);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setEventDate('');
    setEndDate('');
    setLocation('');
    setEventType('general');
    setRegistrationRequired(false);
    setSuccess(null);
    setError(null);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    setError(null);
    const { error } = await supabase.from('events').delete().in('id', selectedIds);
    if (error) {
      setError(error.message);
      return;
    }
    setSelectedIds([]);
    setSuccess('Deleted successfully');
    loadEvents();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Add Event</h1>
        <p className="text-gray-600">Create an event and manage the list</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Add Event form */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden max-w-md">
          <div className="px-4 py-3 border-b bg-gray-50">
            <span className="text-sm font-semibold">ADD EVENT</span>
          </div>
          <div className="p-4 text-sm text-gray-700">Add Event Here:</div>
          <form className="px-4 pb-6 space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            {success && <div className="text-green-600 text-sm">{success}</div>}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Title</label>
              <input className="w-full border rounded px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Event Date</label>
                <input type="datetime-local" className="w-full border rounded px-3 py-2" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">End Date</label>
                <input type="datetime-local" className="w-full border rounded px-3 py-2" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Description</label>
              <textarea className="w-full border rounded px-3 py-2 h-24" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Location</label>
                <input className="w-full border rounded px-3 py-2" value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Type</label>
                <select className="w-full border rounded px-3 py-2" value={eventType} onChange={(e) => setEventType(e.target.value)}>
                  <option value="general">General</option>
                  <option value="service">Service</option>
                  <option value="meeting">Meeting</option>
                  <option value="camp">Camp</option>
                  <option value="prayer">Prayer</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input id="reg" type="checkbox" className="border rounded" checked={registrationRequired} onChange={(e) => setRegistrationRequired(e.target.checked)} />
              <label htmlFor="reg" className="text-sm text-gray-600">Registration required</label>
            </div>
            <div className="flex items-center gap-2">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60">{saving ? (editingId ? 'Updating...' : 'Saving...') : (editingId ? 'UPDATE' : 'SAVE')}</button>
              {editingId && (
                <button type="button" onClick={handleCancelEdit} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
              )}
            </div>
          </form>
        </div>

        {/* Right: Event list (from Supabase) */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
            <span className="text-sm font-semibold">Events</span>
            <div className="text-xs text-gray-600">Number of Events: <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white">{events.length}</span></div>
          </div>

          <div className="px-4 py-3 flex items-center gap-3">
            <button onClick={handleDeleteSelected} disabled={selectedIds.length === 0} className="px-3 py-2 bg-red-600 text-white rounded text-sm disabled:opacity-60">Delete</button>
            <div className="flex items-center gap-2 ml-2">
              <select className="border rounded px-2 py-1 text-sm">
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="text-sm text-gray-600">records per page</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-gray-600">Search:</span>
              <input className="border rounded px-2 py-1 text-sm w-60" />
            </div>
          </div>

          <div className="px-4 pb-4 overflow-x-auto">
            <table className="min-w-full text-sm border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2 border-b w-10"> </th>
                  <th className="text-left p-2 border-b">EVENT NAME</th>
                  <th className="text-left p-2 border-b">DESCRIPTION</th>
                  <th className="text-left p-2 border-b">DATE</th>
                  <th className="text-left p-2 border-b">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr>
                    <td className="p-2 border-b" />
                    <td className="p-2 border-b text-gray-600" colSpan={3}>No data available in table</td>
                    <td className="p-2 border-b" />
                  </tr>
                ) : (
                  events.map((ev) => (
                    <tr key={ev.id}>
                      <td className="p-2 border-b"><input type="checkbox" checked={selectedIds.includes(ev.id)} onChange={() => toggleSelect(ev.id)} /></td>
                      <td className="p-2 border-b">{ev.title}</td>
                      <td className="p-2 border-b">{ev.description || '-'}</td>
                      <td className="p-2 border-b">{new Date(ev.event_date).toLocaleString()}</td>
                      <td className="p-2 border-b text-right">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              setSelectedEventForQR(ev);
                              setShowQRGenerator(true);
                            }} 
                            className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                          >
                            QR Code
                          </button>
                          <button onClick={() => handleEdit(ev)} className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700">Edit</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="flex items-center justify-between text-sm text-gray-600 mt-3">
              <div>Showing 0 to 0 of 0 entries</div>
              <div className="flex items-center gap-2">
                <button className="px-2 py-1 border rounded text-gray-500" disabled>Previous</button>
                <button className="px-2 py-1 border rounded text-gray-500" disabled>Next</button>
              </div>
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
                <h3 className="text-lg font-semibold text-gray-900">Generate QR Code</h3>
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
                onQRGenerated={(qrCode) => {
                  // Optionally save QR code to database
                  console.log('QR Code generated:', qrCode);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddEvent;




