import React from 'react';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { getAuthEmailRedirectUrl } from '../../../lib/authRedirect';
import sdaLogo from '../../../assets/sda-logo.png';

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
    phone: '',
    email: '',
    familyId: '',
    status: '',
  });
  const [familyOptions, setFamilyOptions] = useState<{id: string; name: string}[]>([]);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [createUserForm, setCreateUserForm] = useState({
    password: '',
    role: 'member'
  });
  const [creatingUser, setCreatingUser] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Loading members in MemberDetails...');
      
      // First, let's check if we can access the members table at all
      const { data: testData, error: testError } = await supabase
        .from('members')
        .select('id, first_name, last_name')
        .limit(1);
      
      if (testError) {
        console.error('Test query failed:', testError);
        setError(`Database access error: ${testError.message}`);
        setLoading(false);
        return;
      }
      
      console.log('Test query successful, found members:', testData);
      
      // Now run the full query
      const { data, error } = await supabase
        .from('members')
        .select(`
          id, first_name, middle_name, last_name, gender, phone, email, family_id, user_id,
          member_number, status, occupation,
          families:family_id(family_name)
        `)
        .order('created_at', { ascending: false })
        .limit(500);
      
      if (error) {
        console.error('Error loading members in MemberDetails:', error);
        setError(`Query error: ${error.message}`);
        setLoading(false);
        return;
      }
      
      console.log('Raw members data in MemberDetails:', data);
      console.log('Number of members found:', data?.length || 0);
      
      // Transform the data to include ministries as an array
      const transformedData = (data || []).map(member => ({
        ...member,
        ministries: [], // We'll fetch ministries separately if needed
        system_users: null // We'll fetch this separately if needed
      }));
      
      console.log('Transformed members data in MemberDetails:', transformedData);
      setRows(transformedData);
      setLoading(false);
    } catch (err: any) {
      console.error('Failed to load members in MemberDetails:', err);
      setError(`Unexpected error: ${err.message || 'Failed to load members'}`);
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
      phone: m.phone || '',
      email: m.email || '',
      familyId: m.family_id || '',
      status: m.status || 'active',
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
        phone: editForm.phone || null,
        email: editForm.email || null,
        family_id: editForm.familyId || null,
        status: editForm.status || 'active',
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
      firstName: '', middleName: '', lastName: '', gender: '',
      phone: '', email: '', familyId: '', status: 'active'
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

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    setCreatingUser(true);
    setError(null);

    try {
      // First, create the auth user with email and password
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: selectedMember.email,
        password: createUserForm.password,
        options: {
          emailRedirectTo: getAuthEmailRedirectUrl(),
          data: {
            full_name: `${selectedMember.first_name} ${selectedMember.last_name}`.trim(),
            username: selectedMember.email.split('@')[0] // Use email prefix as username
          }
        }
      });

      if (authError) throw authError;

      // Then create the system user record
      const { error: systemUserError } = await supabase
        .from('system_users')
        .insert({ 
          user_id: authData.user?.id,
          username: selectedMember.email.split('@')[0],
          full_name: `${selectedMember.first_name} ${selectedMember.last_name}`.trim(),
          email: selectedMember.email,
          role: createUserForm.role
        });

      if (systemUserError) throw systemUserError;

      // Update the member record to link to the system user
      const { error: memberUpdateError } = await supabase
        .from('members')
        .update({ user_id: authData.user?.id })
        .eq('id', selectedMember.id);

      if (memberUpdateError) throw memberUpdateError;

      setSuccess(`System user created successfully for ${selectedMember.first_name} ${selectedMember.last_name}`);
      setShowCreateUserModal(false);
      setSelectedMember(null);
      load(); // Refresh the member list

    } catch (err: any) {
      setError(err.message || 'Failed to create system user');
    } finally {
      setCreatingUser(false);
    }
  };

  const closeCreateUserModal = () => {
    setShowCreateUserModal(false);
    setSelectedMember(null);
    setCreateUserForm({ password: '', role: 'member' });
    setShowPassword(false);
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
                  disabled={creatingUser}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
                >
                  {creatingUser ? 'Creating...' : 'Create User'}
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






