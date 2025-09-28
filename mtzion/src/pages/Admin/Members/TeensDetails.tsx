import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabase';

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
          .select('id, member_id, parent_member_id');
        if (childError) throw childError;

        const memberIds = Array.from(
          new Set((children || []).flatMap((c: any) => [c.member_id, c.parent_member_id]).filter(Boolean))
        );
        let membersById = new Map<string, any>();
        if (memberIds.length > 0) {
          const { data: members, error: membersError } = await supabase
            .from('members')
            .select('id, first_name, last_name, phone, address, gender, place_of_birth, date_of_birth')
            .in('id', memberIds);
          if (membersError) throw membersError;
          (members || []).forEach((m: any) => membersById.set(m.id, m));
        }

        const mapped: ChildRow[] = (children || []).map((c: any) => {
          const m = membersById.get(c.member_id) || {};
          const p = membersById.get(c.parent_member_id) || {};
          return {
            id: c.id,
            name: [m.first_name, m.last_name].filter(Boolean).join(' ') || '',
            gender: (m.gender || '').toString().replace(/^./, (char: string) => char.toUpperCase()),
            placeOfBirth: m.place_of_birth || '',
            birthday: m.date_of_birth || '',
            parent: [p.first_name, p.last_name].filter(Boolean).join(' ') || '',
            mobile: m.phone || '',
            residence: m.address || '',
          };
        });
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => {
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
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Church Children List</h2>
          <div className="text-xs text-gray-600">Number of Church Children: <span className="font-semibold">{data.length}</span></div>
        </div>

        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={handleDelete} disabled={selectedIds.size === 0 || loading} className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-60">Delete</button>
          <div className="ml-auto flex items-center gap-2">
            <label className="text-sm text-gray-600">Search:</label>
            <input value={query} onChange={(e) => setQuery(e.target.value)} className="border rounded px-2 py-1" />
          </div>
        </div>

        <div className="printable px-4 pb-4">
        <div className="hidden print:flex items-center mb-4">
          <img src="/logo.png" alt="Church logo" className="w-10 h-10 object-contain mr-3" />
          <h2 className="text-lg font-semibold">SDA Mt. Zion - Church Children List</h2>
        </div>
        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
        {loading && <div className="text-sm text-gray-600 mb-2">Loading...</div>}
        <table className="w-full text-sm border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2 border-b w-10"><input type="checkbox" onChange={(e) => toggleSelectAll(e.target.checked)} checked={data.slice(0, pageSize).every((r) => selectedIds.has(r.id)) && data.slice(0, pageSize).length > 0} /></th>
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
                <td className="p-2 border-b"><input type="checkbox" checked={selectedIds.has(m.id)} onChange={(e) => toggleSelectOne(m.id, e.target.checked)} /></td>
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


