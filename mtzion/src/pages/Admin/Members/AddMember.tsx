import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { queryKeys } from '../../../lib/queryKeys';
import { formatZodError, addMemberFormSchema } from '../../../lib/validation';

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
  type MinistryOpt = { id: string; name: string; gender_restriction?: string | null };
  type SystemUserOpt = { id: string; user_id: string; full_name: string; username: string; email: string; role: string };
  const queryClient = useQueryClient();

  const fallbackMinistries: MinistryOpt[] = [
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

  const { data: familyOptions = [] } = useQuery({
    queryKey: queryKeys.addMember.families(),
    queryFn: async () => {
      const { data: familiesData, error: familiesError } = await supabase
        .from('families')
        .select('id, family_name')
        .order('family_name');
      if (familiesError || !familiesData) return [] as FamilyOpt[];
      return familiesData.map((f: any) => ({ id: f.id, name: f.family_name }));
    },
  });

  const { data: ministryOptions = [] } = useQuery({
    queryKey: queryKeys.addMember.ministries(),
    queryFn: async () => {
      const { data: ministriesData, error: ministriesError } = await supabase
        .from('ministries')
        .select('id, name, gender_restriction')
        .order('name');
      if (!ministriesError && ministriesData && ministriesData.length > 0) {
        return ministriesData.map((m: any) => ({
          id: m.id,
          name: m.name,
          gender_restriction: m.gender_restriction,
        })) as MinistryOpt[];
      }
      return fallbackMinistries;
    },
  });

  const { data: systemUserOptions = [] } = useQuery({
    queryKey: queryKeys.addMember.systemUsers(),
    queryFn: async () => {
      const { data: systemUsersData, error: systemUsersError } = await supabase
        .from('system_users')
        .select('id, user_id, full_name, username, email, role')
        .eq('is_active', true)
        .order('full_name');
      if (systemUsersError || !systemUsersData) return [] as SystemUserOpt[];
      const { data: existingMembers } = await supabase
        .from('members')
        .select('user_id')
        .not('user_id', 'is', null);
      const existingUserIds = new Set(existingMembers?.map(m => m.user_id) || []);
      return systemUsersData.filter((su: any) => !existingUserIds.has(su.user_id)) as SystemUserOpt[];
    },
  });

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

  const submitMutation = useMutation({
    mutationFn: async (vars: { form: typeof form; ministryOptions: MinistryOpt[] }) => {
      const { form: f, ministryOptions: mo } = vars;
      const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
      const insertPayload: any = {
        first_name: f.firstName,
        middle_name: f.middleName || null,
        last_name: f.lastName,
        gender: f.gender || null,
        date_of_birth: f.dateOfBirth || null,
        address: f.residence || null,
        place_of_birth: f.placeOfBirth || null,
        phone: f.phone || null,
        email: f.email || null,
        family_id: isUuid(f.familyId) ? f.familyId : null,
        user_id: f.userId || null,
        status: 'active',
        membership_date: new Date().toISOString().slice(0, 10),
        member_number: generateMemberNumber(),
      };

      let memberInsertRes = await supabase.from('members').insert(insertPayload).select('id').single();
      let usedPlaceFallback = false;

      if (memberInsertRes.error && /place_of_birth/i.test(memberInsertRes.error.message || '')) {
        const { place_of_birth, ...withoutPlace } = insertPayload;
        memberInsertRes = await supabase.from('members').insert(withoutPlace).select('id').single();
        if (!memberInsertRes.error) usedPlaceFallback = true;
      }

      if (memberInsertRes.error || !memberInsertRes.data) throw memberInsertRes.error || new Error('Insert failed');

      const memberId = memberInsertRes.data.id;
      const ministriesToSave = (f.ministries || []).filter((m) => m && m !== 'None');
      let ministryErr: string | undefined;
      if (ministriesToSave.length > 0) {
        const ministryRows = ministriesToSave.map((ministryName) => {
          const ministry = mo.find((m) => m.name === ministryName);
          return {
            member_id: memberId,
            ministry_id: ministry?.id || null
          };
        }).filter(row => {
          return row.ministry_id && row.ministry_id !== '1' && row.ministry_id !== '2' && 
                 row.ministry_id !== '3' && row.ministry_id !== '4' && row.ministry_id !== '5' &&
                 row.ministry_id !== '6' && row.ministry_id !== '7' && row.ministry_id !== '8' &&
                 row.ministry_id !== '9' && row.ministry_id !== '10' && row.ministry_id !== '11' &&
                 row.ministry_id !== '12' && row.ministry_id !== '13' && row.ministry_id !== '14';
        });
        
        if (ministryRows.length > 0) {
          const mmRes = await supabase.from('member_ministries').insert(ministryRows);
          if (mmRes.error) {
            console.error('Error inserting ministries:', mmRes.error);
            ministryErr = `Member created but ministries could not be saved: ${mmRes.error.message}`;
          }
        } else {
          console.warn('No valid ministry IDs found for selected ministries:', ministriesToSave);
        }
      }

      return { usedPlaceFallback, ministryErr };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.members.list() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.addMember.systemUsers() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.systemUsers.manage() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.systemUsers.forAddUser() });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const parsed = addMemberFormSchema.safeParse(form);
    if (!parsed.success) {
      setSubmitting(false);
      setError(formatZodError(parsed.error));
      return;
    }

    try {
      const { usedPlaceFallback, ministryErr } = await submitMutation.mutateAsync({
        form: parsed.data,
        ministryOptions,
      });
      if (usedPlaceFallback) {
        setSuccess('Member created (note: run DB migration to add place_of_birth).');
      }
      if (ministryErr) {
        setError(ministryErr);
      }
      setSuccess((prev) => prev ?? 'Member created successfully');
      setForm((prev) => ({
        ...prev,
        firstName: '', middleName: '', lastName: '', gender: '', dateOfBirth: '',
        residence: '', placeOfBirth: '', ministries: [], phone: '', email: '', familyId: '', userId: ''
      }));
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

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <span className="text-sm font-semibold">Register New Member</span>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              inputMode="tel"
              maxLength={14}
              placeholder="07XXXXXXXX or +2567XXXXXXXX"
            />
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
      </div>
    </div>
  );
};


export default AddMember;



