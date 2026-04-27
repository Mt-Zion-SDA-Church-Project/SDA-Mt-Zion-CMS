import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { queryKeys } from '../../../lib/queryKeys';
import { formatZodError, addTeenFormSchema } from '../../../lib/validation';

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
  const queryClient = useQueryClient();
  const toDisplay = (value: any): string => {
    if (Array.isArray(value)) return value.filter(Boolean).join(', ');
    if (value === null || value === undefined) return '';
    // Handle JSON-stringified single-element arrays like '["Masaka"]'
    if (typeof value === 'string') {
      const trimmed = value.trim();
      // Handle Postgres array literal format e.g. {Seeta,"Kampala"}
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const inner = trimmed.slice(1, -1);
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        let escaped = false;
        for (let i = 0; i < inner.length; i++) {
          const ch = inner[i];
          if (escaped) {
            current += ch;
            escaped = false;
          } else if (ch === '\\') {
            escaped = true;
          } else if (ch === '"') {
            inQuotes = !inQuotes;
          } else if (ch === ',' && !inQuotes) {
            const token = current.trim();
            result.push(token.replace(/^"|"$/g, ''));
            current = '';
          } else {
            current += ch;
          }
        }
        if (current.length > 0) {
          const token = current.trim();
          result.push(token.replace(/^"|"$/g, ''));
        }
        return result.filter(Boolean).join(', ');
      }
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) return parsed.filter(Boolean).join(', ');
        } catch (_) {
          // fall through to default string conversion
        }
      }
    }
    return String(value);
  };

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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data: children = [], isPending: listLoading } = useQuery({
    queryKey: queryKeys.members.teensDetails(),
    queryFn: async () => {
      const { data: childrenData, error: childError } = await supabase
        .from('teens')
        .select('id, first_name, middle_name, last_name, gender, date_of_birth, address, place_of_birth, parent_name, mobile');
      if (childError) throw childError;
      return (childrenData || []).map((c: any) => ({
        id: c.id,
        name: [toDisplay(c.first_name), toDisplay(c.middle_name), toDisplay(c.last_name)]
          .filter(Boolean)
          .join(' '),
        gender: toDisplay(c.gender).replace(/^./, (char: string) => char.toUpperCase()),
        placeOfBirth: toDisplay(c.place_of_birth),
        birthday: toDisplay(c.date_of_birth),
        parent: toDisplay(c.parent_name),
        mobile: toDisplay(c.mobile),
        residence: toDisplay(c.address),
      })) as ChildRow[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('teens-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teens' }, () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.members.teensDetails() });
        void queryClient.invalidateQueries({ queryKey: queryKeys.addTeen.teens() });
        void queryClient.invalidateQueries({ queryKey: ['admin', 'logs', 'activity'], exact: false });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const registerMutation = useMutation({
    mutationFn: async (teenPayload: Record<string, unknown>) => {
      let { data: teenData, error: teenError } = await supabase
        .from('teens')
        .insert(teenPayload)
        .select('id')
        .single();

      if (teenError && (teenError.message || '').toLowerCase().includes('malformed array literal')) {
        const arrayWrapped: any = { ...teenPayload };
        const maybeArrayKeys = ['first_name', 'middle_name', 'last_name', 'address', 'place_of_birth', 'parent_name', 'mobile'];
        maybeArrayKeys.forEach((key) => {
          const val = arrayWrapped[key];
          if (typeof val === 'string' && val.length > 0) arrayWrapped[key] = [val];
        });
        const retry = await supabase
          .from('teens')
          .insert(arrayWrapped)
          .select('id')
          .single();
        teenData = retry.data;
        teenError = retry.error as any;
      }

      if (teenError) throw teenError;
      return teenData;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.members.teensDetails() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.addTeen.teens() });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'logs', 'activity'], exact: false });
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const parsed = addTeenFormSchema.safeParse(form);
      if (!parsed.success) {
        throw new Error(formatZodError(parsed.error));
      }
      const f = parsed.data;

      const teenPayload: any = {
        first_name: f.firstName,
        last_name: f.lastName,
        middle_name: f.surname || null,
        gender: f.gender,
        date_of_birth: f.birthday,
        address: f.residence || null,
        place_of_birth: f.placeOfBirth || null,
        parent_name: f.parentsName || null,
        mobile: f.mobile || null,
      };

      await registerMutation.mutateAsync(teenPayload);

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
    } catch (err: any) {
      setError(err.message || 'Failed to register child');
    }
  };

  const loading = listLoading || registerMutation.isPending;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg shadow-md space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Register New Child</h2>
        <p className="text-sm text-gray-600 mb-4">
          Children are registered as independent entities and do not require login accounts.
        </p>
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
          <label className="block text-sm text-gray-600 mb-1">Parents mobile name</label>
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
        <p className="text-xs text-gray-500 mb-3">
          Children are independent records and do not have system login accounts.
        </p>
        
        {listLoading && <div className="text-sm text-gray-600 mb-2">Loading...</div>}
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
