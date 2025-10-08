import React from 'react';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import sdaLogo from '../../../assets/sda-logo.png';

const VisitorsDetails: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePrint = () => window.print();

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('visitors')
      .select('id, first_name, last_name, phone, email, address, date_of_birth, created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) setError(error.message);
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel('visitors-details')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitors' }, () => {
        load();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="p-4">
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden print-area">
        {/* Print-only header */}
        <div className="hidden print:flex items-center gap-3 p-4">
          <img src={sdaLogo} alt="SDA Logo" className="w-10 h-10 object-contain" />
          <div className="text-base font-semibold">Seventh-Day Adventist Church, Mt. Zion - Kigoma - Registered Visitors List</div>
        </div>
        {/* Header */}
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
          <span className="text-sm font-semibold">Registered Visitors List</span>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span>Number of Registered Visitors:</span>
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white">{rows.length}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="px-4 py-3 flex items-center gap-3 hide-on-print">
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
            <button onClick={handlePrint} className="inline-flex items-center gap-2 px-3 py-2 bg-[#1f3b73] text-white rounded hover:opacity-90 text-sm">Print List</button>
          </div>
        </div>

        {/* Table */}
        <div className="px-4 pb-4 overflow-x-auto">
          <table className="min-w-full text-sm border border-gray-200 print-table">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2 border-b">NAME</th>
                <th className="text-left p-2 border-b">ADDRESS</th>
                <th className="text-left p-2 border-b">DATE OF BIRTH</th>
                <th className="text-left p-2 border-b">EMAIL</th>
                <th className="text-left p-2 border-b">MOBILE NO.</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="p-2 text-gray-600" colSpan={4}>No data available in table</td>
                </tr>
              ) : (
                rows.map((v) => (
                  <tr key={v.id} className="odd:bg-white even:bg-gray-50">
                    <td className="p-2 border-b">{v.first_name} {v.last_name || ''}</td>
                    <td className="p-2 border-b">{v.address || '—'}</td>
                    <td className="p-2 border-b">{v.date_of_birth ? new Date(v.date_of_birth).toLocaleDateString() : '—'}</td>
                    <td className="p-2 border-b">{v.email || '—'}</td>
                    <td className="p-2 border-b">{v.phone || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Footer */}
          <div className="flex items-center justify-between text-sm text-gray-600 mt-3">
            <div>Showing {rows.length} entr{rows.length === 1 ? 'y' : 'ies'}</div>
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

export default VisitorsDetails;




