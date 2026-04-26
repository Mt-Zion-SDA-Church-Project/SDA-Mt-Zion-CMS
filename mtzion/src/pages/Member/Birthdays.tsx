import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/queryKeys';
import { Heart, Calendar, Filter, Search, Gift, Cake } from 'lucide-react';
import MemberMobileNav from '../../components/Member/MemberMobileNav';

interface Birthday {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  email?: string;
  phone?: string;
  upcomingDate: Date;
  daysUntil: number;
  month: number;
  day: number;
}

async function fetchMembersWithBirthdays(): Promise<
  Array<{
    id: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    email?: string;
    phone?: string;
  }>
> {
  const { data, error: fetchError } = await supabase
    .from('members')
    .select('id, first_name, last_name, date_of_birth, email, phone')
    .not('date_of_birth', 'is', null)
    .order('date_of_birth', { ascending: true });
  if (fetchError) throw fetchError;
  return data || [];
}

const MemberBirthdays: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterTimeframe, setFilterTimeframe] = useState<string>('upcoming');

  const rawQuery = useQuery({
    queryKey: queryKeys.memberPortal.birthdaysMembers(),
    queryFn: fetchMembersWithBirthdays,
  });

  const loading = rawQuery.isPending;
  const error = rawQuery.error ? (rawQuery.error as Error).message : null;

  useEffect(() => {
    const channel = supabase
      .channel('member-birthdays-members')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.memberPortal.birthdaysMembers() });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const birthdays = useMemo(() => {
    const data = rawQuery.data;
    if (!data) return [];

    const processedBirthdays: Birthday[] = data.map((member) => {
      const birthDate = new Date(member.date_of_birth);
      const today = new Date();
      const thisYear = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
      const nextYear = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());

      const upcomingDate = thisYear > today ? thisYear : nextYear;
      const daysUntil = Math.ceil((upcomingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      return {
        ...member,
        upcomingDate,
        daysUntil,
        month: birthDate.getMonth(),
        day: birthDate.getDate(),
      };
    });

    let filteredBirthdays = processedBirthdays;
    if (filterTimeframe === 'upcoming') {
      filteredBirthdays = processedBirthdays.filter((b) => b.daysUntil >= 0 && b.daysUntil <= 7);
    } else if (filterTimeframe === 'this_month') {
      const currentMonth = new Date().getMonth();
      filteredBirthdays = processedBirthdays.filter((b) => b.month === currentMonth);
    } else if (filterTimeframe === 'next_month') {
      const nextMonth = (new Date().getMonth() + 1) % 12;
      filteredBirthdays = processedBirthdays.filter((b) => b.month === nextMonth);
    }

    if (filterMonth !== 'all') {
      const monthIndex = parseInt(filterMonth, 10);
      filteredBirthdays = filteredBirthdays.filter((b) => b.month === monthIndex);
    }

    filteredBirthdays.sort((a, b) => a.daysUntil - b.daysUntil);
    return filteredBirthdays;
  }, [rawQuery.data, filterMonth, filterTimeframe]);

  const filteredBirthdays = birthdays.filter((birthday) => {
    if (!searchQuery.trim()) return true;

    const searchTerm = searchQuery.toLowerCase();
    return (
      birthday.first_name.toLowerCase().includes(searchTerm) ||
      birthday.last_name.toLowerCase().includes(searchTerm) ||
      birthday.email?.toLowerCase().includes(searchTerm)
    );
  });

  const getDaysUntilText = (daysUntil: number) => {
    if (daysUntil === 0) return 'Today!';
    if (daysUntil === 1) return 'Tomorrow';
    if (daysUntil < 7) return `${daysUntil} days`;
    if (daysUntil < 30) return `${Math.ceil(daysUntil / 7)} weeks`;
    return `${Math.ceil(daysUntil / 30)} months`;
  };

  const getDaysUntilColor = (daysUntil: number) => {
    if (daysUntil === 0) return 'text-red-600 bg-red-100';
    if (daysUntil <= 3) return 'text-orange-600 bg-orange-100';
    if (daysUntil <= 7) return 'text-yellow-600 bg-yellow-100';
    return 'text-blue-600 bg-blue-100';
  };

  const getMonthName = (monthIndex: number) => {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return months[monthIndex];
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  return (
    <div className="p-6 space-y-6">
      <MemberMobileNav title="Birthdays" />
      <div className="flex items-center gap-3">
        <Heart className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Upcoming Birthdays</h1>
          <p className="text-gray-600">Celebrate with your church family</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-blue-600">{birthdays.filter((b) => b.month === new Date().getMonth()).length}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Next 7 Days</p>
              <p className="text-2xl font-bold text-orange-600">{birthdays.filter((b) => b.daysUntil >= 0 && b.daysUntil <= 7).length}</p>
            </div>
            <Cake className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Members</p>
              <p className="text-2xl font-bold text-green-600">{birthdays.length}</p>
            </div>
            <Gift className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-2 text-gray-800">
            <Filter className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Filters</h3>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" />
              <input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-3 py-2 border rounded-md text-sm w-64"
              />
            </div>

            <select
              value={filterTimeframe}
              onChange={(e) => setFilterTimeframe(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm"
            >
              <option value="upcoming">Next 7 Days</option>
              <option value="this_month">This Month</option>
              <option value="next_month">Next Month</option>
              <option value="all">All Birthdays</option>
            </select>

            <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="border rounded-md px-3 py-2 text-sm">
              <option value="all">All Months</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>
                  {getMonthName(i)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800">Birthdays</h3>
        </div>

        <div className="p-4">
          {error && <div className="text-sm text-red-600 mb-4 p-3 bg-red-50 rounded-md">{error}</div>}

          {loading && <div className="text-sm text-gray-600 mb-4 p-3 bg-gray-50 rounded-md">Loading birthdays...</div>}

          <div className="space-y-3">
            {filteredBirthdays.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Heart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No birthdays found</h3>
                <p className="text-sm">
                  {searchQuery ? 'Try adjusting your search criteria' : 'No birthdays match your current filters'}
                </p>
              </div>
            ) : (
              filteredBirthdays.map((birthday) => (
                <div
                  key={birthday.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-pink-600 font-bold text-lg">{getInitials(birthday.first_name, birthday.last_name)}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {birthday.first_name} {birthday.last_name}
                      </h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {getMonthName(birthday.month)} {birthday.day}
                        </span>
                        {birthday.email && <span className="truncate">{birthday.email}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDaysUntilColor(birthday.daysUntil)}`}>
                      {getDaysUntilText(birthday.daysUntil)}
                    </span>

                    {birthday.daysUntil === 0 && (
                      <div className="flex items-center gap-1 text-red-600">
                        <Cake className="w-4 h-4" />
                        <span className="text-sm font-medium">Today!</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
            <div>
              Showing {filteredBirthdays.length} of {birthdays.length} birthdays
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberBirthdays;
