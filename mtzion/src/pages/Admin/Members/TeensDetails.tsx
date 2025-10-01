import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import sdaLogo from '../../../assets/sda-logo.png';

type ChildRow = {
  id: string;
  name: string;
  gender: string;
  placeOfBirth: string;
  birthday: string;
  parent: string;
  mobile: string;
  residence: string;
};

const TeensDetails: React.FC = () => {
  const toDisplay = (value: any): string => {
    if (Array.isArray(value)) return value.filter(Boolean).join(', ');
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') {
      const trimmed = value.trim();
      // Handle Postgres array literal format e.g. {Seeta,"Kampala"}
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const inner = trimmed.slice(1, -1);
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        let escaped = false;
        for (let i = 0; i < inner.length; i++) {
          const ch = inner[i];
          if (escaped) {
            current += ch;
            escaped = false;
          } else if (ch === '\\') {
            escaped = true;
          } else if (ch === '"') {
            inQuotes = !inQuotes;
          } else if (ch === ',' && !inQuotes) {
            const token = current.trim();
            result.push(token.replace(/^"|"$/g, ''));
            current = '';
          } else {
            current += ch;
          }
        }
        if (current.length > 0) {
          const token = current.trim();
          result.push(token.replace(/^"|"$/g, ''));
        }
        return result.filter(Boolean).join(', ');
      }
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) return parsed.filter(Boolean).join(', ');
        } catch (_) {
          // fall through
        }
      }
    }
    return String(value);
  };
  const [rows, setRows] = useState<ChildRow[]>([]);
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
        const { data: children, error: childError } = await supabase
          .from('teens')
          .select('id, first_name, middle_name, last_name, gender, date_of_birth, address, place_of_birth, parent_name, mobile');
        if (childError) throw childError;
        const mapped: ChildRow[] = (children || []).map((c: any) => ({
          id: c.id,
          name: [toDisplay(c.first_name), toDisplay(c.middle_name), toDisplay(c.last_name)]
            .filter(Boolean)
            .join(' '),
          gender: toDisplay(c.gender).replace(/^./, (char: string) => char.toUpperCase()),
          placeOfBirth: toDisplay(c.place_of_birth),
          birthday: toDisplay(c.date_of_birth),
          parent: toDisplay(c.parent_name),
          mobile: toDisplay(c.mobile),
          residence: toDisplay(c.address),
        }));
        setRows(mapped);
      } catch (err: any) {
        setError(err.message || 'Failed to load children');
      } finally {
        setLoading(false);
      }
    };
    load();
    
    // Subscribe to real-time changes
    const channel = supabase
      .channel('teens-details-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teens' }, () => {
        load();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const data = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) => [r.name, r.gender, r.residence, r.placeOfBirth, r.birthday, r.parent, r.mobile]
      .join(' ').toLowerCase().includes(q));
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
    const ok = window.confirm('Delete selected children? This cannot be undone.');
    if (!ok) return;
    try {
      setLoading(true);
      const { error: delError } = await supabase.from('teens').delete().in('id', Array.from(selectedIds));
      if (delError) throw delError;
      setRows((prev) => prev.filter((r) => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
    } catch (err: any) {
      setError(err.message || 'Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden print-area">
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between hide-on-print">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Church Children List</h2>
            <p className="text-xs text-gray-500">Independent records - no login accounts required</p>
          </div>
          <div className="text-xs text-gray-600">Number of Church Children: <span className="font-semibold">{data.length}</span></div>
        </div>

        <div className="px-4 py-3 flex items-center gap-3 hide-on-print">
          <button onClick={handleDelete} disabled={selectedIds.size === 0 || loading} className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-60">Delete</button>
          <div className="ml-auto flex items-center gap-2">
            <label className="text-sm text-gray-600">Search:</label>
            <input value={query} onChange={(e) => setQuery(e.target.value)} className="border rounded px-2 py-1" />
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-3 py-2 bg-[#1f3b73] text-white rounded hover:opacity-90 text-sm">Print List</button>
          </div>
        </div>

        <div className="printable px-4 pb-4">
          <div className="hidden print:flex items-center mb-4">
            <img src={sdaLogo} alt="SDA Logo" className="w-10 h-10 object-contain mr-3" />
            <h2 className="text-lg font-semibold">SDA Mt. Zion - Church Children List</h2>
          </div>
        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
        {loading && <div className="text-sm text-gray-600 mb-2">Loading...</div>}
          <table className="w-full text-sm border border-gray-200 print-table">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2 border-b w-10 col-check"><input type="checkbox" onChange={(e) => toggleSelectAll(e.target.checked)} checked={data.slice(0, pageSize).every((r) => selectedIds.has(r.id)) && data.slice(0, pageSize).length > 0} /></th>
              <th className="text-left p-2 border-b">NAME</th>
              <th className="text-left p-2 border-b">GENDER</th>
              <th className="text-left p-2 border-b">RESIDENCE</th>
              <th className="text-left p-2 border-b">PLACE OF BIRTH</th>
              <th className="text-left p-2 border-b">BIRTHDAY</th>
              <th className="text-left p-2 border-b">PARENT</th>
              <th className="text-left p-2 border-b">MOBILE NO.</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, pageSize).map((m) => (
              <tr key={m.id} className="odd:bg-white even:bg-gray-50">
                <td className="p-2 border-b col-check"><input type="checkbox" checked={selectedIds.has(m.id)} onChange={(e) => toggleSelectOne(m.id, e.target.checked)} /></td>
                <td className="p-2 border-b">{m.name}</td>
                <td className="p-2 border-b">{m.gender}</td>
                <td className="p-2 border-b">{m.residence}</td>
                <td className="p-2 border-b">{m.placeOfBirth}</td>
                <td className="p-2 border-b">{m.birthday}</td>
                <td className="p-2 border-b">{m.parent}</td>
                <td className="p-2 border-b">{m.mobile}</td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeensDetails;


