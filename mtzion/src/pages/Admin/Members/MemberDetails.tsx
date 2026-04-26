import React from 'react';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { queryKeys } from '../../../lib/queryKeys';
import { getAuthEmailRedirectUrl } from '../../../lib/authRedirect';
import sdaLogo from '../../../assets/sda-logo.png';

const MemberDetails: React.FC = () => {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    gender: '',
    phone: '',
    email: '',
    familyId: '',
    status: '',
  });
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [createUserForm, setCreateUserForm] = useState({
    password: '',
    role: 'member'
  });
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const membersQuery = useQuery({
    queryKey: queryKeys.members.memberDetails(),
    queryFn: async () => {
      console.log('Loading members in MemberDetails...');

      const { data: testData, error: testError } = await supabase
        .from('members')
        .select('id, first_name, last_name')
        .limit(1);

      if (testError) {
        console.error('Test query failed:', testError);
        throw new Error(`Database access error: ${testError.message}`);
      }

      console.log('Test query successful, found members:', testData);

      const { data, error } = await supabase
        .from('members')
        .select(
          `
          id, first_name, middle_name, last_name, gender, phone, email, family_id, user_id,
          member_number, status, occupation,
          families:family_id(family_name)
        `
        )
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) {
        console.error('Error loading members in MemberDetails:', error);
        throw new Error(`Query error: ${error.message}`);
      }

      console.log('Raw members data in MemberDetails:', data);
      console.log('Number of members found:', data?.length || 0);

      const transformedData = (data || []).map((member) => ({
        ...member,
        ministries: [],
        system_users: null,
      }));

      console.log('Transformed members data in MemberDetails:', transformedData);
      return transformedData;
    },
  });

  const familiesQuery = useQuery({
    queryKey: queryKeys.members.familiesOptions(),
    queryFn: async () => {
      const { data } = await supabase.from('families').select('id, family_name').order('family_name');
      if (data) {
        return data.map((f: { id: string; family_name: string }) => ({ id: f.id, name: f.family_name }));
      }
      return [];
    },
  });

  const rows = membersQuery.data ?? [];
  const familyOptions = familiesQuery.data ?? [];
  const loading = membersQuery.isPending || familiesQuery.isPending;
  const error =
    actionError ??
    (membersQuery.error instanceof Error
      ? membersQuery.error.message
      : membersQuery.error
        ? String(membersQuery.error)
        : null) ??
    (familiesQuery.error instanceof Error
      ? familiesQuery.error.message
      : familiesQuery.error
        ? String(familiesQuery.error)
        : null);

  const load = () => {
    setActionError(null);
    void membersQuery.refetch();
    void familiesQuery.refetch();
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
      phone: m.phone || '',
      email: m.email || '',
      familyId: m.family_id || '',
      status: m.status || 'active',
    });
  };

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      const { error } = await supabase.from('members').update(payload).eq('id', id);
      if (error) throw error;
    },
    onMutate: () => setActionError(null),
    onSuccess: () => {
      setEditingId(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.members.memberDetails() });
    },
    onError: (err: Error) => setActionError(err.message || 'Update failed'),
  });

  const handleUpdate = async () => {
    if (!editingId) return;
    const payload: Record<string, unknown> = {
      first_name: editForm.firstName,
      middle_name: editForm.middleName || null,
      last_name: editForm.lastName,
      gender: editForm.gender || null,
      phone: editForm.phone || null,
      email: editForm.email || null,
      family_id: editForm.familyId || null,
      status: editForm.status || 'active',
    };
    updateMutation.mutate({ id: editingId, payload });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      firstName: '', middleName: '', lastName: '', gender: '',
      phone: '', email: '', familyId: '', status: 'active'
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('members').delete().in('id', ids);
      if (error) throw error;
    },
    onMutate: () => setActionError(null),
    onSuccess: () => {
      setSelectedIds([]);
      void queryClient.invalidateQueries({ queryKey: queryKeys.members.memberDetails() });
    },
    onError: (err: Error) => setActionError(err.message || 'Delete failed'),
  });

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    const ok = window.confirm('Delete selected members?');
    if (!ok) return;
    deleteMutation.mutate(selectedIds);
  };

  const generatePassword = () => {
    // Generate 3 random digits
    const digits = Math.floor(100 + Math.random() * 900);
    return `Zionchurch@${digits}`;
  };

  const handleCreateSystemUser = (member: any) => {
    setSelectedMember(member);
    setCreateUserForm({
      password: generatePassword(),
      role: 'member'
    });
    setShowCreateUserModal(true);
  };

  const createUserMutation = useMutation({
    mutationFn: async ({
      member,
      password,
      role,
    }: {
      member: NonNullable<typeof selectedMember>;
      password: string;
      role: string;
    }) => {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: member.email,
        password,
        options: {
          emailRedirectTo: getAuthEmailRedirectUrl(),
          data: {
            full_name: `${member.first_name} ${member.last_name}`.trim(),
            username: member.email.split('@')[0],
          },
        },
      });

      if (authError) throw authError;

      const { error: systemUserError } = await supabase.from('system_users').insert({
        user_id: authData.user?.id,
        username: member.email.split('@')[0],
        full_name: `${member.first_name} ${member.last_name}`.trim(),
        email: member.email,
        role,
      });

      if (systemUserError) throw systemUserError;

      const { error: memberUpdateError } = await supabase
        .from('members')
        .update({ user_id: authData.user?.id })
        .eq('id', member.id);

      if (memberUpdateError) throw memberUpdateError;
    },
    onMutate: () => setActionError(null),
    onSuccess: (_data, variables) => {
      setSuccess(
        `System user created successfully for ${variables.member.first_name} ${variables.member.last_name}`
      );
      setShowCreateUserModal(false);
      setSelectedMember(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.members.memberDetails() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.systemUsers.manage() });
    },
    onError: (err: Error) => setActionError(err.message || 'Failed to create system user'),
  });

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    createUserMutation.mutate({
      member: selectedMember,
      password: createUserForm.password,
      role: createUserForm.role,
    });
  };

  const closeCreateUserModal = () => {
    setShowCreateUserModal(false);
    setSelectedMember(null);
    setCreateUserForm({ password: '', role: 'member' });
    setShowPassword(false);
  };

  useEffect(() => {
    const channel = supabase
      .channel('members-details')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'members' },
        () => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.members.memberDetails() });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return (
    <div className="p-4">
      {/* Printable container */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden print-area">
        {/* Print-only header with logo */}
        <div className="hidden print:flex items-center gap-3 p-4">
          <img src={sdaLogo} alt="SDA Logo" className="w-10 h-10 object-contain" />
          <div>
            <div className="text-base font-semibold">Seventh-Day Adventist Church, Mt. Zion - Kigoma - Church Members List</div>
          </div>
        </div>
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between hide-on-print">
          <span className="text-sm font-semibold">Church Members List</span>
          <div className="text-xs text-gray-600">
            Number of Church Members: {rows.length}
            {loading && <span className="ml-2 text-blue-600">(Loading...)</span>}
          </div>
        </div>

        {error && (
          <div className="px-4 py-2 bg-red-50 border-l-4 border-red-400">
            <div className="text-sm text-red-700">
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        {success && (
          <div className="px-4 py-2 bg-green-50 border-l-4 border-green-400">
            <div className="text-sm text-green-700">
              <strong>Success:</strong> {success}
            </div>
          </div>
        )}
        
        <div className="px-4 py-3 flex items-center gap-3 hide-on-print">
          <button onClick={handleDeleteSelected} disabled={selectedIds.length === 0} className="px-3 py-2 bg-red-500 text-white rounded text-sm disabled:opacity-60">Delete</button>
          <button onClick={load} disabled={loading} className="px-3 py-2 bg-blue-500 text-white rounded text-sm disabled:opacity-60">
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-gray-600">Search:</span>
            <input className="border rounded px-2 py-1 text-sm w-60" />
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-3 py-2 bg-[#1f3b73] text-white rounded hover:opacity-90 text-sm">Print List</button>
          </div>
        </div>

        <div className="px-4 pb-4 overflow-x-auto">
          <table className="min-w-full text-sm border border-gray-200 print-table">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2 border-b col-check">CHECK</th>
                <th className="text-left p-2 border-b">MEMBER #</th>
                <th className="text-left p-2 border-b">NAME</th>
                <th className="text-left p-2 border-b">GENDER</th>
                <th className="text-left p-2 border-b">FAMILY</th>
                <th className="text-left p-2 border-b">MOBILE NO.</th>
                <th className="text-left p-2 border-b">EMAIL</th>
                <th className="text-left p-2 border-b">STATUS</th>
                <th className="text-left p-2 border-b col-actions">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="p-2 text-gray-600" colSpan={9}>{loading ? 'Loading...' : 'No data available in table'}</td>
                </tr>
              ) : (
                rows.map((m) => (
                  <tr key={m.id} className="odd:bg-white even:bg-gray-50">
                    <td className="p-2 border-b col-check"><input type="checkbox" checked={selectedIds.includes(m.id)} onChange={() => toggleSelect(m.id)} /></td>
                    {editingId === m.id ? (
                      <>
                        <td className="p-2 border-b">{m.member_number || '—'}</td>
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
                        <td className="p-2 border-b">
                          <input name="phone" value={editForm.phone} onChange={handleEditChange} className="w-full border rounded px-2 py-1 text-xs" />
                        </td>
                        <td className="p-2 border-b">
                          <input name="email" value={editForm.email} onChange={handleEditChange} className="w-full border rounded px-2 py-1 text-xs" />
                        </td>
                        <td className="p-2 border-b">
                          <select name="status" value={editForm.status} onChange={handleEditChange} className="w-full border rounded px-2 py-1 text-xs">
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="transferred">Transferred</option>
                            <option value="deceased">Deceased</option>
                          </select>
                        </td>
                        <td className="p-2 border-b text-right col-actions hide-on-print">
                          <button onClick={handleUpdate} className="px-3 py-1 bg-green-600 text-white rounded text-xs mr-1">Save</button>
                          <button onClick={cancelEdit} className="px-3 py-1 bg-gray-600 text-white rounded text-xs">Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-2 border-b">{m.member_number || '—'}</td>
                        <td className="p-2 border-b">{[m.first_name, m.middle_name, m.last_name].filter(Boolean).join(' ')}</td>
                        <td className="p-2 border-b capitalize">{m.gender || '—'}</td>
                        <td className="p-2 border-b">{m.families?.family_name || '—'}</td>
                        <td className="p-2 border-b">{m.phone || '—'}</td>
                        <td className="p-2 border-b">{m.email || '—'}</td>
                        <td className="p-2 border-b">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            m.status === 'active' ? 'bg-green-100 text-green-800' :
                            m.status === 'inactive' ? 'bg-red-100 text-red-800' :
                            m.status === 'transferred' ? 'bg-blue-100 text-blue-800' :
                            m.status === 'deceased' ? 'bg-gray-100 text-gray-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {m.status || 'active'}
                          </span>
                        </td>
                        <td className="p-2 border-b text-right col-actions hide-on-print">
                          <div className="flex gap-1">
                            <button onClick={() => handleEdit(m)} className="px-3 py-1 bg-green-600 text-white rounded text-xs">Edit</button>
                            {!m.user_id && (
                              <button 
                                onClick={() => handleCreateSystemUser(m)} 
                                className="px-3 py-1 bg-blue-600 text-white rounded text-xs"
                                disabled={!m.email}
                                title={!m.email ? "Email required to create system user" : "Create system user account"}
                              >
                                Create User
                              </button>
                            )}
                          </div>
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

      {/* Create System User Modal */}
      {showCreateUserModal && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hide-on-print">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Create System User</h3>
              <p className="text-sm text-gray-600 mt-1">
                Create an authenticated account for {selectedMember.first_name} {selectedMember.last_name}
              </p>
            </div>
            
            <form onSubmit={handleCreateUserSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={`${selectedMember.first_name} ${selectedMember.last_name}`.trim()} 
                  disabled 
                  className="w-full border rounded px-3 py-2 bg-gray-100 text-gray-600"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input 
                  type="email" 
                  value={selectedMember.email} 
                  disabled 
                  className="w-full border rounded px-3 py-2 bg-gray-100 text-gray-600"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select 
                  value={createUserForm.role} 
                  onChange={(e) => setCreateUserForm(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="flex gap-2">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={createUserForm.password} 
                    onChange={(e) => setCreateUserForm(prev => ({ ...prev, password: e.target.value }))}
                    className="flex-1 border rounded px-3 py-2"
                    placeholder="Enter password for the user"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setCreateUserForm(prev => ({ ...prev, password: generatePassword() }))}
                    className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                    title="Generate new password"
                  >
                    Generate
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Password format: Zionchurch@ followed by 3 digits
                </p>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={closeCreateUserModal}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={createUserMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
                >
                  {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberDetails;






