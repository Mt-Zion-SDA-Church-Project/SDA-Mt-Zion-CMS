import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { queryKeys } from '../../../lib/queryKeys';
import { formatZodError, visitorFormSchema } from '../../../lib/validation';

const VISITORS_LIST_LIMIT = 100;

const AddVisitor: React.FC = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    dateOfBirth: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: rows = [] } = useQuery({
    queryKey: queryKeys.visitors.list(VISITORS_LIST_LIMIT),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visitors')
        .select('id, first_name, last_name, phone, address, date_of_birth, created_at')
        .order('created_at', { ascending: false })
        .limit(VISITORS_LIST_LIMIT);
      if (error) throw error;
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (vars: { editingId: string | null; payload: Record<string, unknown> }) => {
      if (vars.editingId) {
        const { error: updErr } = await supabase.from('visitors').update(vars.payload).eq('id', vars.editingId);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase.from('visitors').insert(vars.payload).single();
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['visitors'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('visitors').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['visitors'] });
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);
    const parsed = visitorFormSchema.safeParse(form);
    if (!parsed.success) {
      setSubmitting(false);
      setError(formatZodError(parsed.error));
      return;
    }
    try {
      const payload: Record<string, unknown> = {
        first_name: parsed.data.firstName,
        last_name: parsed.data.lastName || null,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        address: parsed.data.address || null,
        date_of_birth: parsed.data.dateOfBirth || null,
      };
      await saveMutation.mutateAsync({ editingId, payload });
      setMessage(editingId ? 'Visitor updated' : 'Visitor saved');
      setForm({ firstName: '', lastName: '', phone: '', email: '', address: '', dateOfBirth: '' });
      setEditingId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to save visitor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (v: any) => {
    setEditingId(v.id);
    setForm({
      firstName: v.first_name || '',
      lastName: v.last_name || '',
      phone: v.phone || '',
      email: v.email || '',
      address: v.address || '',
      dateOfBirth: v.date_of_birth ? new Date(v.date_of_birth).toISOString().slice(0,10) : '',
    });
    setMessage(null);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ firstName: '', lastName: '', phone: '', email: '', address: '', dateOfBirth: '' });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    setError(null);
    try {
      await deleteMutation.mutateAsync(selectedIds);
      setSelectedIds([]);
      setMessage('Deleted successfully');
    } catch (e: any) {
      setError(e?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Add Visitor</h1>
        <p className="text-gray-600">Register a new visitor and manage the list</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Register form */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50 flex items-center gap-2">
            <span className="text-sm font-semibold">Register New Visitor</span>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">First Name</label>
              <input required name="firstName" value={form.firstName} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Last Name</label>
              <input required name="lastName" value={form.lastName} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Phone</label>
              <input required name="phone" value={form.phone} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Email</label>
              <input required type="email" name="email" value={form.email} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Date of Birth</label>
              <input required type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Address</label>
              <input required name="address" value={form.address} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
            {message && <div className="text-sm text-green-600">{message}</div>}
            <div className="flex items-center gap-2">
              <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60">{submitting ? (editingId ? 'Updating...' : 'Saving...') : (editingId ? 'Update' : 'Save')}</button>
              {editingId && (
                <button type="button" onClick={cancelEdit} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
              )}
            </div>
          </form>
        </div>

        {/* Right: Visitors list */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
            <span className="text-sm font-semibold">Church Visitor(s) List</span>
            <div className="text-xs text-gray-600">Number of Visitors: <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white">{rows.length}</span></div>
          </div>

          <div className="px-4 py-3 flex items-center gap-3">
            <button onClick={handleDeleteSelected} disabled={selectedIds.length === 0} className="px-3 py-2 bg-red-600 text-white rounded text-sm disabled:opacity-60">Delete</button>
            <div className="flex items-center gap-2 ml-2">
              <select className="border rounded px-2 py-1 text-sm">
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="text-sm text-gray-600">records per page</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-gray-600">Search:</span>
              <input className="border rounded px-2 py-1 text-sm w-60" />
            </div>
          </div>

          <div className="px-4 pb-4">
            <table className="w-full text-sm border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2 border-b w-10"> </th>
                  <th className="text-left p-2 border-b">NAME</th>
                  <th className="text-left p-2 border-b">MOBILE</th>
                  <th className="text-left p-2 border-b">ADDRESS</th>
                  <th className="text-left p-2 border-b">DATE OF BIRTH</th>
                  <th className="text-left p-2 border-b w-24"> </th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td className="p-2 border-b" />
                    <td className="p-2 border-b text-gray-600" colSpan={4}>No data available in table</td>
                    <td className="p-2 border-b" />
                  </tr>
                ) : (
                  rows.map((v) => (
                    <tr key={v.id}>
                      <td className="p-2 border-b"><input type="checkbox" checked={selectedIds.includes(v.id)} onChange={() => toggleSelect(v.id)} /></td>
                      <td className="p-2 border-b">{v.first_name} {v.last_name || ''}</td>
                      <td className="p-2 border-b">{v.phone || '—'}</td>
                      <td className="p-2 border-b">{v.address || '—'}</td>
                      <td className="p-2 border-b">{v.date_of_birth ? new Date(v.date_of_birth).toLocaleDateString() : '—'}</td>
                      <td className="p-2 border-b text-right">
                        <button onClick={() => handleEdit(v)} className="px-3 py-1 bg-green-600 text-white rounded text-xs">Edit</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="flex items-center justify-between text-sm text-gray-600 mt-3">
              <div>Showing 0 to 0 of 0 entries</div>
              <div className="flex items-center gap-2">
                <button className="px-2 py-1 border rounded text-gray-500" disabled>Previous</button>
                <button className="px-2 py-1 border rounded text-gray-500" disabled>Next</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddVisitor;
