import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { queryKeys } from '../../../lib/queryKeys';

const MembersList: React.FC = () => {
  type Row = {
    id: string;
    name: string;
    gender: string;
    residence: string;
    placeOfBirth: string;
    birthday: string;
    family: string;
    ministry: string;
    mobile: string;
  };

  const [query, setQuery] = useState('');
  const [pageSize] = useState(10);
  const queryClient = useQueryClient();

  const { data: rows = [], isPending: loading, isError, error: queryError } = useQuery({
    queryKey: queryKeys.members.list(),
    queryFn: async () => {
      let membersSel = await supabase
        .from('members')
        .select('id, first_name, last_name, gender, address, place_of_birth, date_of_birth, phone, family_id');
      if (membersSel.error && /place_of_birth/i.test(membersSel.error.message || '')) {
        membersSel = await supabase
          .from('members')
          .select('id, first_name, last_name, gender, address, date_of_birth, phone, family_id');
      }
      const members = membersSel.data || [];

      const famIds = Array.from(new Set((members as any[]).map((m) => m.family_id).filter(Boolean)));
      const familyMap = new Map<string, string>();
      if (famIds.length > 0) {
        const famRes = await supabase.from('families').select('id, family_name').in('id', famIds);
        (famRes.data || []).forEach((f: any) => familyMap.set(f.id, f.family_name));
      }

      const mmRes = await supabase.from('member_ministries').select('member_id, ministry_name');
      const memberIdToMin = new Map<string, string[]>();
      (mmRes.data || []).forEach((r: any) => {
        const list = memberIdToMin.get(r.member_id) || [];
        list.push(r.ministry_name || r.ministry || '');
        memberIdToMin.set(r.member_id, list);
      });

      const mapped: Row[] = (members as any[]).map((m) => ({
        id: m.id,
        name: [m.first_name, m.last_name].filter(Boolean).join(' '),
        gender: (m.gender || '').toString().replace(/^./, (c: string) => c.toUpperCase()),
        residence: m.address || '',
        placeOfBirth: (m as any).place_of_birth || '',
        birthday: m.date_of_birth || '',
        family: (m.family_id && familyMap.get(m.family_id)) || '',
        ministry: (memberIdToMin.get(m.id) || []).filter(Boolean).join(', '),
        mobile: m.phone || '',
      }));
      return mapped;
    },
  });

  const error = isError && queryError ? (queryError as Error).message : null;

  useEffect(() => {
    const inv = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members.list() });
    };
    const channel = supabase
      .channel('members-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, inv)
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const data = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) => [r.name, r.gender, r.residence, r.placeOfBirth, r.birthday, r.family, r.ministry, r.mobile].join(' ').toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <div className="p-4">
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
          <span className="text-sm font-semibold">Church Members List</span>
          <div className="text-xs text-gray-600">Number of Church Members: {data.length}</div>
        </div>

        <div className="px-4 py-3 flex items-center gap-3">
          <button className="px-3 py-2 bg-red-500 text-white rounded text-sm" disabled>Delete</button>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-gray-600">Search:</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} className="border rounded px-2 py-1 text-sm w-60" />
          </div>
        </div>

        <div className="px-4 pb-4 overflow-x-auto">
          {error && <div className="text-sm text-red-600 px-1 mb-2">{error}</div>}
          {loading && <div className="text-sm text-gray-600 px-1 mb-2">Loading...</div>}
          <table className="min-w-full text-sm border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2 border-b">CHECK</th>
                <th className="text-left p-2 border-b">NAME</th>
                <th className="text-left p-2 border-b">GENDER</th>
                <th className="text-left p-2 border-b">RESIDENCE</th>
                <th className="text-left p-2 border-b">PLACE OF BIRTH</th>
                <th className="text-left p-2 border-b">BIRTHDAY</th>
                <th className="text-left p-2 border-b">FAMILY</th>
                <th className="text-left p-2 border-b">MINISTRY</th>
                <th className="text-left p-2 border-b">MOBILE NO.</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, pageSize).map((r) => (
                <tr key={r.id} className="odd:bg-white even:bg-gray-50">
                  <td className="p-2 border-b"><input type="checkbox" disabled /></td>
                  <td className="p-2 border-b">{r.name}</td>
                  <td className="p-2 border-b">{r.gender}</td>
                  <td className="p-2 border-b">{r.residence}</td>
                  <td className="p-2 border-b">{r.placeOfBirth}</td>
                  <td className="p-2 border-b">{r.birthday}</td>
                  <td className="p-2 border-b">{r.family}</td>
                  <td className="p-2 border-b">{r.ministry || 'None'}</td>
                  <td className="p-2 border-b">{r.mobile}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MembersList;


