import React, { useState } from 'react';
import { supabase } from '../../../lib/supabase';

const AddSabbath: React.FC = () => {
  const [form, setForm] = useState({
    churchName: '',
    location: '',
    sabbathLeader: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      const payload: any = {
        church_name: form.churchName,
        location: form.location,
        sabbath_leader: form.sabbathLeader,
        created_at: new Date().toISOString(),
      };
      const ins = await supabase.from('sabbath_classes').insert(payload);
      if (ins.error) throw ins.error;
      setMessage('Sabbath class saved');
      setForm({ churchName: '', location: '', sabbathLeader: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Add Sabbath School</h1>
        <p className="text-gray-600">Create a Sabbath class and view the list</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left card: Register form */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <span className="text-sm font-semibold">Register New Sabbath School</span>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Church name</label>
              <input name="churchName" value={form.churchName} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">location</label>
              <input name="location" value={form.location} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Sabbath Leader</label>
              <input name="sabbathLeader" value={form.sabbathLeader} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
            {message && <div className="text-sm text-green-600">{message}</div>}
            <div>
              <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60">{submitting ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </div>

        {/* Right card: Placeholder list */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
            <span className="text-sm font-semibold">Sabbath School List</span>
            <div className="text-xs text-gray-600">Number of Sabbath Schools: 0</div>
          </div>
          <div className="p-4 text-sm text-gray-600">
            Listing will appear here after backend hookup.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddSabbath;




