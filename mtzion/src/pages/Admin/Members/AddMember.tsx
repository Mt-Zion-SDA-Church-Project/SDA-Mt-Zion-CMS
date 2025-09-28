import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useNavigate } from 'react-router-dom';

const AddMember: React.FC = () => {
  const [form, setForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    gender: '',
    dateOfBirth: '',
    residence: '',
    placeOfBirth: '',
    ministries: [] as string[],
    phone: '',
    email: '',
    familyId: '',
    userId: '', // Link to system user
  });

  type FamilyOpt = { id: string; name: string };
  type MinistryOpt = { id: string; name: string; gender_restriction?: string };
  type SystemUserOpt = { id: string; user_id: string; full_name: string; username: string; email: string; role: string };
  const [familyOptions, setFamilyOptions] = useState<FamilyOpt[]>([]);
  const [ministryOptions, setMinistryOptions] = useState<MinistryOpt[]>([]);
  const [systemUserOptions, setSystemUserOptions] = useState<SystemUserOpt[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Special handling for system user selection: auto-fill name and email
    if (name === 'userId') {
      const selectedSystemUser = systemUserOptions.find(su => su.user_id === value);
      setForm((prev) => {
        const next = { ...prev, userId: value } as typeof prev;
        if (selectedSystemUser) {
          // Parse full name into first, middle, last
          const nameParts = selectedSystemUser.full_name.split(' ');
          next.firstName = nameParts[0] || '';
          next.middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';
          next.lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
          next.email = selectedSystemUser.email;
        } else {
          // Clear fields if no system user selected
          next.firstName = '';
          next.middleName = '';
          next.lastName = '';
          next.email = '';
        }
        return next;
      });
      return;
    }
    
    // Special handling for gender: auto-select gender-specific ministries
    if (name === 'gender') {
      setForm((prev) => {
        const next = { ...prev, gender: value } as typeof prev;
        
        // Remove ministries restricted to the opposite gender
        if (value === 'male') {
          // Remove ministries restricted to females
          next.ministries = prev.ministries.filter((m) => {
            const ministry = ministryOptions.find(opt => opt.name === m);
            return !ministry || ministry.gender_restriction !== 'female';
          });
          // Auto-select Men ministry if not already selected
          if (!next.ministries.includes('Men')) {
            next.ministries.push('Men');
          }
        }
        if (value === 'female') {
          // Remove ministries restricted to males
          next.ministries = prev.ministries.filter((m) => {
            const ministry = ministryOptions.find(opt => opt.name === m);
            return !ministry || ministry.gender_restriction !== 'male';
          });
          // Auto-select Women ministry if not already selected
          if (!next.ministries.includes('Women')) {
            next.ministries.push('Women');
          }
        }
        return next;
      });
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleMinistryChange = (ministryName: string, checked: boolean) => {
    setForm((prev) => {
      if (ministryName === 'None') {
        // When "None" is selected, clear all other ministries
        return { ...prev, ministries: checked ? ['None'] : [] };
      } else {
        // When any other ministry is selected, remove "None" if it exists
        const updatedMinistries = prev.ministries.filter(m => m !== 'None');
        
        if (checked) {
          return { ...prev, ministries: [...updatedMinistries, ministryName] };
        } else {
          return { ...prev, ministries: updatedMinistries.filter(m => m !== ministryName) };
        }
      }
    });
  };

  const isMinistryDisabled = (ministry: MinistryOpt) => {
    // Disable all ministries when "None" is selected
    if (form.ministries.includes('None')) return true;
    
    // Disable based on gender restrictions
    if (!form.gender) return false;
    if (form.gender === 'male' && ministry.gender_restriction === 'female') return true;
    if (form.gender === 'female' && ministry.gender_restriction === 'male') return true;
    return false;
  };

  useEffect(() => {
    // Load families, ministries, and system users from DB
    (async () => {
      try {
        // Load families
        const { data: familiesData, error: familiesError } = await supabase
          .from('families')
          .select('id, family_name')
          .order('family_name');
        if (!familiesError && familiesData) {
          setFamilyOptions(familiesData.map((f: any) => ({ id: f.id, name: f.family_name })));
        }

        // Load ministries
        const { data: ministriesData, error: ministriesError } = await supabase
          .from('ministries')
          .select('id, name, gender_restriction')
          .order('name');
        
        if (!ministriesError && ministriesData && ministriesData.length > 0) {
          setMinistryOptions(ministriesData.map((m: any) => ({ 
            id: m.id, 
            name: m.name, 
            gender_restriction: m.gender_restriction 
          })));
        } else {
          // Fallback to static ministries if table doesn't exist or is empty
          console.log('Ministries table not found or empty, using fallback');
          const fallbackMinistries = [
            { id: '1', name: 'None', gender_restriction: null },
            { id: '2', name: 'Coristers', gender_restriction: null },
            { id: '3', name: 'Deacon', gender_restriction: 'male' },
            { id: '4', name: 'Deaconess', gender_restriction: 'female' },
            { id: '5', name: 'Communication', gender_restriction: null },
            { id: '6', name: 'Education', gender_restriction: null },
            { id: '7', name: 'Family', gender_restriction: null },
            { id: '8', name: 'Sabbath School', gender_restriction: null },
            { id: '9', name: 'Health', gender_restriction: null },
            { id: '10', name: 'Men', gender_restriction: 'male' },
            { id: '11', name: 'Women', gender_restriction: 'female' },
            { id: '12', name: 'Stewardship', gender_restriction: null },
            { id: '13', name: 'Youth', gender_restriction: null },
            { id: '14', name: 'Publishing', gender_restriction: null },
          ];
          setMinistryOptions(fallbackMinistries);
        }

        // Load system users (only those not already linked to members)
        const { data: systemUsersData, error: systemUsersError } = await supabase
          .from('system_users')
          .select('id, user_id, full_name, username, email, role')
          .eq('is_active', true)
          .order('full_name');
        
        if (!systemUsersError && systemUsersData) {
          // Filter out system users who already have member records
          const { data: existingMembers } = await supabase
            .from('members')
            .select('user_id')
            .not('user_id', 'is', null);
          
          const existingUserIds = new Set(existingMembers?.map(m => m.user_id) || []);
          const availableSystemUsers = systemUsersData.filter(su => !existingUserIds.has(su.user_id));
          
          setSystemUserOptions(availableSystemUsers);
        }
      } catch (err) {
        console.error('Error loading options:', err);
        // Use fallback ministries on error
        const fallbackMinistries = [
          { id: '1', name: 'None', gender_restriction: null },
          { id: '2', name: 'Coristers', gender_restriction: null },
          { id: '3', name: 'Deacon', gender_restriction: 'male' },
          { id: '4', name: 'Deaconess', gender_restriction: 'female' },
          { id: '5', name: 'Communication', gender_restriction: null },
          { id: '6', name: 'Education', gender_restriction: null },
          { id: '7', name: 'Family', gender_restriction: null },
          { id: '8', name: 'Sabbath School', gender_restriction: null },
          { id: '9', name: 'Health', gender_restriction: null },
          { id: '10', name: 'Men', gender_restriction: 'male' },
          { id: '11', name: 'Women', gender_restriction: 'female' },
          { id: '12', name: 'Stewardship', gender_restriction: null },
          { id: '13', name: 'Youth', gender_restriction: null },
          { id: '14', name: 'Publishing', gender_restriction: null },
        ];
        setMinistryOptions(fallbackMinistries);
      }
    })();
  }, []);

  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const generateMemberNumber = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `MBR-${y}${m}${d}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Insert member (first try with place_of_birth)
      const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
      const insertPayload: any = {
        first_name: form.firstName,
        middle_name: form.middleName || null,
        last_name: form.lastName,
        gender: form.gender || null,
        date_of_birth: form.dateOfBirth || null,
        address: form.residence || null,
        place_of_birth: form.placeOfBirth || null,
        phone: form.phone || null,
        email: form.email || null,
        family_id: isUuid(form.familyId) ? form.familyId : null,
        user_id: form.userId || null, // Link to system user
        status: 'active',
        membership_date: new Date().toISOString().slice(0, 10),
        member_number: generateMemberNumber(),
      };

      let memberInsertRes = await supabase.from('members').insert(insertPayload).select('id').single();

      // Fallback if the place_of_birth column doesn't exist yet
      if (memberInsertRes.error && /place_of_birth/i.test(memberInsertRes.error.message || '')) {
        const { place_of_birth, ...withoutPlace } = insertPayload;
        memberInsertRes = await supabase.from('members').insert(withoutPlace).select('id').single();
        if (!memberInsertRes.error) {
          setSuccess('Member created (note: run DB migration to add place_of_birth).');
        }
      }

      if (memberInsertRes.error || !memberInsertRes.data) throw memberInsertRes.error || new Error('Insert failed');

      const memberId = memberInsertRes.data.id;

      // Insert ministries into join table (ignore None)
      const ministriesToSave = (form.ministries || []).filter((m) => m && m !== 'None');
      if (ministriesToSave.length > 0) {
        const rows = ministriesToSave.map((m) => ({ member_id: memberId, ministry_name: m }));
        const mmRes = await supabase.from('member_ministries').insert(rows);
        if (mmRes.error) {
          console.error('Error inserting ministries:', mmRes.error);
          // Continue without blocking member creation
          setError(`Member created but ministries could not be saved: ${mmRes.error.message}`);
        }
      }

      setSuccess((prev) => prev ?? 'Member created successfully');
      setForm((prev) => ({
        ...prev,
        firstName: '', middleName: '', lastName: '', gender: '', dateOfBirth: '',
        residence: '', placeOfBirth: '', ministries: [], phone: '', email: '', familyId: '', userId: ''
      }));
      // Don't navigate away - stay on the same page to see the new member in the right panel
    } catch (err: any) {
      setError(err.message || 'Failed to create member');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Add New Member</h1>
        <p className="text-gray-600">Create a new church member</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <span className="text-sm font-semibold">Register New Teenager</span>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">First Name</label>
            <input 
              name="firstName" 
              value={form.firstName} 
              onChange={handleChange} 
              className="w-full border rounded px-3 py-2" 
              disabled={!!form.userId}
              placeholder={form.userId ? "Auto-filled from system user" : "Enter first name"}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Last Name</label>
            <input 
              name="lastName" 
              value={form.lastName} 
              onChange={handleChange} 
              className="w-full border rounded px-3 py-2" 
              disabled={!!form.userId}
              placeholder={form.userId ? "Auto-filled from system user" : "Enter last name"}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Middle Name</label>
          <input 
            name="middleName" 
            value={form.middleName} 
            onChange={handleChange} 
            className="w-full border rounded px-3 py-2" 
            disabled={!!form.userId}
            placeholder={form.userId ? "Auto-filled from system user" : "Enter middle name"}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Gender</label>
            <select name="gender" value={form.gender} onChange={handleChange} className="w-full border rounded px-3 py-2">
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Date of Birth</label>
            <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} className="w-full border rounded px-3 py-2" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Residence</label>
            <input name="residence" value={form.residence} onChange={handleChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Place of Birth</label>
            <input name="placeOfBirth" value={form.placeOfBirth} onChange={handleChange} className="w-full border rounded px-3 py-2" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Ministries</label>
            <div className="w-full border rounded px-3 py-2 h-32 overflow-y-auto bg-white">
              {ministryOptions.length === 0 ? (
                <div className="text-sm text-gray-500">Loading ministries...</div>
              ) : (
                ministryOptions.map((ministry) => (
                  <div key={ministry.id} className="flex items-center space-x-2 py-1">
                    <input
                      type="checkbox"
                      id={`ministry-${ministry.id}`}
                      checked={form.ministries.includes(ministry.name)}
                      onChange={(e) => handleMinistryChange(ministry.name, e.target.checked)}
                      disabled={isMinistryDisabled(ministry)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <label 
                      htmlFor={`ministry-${ministry.id}`}
                      className={`text-sm ${isMinistryDisabled(ministry) ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 cursor-pointer'}`}
                    >
                      {ministry.name}
                    </label>
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Select multiple ministries</p>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Mobile Number</label>
            <input name="phone" value={form.phone} onChange={handleChange} className="w-full border rounded px-3 py-2" />
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Family</label>
          <select name="familyId" value={form.familyId} onChange={handleChange} className="w-full border rounded px-3 py-2">
            <option value="">Select Family</option>
            {familyOptions.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Link to System User (Optional)</label>
          <select name="userId" value={form.userId} onChange={handleChange} className="w-full border rounded px-3 py-2">
            <option value="">No System User Link</option>
            {systemUserOptions.map((su) => (
              <option key={su.id} value={su.user_id}>
                {su.full_name} ({su.username}) - {su.role}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">Link this member to an existing system user account. Name and email will be auto-filled.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <input 
              type="email" 
              name="email" 
              value={form.email} 
              onChange={handleChange} 
              className="w-full border rounded px-3 py-2" 
              disabled={!!form.userId}
              placeholder={form.userId ? "Auto-filled from system user" : "Enter email"}
            />
          </div>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        {success && <div className="text-sm text-green-600">{success}</div>}
            <div className="px-0 py-3 border-t">
          <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60">{submitting ? 'Saving...' : 'Save Member'}</button>
        </div>
      </form>
        </div>

        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
            <span className="text-sm font-semibold">Church Members List</span>
            <LiveMembersCount />
          </div>
          <MembersTable />
        </div>
      </div>
    </div>
  );
};

const LiveMembersCount: React.FC = () => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const load = async () => {
      const { count } = await supabase.from('members').select('*', { count: 'exact', head: true });
      setCount(count || 0);
    };
    load();
    const channel = supabase
      .channel('members-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);
  return <div className="text-xs text-gray-600">Number of Church Members: {count}</div>;
};

const MembersTable: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [query, setQuery] = useState('');
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
      console.error('Update failed:', err.message);
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
      console.error('Delete failed:', err.message);
    }
  };

  const load = async () => {
    try {
      console.log('Loading members...');
      const { data, error } = await supabase
        .from('members')
        .select(`
          id, first_name, middle_name, last_name, gender, address, place_of_birth, date_of_birth, phone, email, family_id, user_id,
          families:family_id(family_name),
          member_ministries(ministry_name),
          system_users:user_id(id, username, email, role, is_active, last_login)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) {
        console.error('Error loading members:', error);
        return;
      }
      
      console.log('Raw members data:', data);
      
      // Transform the data to include ministries as an array
      const transformedData = (data || []).map(member => ({
        ...member,
        ministries: member.member_ministries?.map((mm: any) => mm.ministry_name) || []
      }));
      
      console.log('Transformed members data:', transformedData);
      setRows(transformedData);
    } catch (err) {
      console.error('Failed to load members:', err);
    }
  };
  useEffect(() => {
    // Load families for edit dropdown
    const loadFamilies = async () => {
      try {
        const { data } = await supabase
          .from('families')
          .select('id, family_name')
          .order('family_name');
        if (data) {
          setFamilyOptions(data.map((f: any) => ({ id: f.id, name: f.family_name })));
        }
      } catch (err) {
        console.error('Error loading families:', err);
      }
    };

    load();
    loadFamilies();
    
    const channel = supabase
      .channel('members-add-side')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return rows;
    return rows.filter((m) =>
      [m.first_name, m.middle_name, m.last_name, m.gender, m.address, m.place_of_birth, m.phone, m.families?.family_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [rows, query]);

  return (
    <div className="px-4 pb-4 overflow-x-auto">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm text-gray-600">Search:</span>
        <input value={query} onChange={(e) => setQuery(e.target.value)} className="border rounded px-2 py-1 text-sm w-60" />
        <button onClick={handleDeleteSelected} disabled={selectedIds.length === 0} className="px-3 py-2 bg-red-600 text-white rounded text-sm disabled:opacity-60">Delete</button>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-3 py-2 bg-[#1f3b73] text-white rounded hover:opacity-90 text-sm ml-auto">Print List</button>
      </div>
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
          {filtered.length === 0 ? (
            <tr>
              <td className="p-2 text-gray-600" colSpan={7}>No data available in table</td>
            </tr>
          ) : (
            filtered.map((m) => (
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
  );
};

export default AddMember;



