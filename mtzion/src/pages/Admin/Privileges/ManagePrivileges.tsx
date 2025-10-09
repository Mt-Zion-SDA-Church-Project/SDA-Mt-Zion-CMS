import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Shield, Users, Settings, Save, RefreshCw, Search, Filter, Zap, Eye, EyeOff } from 'lucide-react';
import { UserPrivilege, PrivilegeTab, SystemUser, Member } from '../../../types';

const ManagePrivileges: React.FC = () => {
  const [users, setUsers] = useState<(SystemUser | Member)[]>([]);
  const [privileges, setPrivileges] = useState<UserPrivilege[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserType, setSelectedUserType] = useState<'admin' | 'member'>('admin');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'allowed' | 'blocked'>('all');
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Define available tabs for each user type
  const adminTabs: PrivilegeTab[] = [
    { name: 'dashboard', label: 'Dashboard', userType: 'admin' },
    { name: 'members', label: 'Members', userType: 'admin' },
    { name: 'visitors', label: 'Visitors', userType: 'admin' },
    { name: 'offertory', label: 'Offertory', userType: 'admin' },
    { name: 'events', label: 'Events', userType: 'admin' },
    { name: 'attendance', label: 'Attendance', userType: 'admin' },
    { name: 'reports', label: 'Reports', userType: 'admin' },
    { name: 'gallery', label: 'Gallery', userType: 'admin' },
    { name: 'system_users', label: 'System Users', userType: 'admin' },
  ];

  const memberTabs: PrivilegeTab[] = [
    { name: 'dashboard', label: 'Dashboard', userType: 'member' },
    { name: 'qr_checkin', label: 'QR Check-in', userType: 'member' },
    { name: 'events', label: 'Events', userType: 'member' },
    { name: 'birthdays', label: 'Birthdays', userType: 'member' },
    { name: 'resources', label: 'Sabbath School Resources', userType: 'member' },
    { name: 'offertory', label: 'Give Offertory', userType: 'member' },
    { name: 'gallery', label: 'Gallery', userType: 'member' },
  ];

  const currentTabs = selectedUserType === 'admin' ? adminTabs : memberTabs;

  useEffect(() => {
    loadData();
  }, [selectedUserType]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load users based on selected type
      let usersData: (SystemUser | Member)[] = [];
      if (selectedUserType === 'admin') {
        const { data: adminUsers, error: adminError } = await supabase
          .from('system_users')
          .select('*')
          .eq('role', 'admin')
          .eq('is_active', true);
        
        if (adminError) throw adminError;
        usersData = adminUsers || [];
      } else {
        const { data: members, error: memberError } = await supabase
          .from('members')
          .select('id, first_name, last_name, email, status, created_at')
          .eq('status', 'active');
        
        if (memberError) throw memberError;
        usersData = members || [];
      }

      // Load existing privileges
      const userIds = usersData.map(u => u.id);
      if (userIds.length > 0) {
        const { data: privilegesData, error: privilegesError } = await supabase
          .from('user_privileges')
          .select('*')
          .eq('user_type', selectedUserType)
          .in('user_id', userIds);

        if (privilegesError) throw privilegesError;
        setPrivileges(privilegesData || []);
      } else {
        setPrivileges([]);
      }

      setUsers(usersData);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getPrivilegeForUser = (userId: string, tabName: string): boolean => {
    const privilege = privileges.find(p => p.user_id === userId && p.tab_name === tabName);
    return privilege ? privilege.is_allowed : true; // Default to allowed
  };

  const updatePrivilege = (userId: string, tabName: string, isAllowed: boolean) => {
    setPrivileges(prev => {
      const existing = prev.find(p => p.user_id === userId && p.tab_name === tabName);
      if (existing) {
        return prev.map(p => 
          p.user_id === userId && p.tab_name === tabName 
            ? { ...p, is_allowed: isAllowed }
            : p
        );
      } else {
        return [...prev, {
          id: '',
          user_id: userId,
          user_type: selectedUserType,
          tab_name: tabName,
          is_allowed: isAllowed,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }];
      }
    });
  };

  const savePrivileges = async () => {
    try {
      setSaving(true);
      setError(null);

      // Delete existing privileges for these users
      const userIds = users.map(u => u.id);
      if (userIds.length > 0) {
        await supabase
          .from('user_privileges')
          .delete()
          .eq('user_type', selectedUserType)
          .in('user_id', userIds);
      }

      // Insert new privileges
      const privilegesToInsert = privileges
        .filter(p => userIds.includes(p.user_id))
        .map(p => ({
          user_id: p.user_id,
          user_type: p.user_type,
          tab_name: p.tab_name,
          is_allowed: p.is_allowed
        }));

      if (privilegesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('user_privileges')
          .insert(privilegesToInsert);

        if (insertError) throw insertError;
      }

      alert('Privileges saved successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to save privileges');
    } finally {
      setSaving(false);
    }
  };

  const getUserName = (user: SystemUser | Member): string => {
    if ('full_name' in user) {
      return user.full_name || user.username || 'Unknown';
    } else {
      return `${user.first_name} ${user.last_name}`;
    }
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user => {
    const name = getUserName(user).toLowerCase();
    const email = ('email' in user ? user.email : '').toLowerCase();
    return name.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
  });

  // Quick action functions
  const allowAllPrivileges = () => {
    const newPrivileges = [...privileges];
    filteredUsers.forEach(user => {
      currentTabs.forEach(tab => {
        const existingIndex = newPrivileges.findIndex(p => p.user_id === user.id && p.tab_name === tab.name);
        if (existingIndex >= 0) {
          newPrivileges[existingIndex] = { ...newPrivileges[existingIndex], is_allowed: true };
        } else {
          newPrivileges.push({
            id: '',
            user_id: user.id,
            user_type: selectedUserType,
            tab_name: tab.name,
            is_allowed: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      });
    });
    setPrivileges(newPrivileges);
  };

  const blockAllPrivileges = () => {
    const newPrivileges = [...privileges];
    filteredUsers.forEach(user => {
      currentTabs.forEach(tab => {
        const existingIndex = newPrivileges.findIndex(p => p.user_id === user.id && p.tab_name === tab.name);
        if (existingIndex >= 0) {
          newPrivileges[existingIndex] = { ...newPrivileges[existingIndex], is_allowed: false };
        } else {
          newPrivileges.push({
            id: '',
            user_id: user.id,
            user_type: selectedUserType,
            tab_name: tab.name,
            is_allowed: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      });
    });
    setPrivileges(newPrivileges);
  };

  const resetToDefaults = () => {
    const newPrivileges = privileges.filter(p => !filteredUsers.some(user => user.id === p.user_id));
    setPrivileges(newPrivileges);
  };

  // Column-level privilege management
  const getColumnStatus = (tabName: string): 'all' | 'none' | 'mixed' => {
    const userCount = filteredUsers.length;
    if (userCount === 0) return 'none';
    
    const allowedCount = filteredUsers.filter(user => getPrivilegeForUser(user.id, tabName)).length;
    
    if (allowedCount === 0) return 'none';
    if (allowedCount === userCount) return 'all';
    return 'mixed';
  };

  const toggleColumnPrivilege = (tabName: string) => {
    const status = getColumnStatus(tabName);
    const newValue = status === 'all' ? false : true; // Toggle to opposite
    
    const newPrivileges = [...privileges];
    filteredUsers.forEach(user => {
      const existingIndex = newPrivileges.findIndex(p => p.user_id === user.id && p.tab_name === tabName);
      if (existingIndex >= 0) {
        newPrivileges[existingIndex] = { ...newPrivileges[existingIndex], is_allowed: newValue };
      } else {
        newPrivileges.push({
          id: '',
          user_id: user.id,
          user_type: selectedUserType,
          tab_name: tabName,
          is_allowed: newValue,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    });
    setPrivileges(newPrivileges);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
            <span>Loading privileges...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-800">User Privileges Management</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">User Type:</label>
                <select
                  value={selectedUserType}
                  onChange={(e) => setSelectedUserType(e.target.value as 'admin' | 'member')}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                >
                  <option value="admin">Admins</option>
                  <option value="member">Members</option>
                </select>
              </div>
              <button
                onClick={savePrivileges}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={`Search ${selectedUserType}s by name or email...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'allowed' | 'blocked')}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="all">All Users</option>
                <option value="allowed">With Restrictions</option>
                <option value="blocked">Fully Blocked</option>
              </select>
            </div>
            <button
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              <Zap className="w-4 h-4" />
              Quick Actions
            </button>
          </div>

          {/* Quick Actions Panel */}
          {showQuickActions && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold text-blue-800 mb-3">Quick Actions for {filteredUsers.length} user(s)</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={allowAllPrivileges}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 text-sm"
                >
                  <Eye className="w-3 h-3" />
                  Allow All Tabs
                </button>
                <button
                  onClick={blockAllPrivileges}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm"
                >
                  <EyeOff className="w-3 h-3" />
                  Block All Tabs
                </button>
                <button
                  onClick={resetToDefaults}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reset to Defaults
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchTerm ? `No ${selectedUserType}s found matching "${searchTerm}"` : `No ${selectedUserType}s found`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="mb-4 text-sm text-gray-600">
                Showing {filteredUsers.length} of {users.length} {selectedUserType}s
              </div>
              <table className="min-w-full border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 border-b font-medium text-gray-700">User</th>
                    {currentTabs.map(tab => {
                      const columnStatus = getColumnStatus(tab.name);
                      const isChecked = columnStatus === 'all';
                      const isIndeterminate = columnStatus === 'mixed';
                      
                      return (
                        <th key={tab.name} className="text-center p-3 border-b font-medium text-gray-700">
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-sm">{tab.label}</span>
                            <label className="inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                ref={(el) => {
                                  if (el) el.indeterminate = isIndeterminate;
                                }}
                                onChange={() => toggleColumnPrivilege(tab.name)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                title={`${isChecked ? 'Block' : 'Allow'} all ${tab.label} privileges`}
                              />
                              <span className="ml-2 text-xs text-gray-500">
                                {isChecked ? 'All' : isIndeterminate ? 'Mixed' : 'None'}
                              </span>
                            </label>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => {
                    // Apply status filter
                    const userPrivileges = privileges.filter(p => p.user_id === user.id);
                    const blockedCount = userPrivileges.filter(p => !p.is_allowed).length;
                    const totalCount = currentTabs.length;
                    
                    if (filterStatus === 'allowed' && blockedCount === 0) return null;
                    if (filterStatus === 'blocked' && blockedCount < totalCount) return null;
                    
                    return (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="p-3 border-b">
                          <div>
                            <p className="font-medium text-gray-800">{getUserName(user)}</p>
                            <p className="text-sm text-gray-500">
                              {'email' in user ? user.email : 'email@example.com'}
                            </p>
                            {blockedCount > 0 && (
                              <p className="text-xs text-red-600 mt-1">
                                {blockedCount} of {totalCount} tabs blocked
                              </p>
                            )}
                          </div>
                        </td>
                        {currentTabs.map(tab => (
                          <td key={tab.name} className="p-3 border-b text-center">
                            <label className="inline-flex items-center">
                              <input
                                type="checkbox"
                                checked={getPrivilegeForUser(user.id, tab.name)}
                                onChange={(e) => updatePrivilege(user.id, tab.name, e.target.checked)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="ml-2 text-sm text-gray-600">
                                {getPrivilegeForUser(user.id, tab.name) ? 'Allowed' : 'Blocked'}
                              </span>
                            </label>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagePrivileges;

