import React from 'react';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

const MemberDetails: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    gender: '',
    dateOfBirth: '',
    residence: '',
    placeOfBirth: '',
    phone: '',
    email: '',
    familyId: '',
  });
  const [familyOptions, setFamilyOptions] = useState<{id: string; name: string}[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Loading members in MemberDetails...');
      const { data, error } = await supabase
        .from('members')
        .select(`
          id, first_name, middle_name, last_name, gender, address, place_of_birth, date_of_birth, phone, email, family_id, user_id,
          families:family_id(family_name),
          member_ministries(ministry_name),
          system_users:user_id(id, username, email, role, is_active, last_login)
        `)
        .order('created_at', { ascending: false })
        .limit(500);
      
      if (error) {
        console.error('Error loading members in MemberDetails:', error);
        setError(error.message);
        setLoading(false);
        return;
      }
      
      console.log('Raw members data in MemberDetails:', data);
      
      // Transform the data to include ministries as an array
      const transformedData = (data || []).map(member => ({
        ...member,
        ministries: member.member_ministries?.map((mm: any) => mm.ministry_name) || []
      }));
      
      console.log('Transformed members data in MemberDetails:', transformedData);
      setRows(transformedData);
      setLoading(false);
    } catch (err: any) {
      console.error('Failed to load members in MemberDetails:', err);
      setError(err.message || 'Failed to load members');
      setLoading(false);
    }
  };

  const loadFamilies = async () => {
    const { data } = await supabase
      .from('families')
      .select('id, family_name')
      .order('family_name');
    if (data) {
      setFamilyOptions(data.map((f: any) => ({ id: f.id, name: f.family_name })));
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = (m: any) => {
    setEditingId(m.id);
    setEditForm({
      firstName: m.first_name || '',
      middleName: m.middle_name || '',
      lastName: m.last_name || '',
      gender: m.gender || '',
      dateOfBirth: m.date_of_birth ? new Date(m.date_of_birth).toISOString().slice(0,10) : '',
      residence: m.address || '',
      placeOfBirth: m.place_of_birth || '',
      phone: m.phone || '',
      email: m.email || '',
      familyId: m.family_id || '',
    });
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    try {
      const payload: any = {
        first_name: editForm.firstName,
        middle_name: editForm.middleName || null,
        last_name: editForm.lastName,
        gender: editForm.gender || null,
        date_of_birth: editForm.dateOfBirth || null,
        address: editForm.residence || null,
        place_of_birth: editForm.placeOfBirth || null,
        phone: editForm.phone || null,
        email: editForm.email || null,
        family_id: editForm.familyId || null,
      };
      const { error } = await supabase.from('members').update(payload).eq('id', editingId);
      if (error) throw error;
      setEditingId(null);
      load();
    } catch (err: any) {
      setError(err.message || 'Update failed');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      firstName: '', middleName: '', lastName: '', gender: '', dateOfBirth: '',
      residence: '', placeOfBirth: '', phone: '', email: '', familyId: ''
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    const ok = window.confirm('Delete selected members?');
    if (!ok) return;
    try {
      const { error } = await supabase.from('members').delete().in('id', selectedIds);
      if (error) throw error;
      setSelectedIds([]);
      load();
    } catch (err: any) {
      setError(err.message || 'Delete failed');
    }
  };

  useEffect(() => {
    load();
    loadFamilies();
    const channel = supabase
      .channel('members-details')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => {
        load();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="p-4">
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
          <span className="text-sm font-semibold">Church Members List</span>
          <div className="text-xs text-gray-600">Number of Church Members: {rows.length}</div>
        </div>

        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={handleDeleteSelected} disabled={selectedIds.length === 0} className="px-3 py-2 bg-red-500 text-white rounded text-sm disabled:opacity-60">Delete</button>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-gray-600">Search:</span>
            <input className="border rounded px-2 py-1 text-sm w-60" />
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-3 py-2 bg-[#1f3b73] text-white rounded hover:opacity-90 text-sm">Print List</button>
          </div>
        </div>

        <div className="px-4 pb-4 overflow-x-auto">
          <table className="min-w-full text-sm border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2 border-b">CHECK</th>
                <th className="text-left p-2 border-b">NAME</th>
                <th className="text-left p-2 border-b">GENDER</th>
                <th className="text-left p-2 border-b">FAMILY</th>
                <th className="text-left p-2 border-b">MINISTRY</th>
                <th className="text-left p-2 border-b">MOBILE NO.</th>
                <th className="text-left p-2 border-b">SYSTEM USER</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="p-2 text-gray-600" colSpan={7}>{loading ? 'Loading...' : 'No data available in table'}</td>
                </tr>
              ) : (
                rows.map((m) => (
                  <tr key={m.id} className="odd:bg-white even:bg-gray-50">
                    <td className="p-2 border-b"><input type="checkbox" checked={selectedIds.includes(m.id)} onChange={() => toggleSelect(m.id)} /></td>
                    {editingId === m.id ? (
                      <>
                        <td className="p-2 border-b">
                          <input name="firstName" value={editForm.firstName} onChange={handleEditChange} className="w-full border rounded px-2 py-1 text-xs" placeholder="First" />
                          <input name="lastName" value={editForm.lastName} onChange={handleEditChange} className="w-full border rounded px-2 py-1 text-xs mt-1" placeholder="Last" />
                        </td>
                        <td className="p-2 border-b">
                          <select name="gender" value={editForm.gender} onChange={handleEditChange} className="w-full border rounded px-2 py-1 text-xs">
                            <option value="">—</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                          </select>
                        </td>
                        <td className="p-2 border-b">
                          <select name="familyId" value={editForm.familyId} onChange={handleEditChange} className="w-full border rounded px-2 py-1 text-xs">
                            <option value="">—</option>
                            {familyOptions.map((f) => (
                              <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 border-b">—</td>
                        <td className="p-2 border-b">
                          <input name="phone" value={editForm.phone} onChange={handleEditChange} className="w-full border rounded px-2 py-1 text-xs" />
                        </td>
                        <td className="p-2 border-b">—</td>
                        <td className="p-2 border-b text-right">
                          <button onClick={handleUpdate} className="px-3 py-1 bg-green-600 text-white rounded text-xs">Save</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-2 border-b">{[m.first_name, m.middle_name, m.last_name].filter(Boolean).join(' ')}</td>
                        <td className="p-2 border-b capitalize">{m.gender || '—'}</td>
                        <td className="p-2 border-b">{m.families?.family_name || '—'}</td>
                        <td className="p-2 border-b">{Array.isArray(m.ministries) ? m.ministries.join(', ') : '—'}</td>
                        <td className="p-2 border-b">{m.phone || '—'}</td>
                        <td className="p-2 border-b">
                          {m.system_users ? (
                            <div className="text-xs">
                              <div className="font-medium">{m.system_users.username}</div>
                              <div className="text-gray-500">{m.system_users.email}</div>
                              <div className="text-gray-500 capitalize">{m.system_users.role}</div>
                              {m.system_users.is_active ? (
                                <span className="text-green-600">Active</span>
                              ) : (
                                <span className="text-red-600">Inactive</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="p-2 border-b text-right">
                          <button onClick={() => handleEdit(m)} className="px-3 py-1 bg-green-600 text-white rounded text-xs">Edit</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MemberDetails;






