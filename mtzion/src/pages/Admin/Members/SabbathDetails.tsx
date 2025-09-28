import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabase';

type KidRow = {
  id: string;
  churchName: string;
  location: string;
  sabbathTeacher: string;
};

const SabbathDetails: React.FC = () => {
  const [rows, setRows] = useState<KidRow[]>([]);
  const [query, setQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Load sabbath classes
        const { data: classes, error: classError } = await supabase
          .from('sabbath_classes')
          .select('id, church_name, location, sabbath_leader');
        if (classError) throw classError;

        const mapped: KidRow[] = (classes || []).map((c: any) => ({
          id: c.id,
          churchName: c.church_name || '',
          location: c.location || '',
          sabbathTeacher: c.sabbath_leader || '',
        }));
        setRows(mapped);
      } catch (err: any) {
        setError(err.message || 'Failed to load sabbath school details');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const data = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((m) =>
      [m.churchName, m.location, m.sabbathTeacher]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [rows, query]);

  const toggleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(data.slice(0, pageSize).map((r) => r.id)));
    else setSelectedIds(new Set());
  };

  const toggleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    const confirmDelete = window.confirm('Delete selected records? This cannot be undone.');
    if (!confirmDelete) return;
    try {
      setLoading(true);
      const { error: delError } = await supabase
        .from('sabbath_classes')
        .delete()
        .in('id', Array.from(selectedIds));
      if (delError) throw delError;
      setRows((prev) => prev.filter((r) => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
    } catch (err: any) {
      setError(err.message || 'Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-600">Number of Sabbath Schools: <span className="font-semibold">{data.length}</span></div>
        <button onClick={handlePrint} className="px-3 py-2 bg-primary text-white rounded hover:opacity-90">Print List</button>
      </div>

      <div className="flex items-center justify-between mb-3">
        <button onClick={handleDelete} disabled={selectedIds.size === 0 || loading} className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-60">Delete</button>
        <div className="flex items-center gap-3 ml-4">
          <label className="text-sm text-gray-600">Show</label>
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="border rounded px-2 py-1">
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span className="text-sm text-gray-600">records per page</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm text-gray-600">Search:</label>
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="border rounded px-2 py-1" />
        </div>
      </div>

      <div className="printable">
        <div className="hidden print:flex items-center mb-4">
          <img src="/logo.png" alt="Church logo" className="w-10 h-10 object-contain mr-3" />
          <h2 className="text-lg font-semibold">SDA Mt. Zion - Church Sunday School Kids</h2>
        </div>
        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
        {loading && <div className="text-sm text-gray-600 mb-2">Loading...</div>}
        <table className="w-full text-sm border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2 border-b">CHURCH NAME</th>
              <th className="text-left p-2 border-b">LOCATION</th>
              <th className="text-left p-2 border-b">SABBATH TEACHER</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, pageSize).map((m) => (
              <tr key={m.id} className="odd:bg-white even:bg-gray-50">
                <td className="p-2 border-b">{m.churchName}</td>
                <td className="p-2 border-b">{m.location}</td>
                <td className="p-2 border-b">{m.sabbathTeacher}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SabbathDetails;


