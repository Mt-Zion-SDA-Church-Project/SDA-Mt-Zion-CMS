import React, { useState, useEffect } from 'react';
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

const AddTeen: React.FC = () => {
  const [form, setForm] = useState({
    firstName: '',
    surname: '',
    lastName: '',
    gender: '',
    birthday: '',
    residence: '',
    placeOfBirth: '',
    parentsName: '',
    mobile: '',
  });
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadChildren();
    
    // Subscribe to real-time changes
    const channel = supabase
      .channel('teens-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teens' }, () => {
        loadChildren();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => {
        loadChildren();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadChildren = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: childrenData, error: childError } = await supabase
        .from('teens')
        .select('id, member_id, parent_member_id');
      if (childError) throw childError;

      const memberIds = Array.from(
        new Set((childrenData || []).flatMap((c: any) => [c.member_id, c.parent_member_id]).filter(Boolean))
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

      const mapped: ChildRow[] = (childrenData || []).map((c: any) => {
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
      setChildren(mapped);
    } catch (err: any) {
      setError(err.message || 'Failed to load children');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate required fields
      if (!form.firstName || !form.lastName || !form.gender || !form.birthday) {
        throw new Error('Please fill in all required fields (First Name, Last Name, Gender, Birthday)');
      }

      // First, create the member record
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .insert({
          first_name: form.firstName,
          last_name: form.lastName,
          middle_name: form.surname || null,
          gender: form.gender,
          date_of_birth: form.birthday,
          phone: form.mobile || null,
          address: form.residence || null,
          place_of_birth: form.placeOfBirth || null,
          member_number: `CHILD-${Date.now()}`, // Generate unique member number
          status: 'active'
        })
        .select('id')
        .single();

      if (memberError) throw memberError;

      // Then create the teen/child record
      const { data: teenData, error: teenError } = await supabase
        .from('teens')
        .insert({
          member_id: memberData.id,
          parent_member_id: null, // Will be set later when parent is identified
        })
        .select('id')
        .single();

      if (teenError) throw teenError;

      // Reset form
      setForm({
        firstName: '',
        surname: '',
        lastName: '',
        gender: '',
        birthday: '',
        residence: '',
        placeOfBirth: '',
        parentsName: '',
        mobile: '',
      });

      setSuccess('Child registered successfully!');
      
      // Reload children list
      await loadChildren();

    } catch (err: any) {
      setError(err.message || 'Failed to register child');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg shadow-md space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Register New Child</h2>
        <div>
          <label className="block text-sm text-gray-600 mb-1">First Name *</label>
          <input name="firstName" value={form.firstName} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Surname</label>
          <input name="surname" value={form.surname} onChange={handleChange} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Last name *</label>
          <input name="lastName" value={form.lastName} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Select Gender *</label>
          <select name="gender" value={form.gender} onChange={handleChange} className="w-full border rounded px-3 py-2" required>
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Birthday *</label>
          <input type="date" name="birthday" value={form.birthday} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Residence</label>
          <input name="residence" value={form.residence} onChange={handleChange} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Place of birth</label>
          <input name="placeOfBirth" value={form.placeOfBirth} onChange={handleChange} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Parents Name</label>
          <input name="parentsName" value={form.parentsName} onChange={handleChange} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">mobile number</label>
          <input name="mobile" value={form.mobile} onChange={handleChange} className="w-full border rounded px-3 py-2" />
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        {success && <div className="text-sm text-green-600">{success}</div>}
        <div>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded hover:opacity-90 disabled:opacity-60">
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>

      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm text-gray-600">Church Children List</h2>
          <div className="text-sm text-gray-600">Number of Church Children: <span className="font-semibold">{children.length}</span></div>
        </div>
        
        {loading && <div className="text-sm text-gray-600 mb-2">Loading...</div>}
        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
        
        {children.length === 0 ? (
          <div className="text-sm text-gray-500">No children registered yet.</div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {children.map((child) => (
              <div key={child.id} className="p-3 border rounded-lg bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-800">{child.name}</h4>
                    <p className="text-sm text-gray-600">
                      {child.gender} • {child.birthday ? new Date(child.birthday).toLocaleDateString() : 'No birthday'}
                    </p>
                    {child.residence && (
                      <p className="text-xs text-gray-500">{child.residence}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AddTeen;


