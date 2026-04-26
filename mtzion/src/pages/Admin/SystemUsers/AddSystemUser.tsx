import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { queryKeys } from '../../../lib/queryKeys';
import { getAuthEmailRedirectUrl } from '../../../lib/authRedirect';
import { UserPlus, Trash2, Edit3, Shield, Mail } from 'lucide-react';
import { sendCredentialsEmail } from '../../../lib/emailService';

type SystemUserRow = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
};

const AddSystemUser: React.FC = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ 
    username: '', 
    fullName: '', 
    email: '', 
    role: 'admin', 
    password: '' 
  });
  const [query, setQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);

  const { data: users = [], isPending: loading } = useQuery({
    queryKey: queryKeys.systemUsers.forAddUser(),
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('system_users')
        .select('id, full_name, role, username, email')
        .order('full_name', { ascending: true });
      if (err) throw err;
      return (data || []).map((u: any) => ({ 
        id: u.id, 
        name: u.full_name, 
        username: u.username || u.role,
        email: u.email,
        role: u.role
      })) as SystemUserRow[];
    },
    retry: false,
    throwOnError: false,
  });

  const filtered = useMemo(() => {
    if (!query.trim()) return users;
    const q = query.toLowerCase();
    return users.filter((u) => [u.name, u.username].join(' ').toLowerCase().includes(q));
  }, [users, query]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: getAuthEmailRedirectUrl(),
          data: {
            full_name: form.fullName,
            username: form.username
          }
        }
      });
      if (authError) throw authError;
      const { data, error: insErr } = await supabase
        .from('system_users')
        .insert({ 
          user_id: authData.user?.id,
          username: form.username,
          full_name: form.fullName,
          email: form.email,
          role: form.role || 'admin'
        })
        .select('id, full_name, role, username')
        .single();
      if (insErr) throw insErr;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.systemUsers.forAddUser() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.systemUsers.manage() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error: delErr } = await supabase.from('system_users').delete().in('id', ids);
      if (delErr) throw delErr;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.systemUsers.forAddUser() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.systemUsers.manage() });
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await createMutation.mutateAsync();
      setForm({ username: '', fullName: '', email: '', role: 'admin', password: '' });
      setSuccess('System user created successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to create system user');
    }
  };

  const toggleAll = (checked: boolean) => {
    if (checked) setSelected(new Set(filtered.slice(0, pageSize).map((u) => u.id)));
    else setSelected(new Set());
  };
  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const handleDelete = async () => {
    if (selected.size === 0) return;
    const ok = window.confirm('Delete selected system user(s)?');
    if (!ok) return;
    try {
      await deleteMutation.mutateAsync(Array.from(selected));
    } catch (_) {
      // If delete fails, still remove locally to keep UX fluid
    } finally {
      setSelected(new Set());
    }
  };

  const handleSendCredentials = async (userId: string, userData: any) => {
    setSendingEmail(userId);
    try {
      const loginUrl = `${window.location.origin}/login`;
      await sendCredentialsEmail({
        email: userData.email,
        username: userData.username,
        fullName: userData.name,
        role: userData.role,
        loginUrl
      });
      setSuccess(`Credentials email sent to ${userData.email}`);
    } catch (err: any) {
      setError(err.message || 'Failed to send credentials email');
    } finally {
      setSendingEmail(null);
    }
  };

  const saving = createMutation.isPending || deleteMutation.isPending;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left: Add form */}
      <div className="bg-white/95 rounded-lg shadow-md border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center gap-2 text-gray-700 text-sm">
          <UserPlus className="w-4 h-4" />
          <span>Add System User</span>
        </div>
        <form onSubmit={handleSave} className="p-4 space-y-3">
          <div>
            <input 
              name="username" 
              value={form.username} 
              onChange={handleChange} 
              placeholder="Username" 
              className="w-full border rounded px-3 py-2" 
              required 
            />
          </div>
          <div>
            <input 
              name="fullName" 
              value={form.fullName} 
              onChange={handleChange} 
              placeholder="Full Name" 
              className="w-full border rounded px-3 py-2" 
              required 
            />
          </div>
          <div>
            <input 
              type="email" 
              name="email" 
              value={form.email} 
              onChange={handleChange} 
              placeholder="Email Address" 
              className="w-full border rounded px-3 py-2" 
              required 
            />
          </div>
          <div>
            <select name="role" value={form.role} onChange={handleChange} className="w-full border rounded px-3 py-2">
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div>
            <input 
              type="password" 
              name="password" 
              value={form.password} 
              onChange={handleChange} 
              placeholder="Password" 
              className="w-full border rounded px-3 py-2" 
              required 
            />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          {success && <div className="text-sm text-green-600">{success}</div>}
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-white rounded hover:opacity-90 disabled:opacity-60">
            <Shield className="w-4 h-4" />
            <span>Save</span>
          </button>
        </form>
      </div>

      {/* Right: List */}
      <div className="bg-white/95 rounded-lg shadow-md border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between text-gray-700 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold">System User (s) List</span>
          </div>
          <div className="text-xs">Number of System user: <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white">{filtered.length}</span></div>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <button onClick={handleDelete} disabled={selected.size === 0 || saving} className="inline-flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-60">
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
            <div className="flex items-center gap-2 ml-4">
              <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="border rounded px-2 py-1 text-sm">
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="text-sm text-gray-600">records per page</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-gray-600">Search:</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} className="border rounded px-2 py-1 text-sm" />
            </div>
          </div>

          <table className="w-full text-sm border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2 border-b w-10"><input type="checkbox" onChange={(e) => toggleAll(e.target.checked)} checked={filtered.slice(0, pageSize).every((u) => selected.has(u.id)) && filtered.slice(0, pageSize).length > 0} /></th>
                <th className="text-left p-2 border-b">NAME</th>
                <th className="text-left p-2 border-b">USERNAME</th>
                <th className="text-left p-2 border-b w-32">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? null : filtered.slice(0, pageSize).map((u) => (
                <tr key={u.id} className="odd:bg-white even:bg-gray-50">
                  <td className="p-2 border-b"><input type="checkbox" checked={selected.has(u.id)} onChange={(e) => toggleOne(u.id, e.target.checked)} /></td>
                  <td className="p-2 border-b">{u.name}</td>
                  <td className="p-2 border-b">{u.username}</td>
                  <td className="p-2 border-b">
                    <div className="flex gap-2">
                      <button className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-xs">
                        <Edit3 className="w-4 h-4" />
                        <span>Edit User</span>
                      </button>
                      <button 
                        onClick={() => handleSendCredentials(u.id, u)}
                        disabled={sendingEmail === u.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60 text-xs"
                      >
                        <Mail className="w-4 h-4" />
                        <span>{sendingEmail === u.id ? 'Sending...' : 'Send Credentials'}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-end gap-2 text-xs text-gray-600 mt-2">
            <button className="px-2 py-1 border rounded bg-white hover:bg-gray-50">Previous</button>
            <span>1</span>
            <button className="px-2 py-1 border rounded bg-white hover:bg-gray-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddSystemUser;
