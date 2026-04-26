import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { queryKeys } from '../../../lib/queryKeys';

interface BirthdayMember {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  gender: string;
  address?: string;
  date_of_birth: string;
  phone?: string;
  email?: string;
  daysUntil: number;
  upcomingDate: Date;
}

const Birthdays: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: birthdays = [], isPending: loading, error: queryError } = useQuery({
    queryKey: queryKeys.members.birthdays('admin'),
    queryFn: async () => {
      const { data, error: fetchError } = await supabase
        .from('members')
        .select('id, first_name, last_name, middle_name, gender, address, date_of_birth, phone, email')
        .not('date_of_birth', 'is', null)
        .order('date_of_birth', { ascending: true });

      if (fetchError) throw fetchError;

      const today = new Date();
      const upcomingBirthdays = (data || []).map(member => {
        const birthDate = new Date(member.date_of_birth);
        const thisYear = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        const nextYear = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
        
        const upcomingDate = thisYear > today ? thisYear : nextYear;
        const daysUntil = Math.ceil((upcomingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          ...member,
          upcomingDate,
          daysUntil
        };
      }).filter(member => member.daysUntil >= 0 && member.daysUntil <= 7);

      upcomingBirthdays.sort((a, b) => a.daysUntil - b.daysUntil);

      return upcomingBirthdays as BirthdayMember[];
    },
  });

  const error = queryError ? (queryError as Error).message : null;

  const filteredBirthdays = useMemo(() => birthdays.filter(member => {
    if (!searchQuery.trim()) return true;
    
    const searchTerm = searchQuery.toLowerCase();
    return (
      member.first_name.toLowerCase().includes(searchTerm) ||
      member.last_name.toLowerCase().includes(searchTerm) ||
      member.middle_name?.toLowerCase().includes(searchTerm) ||
      member.email?.toLowerCase().includes(searchTerm)
    );
  }), [birthdays, searchQuery]);

  const getDaysUntilText = (daysUntil: number) => {
    if (daysUntil === 0) return 'Today!';
    if (daysUntil === 1) return 'Tomorrow';
    return `${daysUntil} days`;
  };

  const getDaysUntilColor = (daysUntil: number) => {
    if (daysUntil === 0) return 'text-red-600 bg-red-100';
    if (daysUntil <= 3) return 'text-orange-600 bg-orange-100';
    return 'text-blue-600 bg-blue-100';
  };

  const formatBirthday = (dateOfBirth: string) => {
    const date = new Date(dateOfBirth);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handlePrint = () => window.print();

  return (
    <div className="p-4">
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {/* Header bar */}
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
          <span className="text-sm font-semibold">Upcoming Birthdays (Next 7 Days)</span>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs">
              {birthdays.length}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-gray-600">Search:</span>
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border rounded px-2 py-1 text-sm w-60" 
              placeholder="Search members..."
            />
            <button onClick={handlePrint} className="inline-flex items-center gap-2 px-3 py-2 bg-[#1f3b73] text-white rounded hover:opacity-90 text-sm">Print List</button>
          </div>
        </div>

        {/* Table */}
        <div className="px-4 pb-4 overflow-x-auto">
          {error && (
            <div className="text-sm text-red-600 mb-4 p-3 bg-red-50 rounded-md">
              {error}
            </div>
          )}
          
          {loading && (
            <div className="text-sm text-gray-600 mb-4 p-3 bg-gray-50 rounded-md">
              Loading birthdays...
            </div>
          )}

          <table className="min-w-full text-sm border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2 border-b">NAME</th>
                <th className="text-left p-2 border-b">GENDER</th>
                <th className="text-left p-2 border-b">RESIDENCE</th>
                <th className="text-left p-2 border-b">BIRTHDAY</th>
                <th className="text-left p-2 border-b">DAYS UNTIL</th>
                <th className="text-left p-2 border-b">MOBILE NO.</th>
              </tr>
            </thead>
            <tbody>
              {filteredBirthdays.length === 0 ? (
                <tr>
                  <td className="p-2 text-gray-600" colSpan={6}>
                    {loading ? 'Loading...' : 'No upcoming birthdays in the next 7 days'}
                  </td>
                </tr>
              ) : (
                filteredBirthdays.map((member) => (
                  <tr key={member.id} className="odd:bg-white even:bg-gray-50">
                    <td className="p-2 border-b">
                      {[member.first_name, member.middle_name, member.last_name].filter(Boolean).join(' ')}
                    </td>
                    <td className="p-2 border-b capitalize">{member.gender || '—'}</td>
                    <td className="p-2 border-b">{member.address || '—'}</td>
                    <td className="p-2 border-b">{formatBirthday(member.date_of_birth)}</td>
                    <td className="p-2 border-b">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDaysUntilColor(member.daysUntil)}`}>
                        {getDaysUntilText(member.daysUntil)}
                      </span>
                    </td>
                    <td className="p-2 border-b">{member.phone || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Footer */}
          <div className="flex items-center justify-between text-sm text-gray-600 mt-3">
            <div>Showing {filteredBirthdays.length} of {birthdays.length} upcoming birthdays</div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                Last updated: {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Birthdays;
