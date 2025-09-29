import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Users, 
  UserCheck, 
  Calendar, 
  DollarSign, 
  Settings, 
  FileText, 
  Activity,
  Home,
  Heart,
  Gift,
  BookOpen,
  Clock,
  ChevronDown,
  ChevronRight,
  UserPlus,
  Cake,
  QrCode
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import logo from '../../assets/sda-logo.png';

interface SidebarProps {
  isCollapsed: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed }) => {
  const { isAdmin, isMember } = useAuth();
  const [isMembersExpanded, setIsMembersExpanded] = useState(false);
  const [isTeensExpanded, setIsTeensExpanded] = useState(false);
  const [isVisitorsExpanded, setIsVisitorsExpanded] = useState(false);
  const [isGivingsExpanded, setIsGivingsExpanded] = useState(false);
  const [isSystemExpanded, setIsSystemExpanded] = useState(false);
  const [isLogsExpanded, setIsLogsExpanded] = useState(false);
  const [isEventsExpanded, setIsEventsExpanded] = useState(false);

  const adminMenuItems = [
    { icon: Home, label: 'Dashboard', path: '/admin' },
    { 
      icon: Users, 
      label: 'Members', 
      path: '/admin/members',
      hasSubmenu: true,
      submenu: [
        { icon: Users, label: 'Member Details', path: '/admin/members/details' },
        { icon: UserPlus, label: 'Add New Member', path: '/admin/members/add' },
        { icon: Cake, label: 'Birthdays', path: '/admin/members/birthdays' },
      ]
    },
    { 
      icon: BookOpen, 
      label: 'Children & Sabbath School', 
      path: '/admin/children-sabbath',
      hasSubmenu: true,
      submenu: [
        { icon: Users, label: 'Children Details', path: '/admin/teens/details' },
        { icon: Users, label: 'Sabbath School Details', path: '/admin/sabbath/details' },
        { icon: UserPlus, label: 'Add Child', path: '/admin/teens/add' },
        { icon: UserPlus, label: 'Add Sabbath School', path: '/admin/sabbath/add' },
      ]
    },
    { 
      icon: UserCheck, 
      label: 'Visitors', 
      path: '/admin/visitors',
      hasSubmenu: true,
      submenu: [
        { icon: Users, label: 'Visitor Details', path: '/admin/visitors/details' },
        { icon: UserPlus, label: 'Add Visitor', path: '/admin/visitors/add' },
      ]
    },
    { 
      icon: DollarSign, 
      label: 'Givings/Tithe', 
      path: '/admin/givings',
      hasSubmenu: true,
      submenu: [
        { icon: Gift, label: 'Tithes Paid', path: '/admin/givings/tithes' },
        { icon: UserPlus, label: 'Add Tithes', path: '/admin/givings/tithes/add' },
        { icon: Gift, label: 'Offering', path: '/admin/givings/offering' },
        { icon: UserPlus, label: 'Add Offering', path: '/admin/givings/offering/add' },
      ]
    },
    { 
      icon: Settings, 
      label: 'System Users', 
      path: '/admin/system-users',
      hasSubmenu: true,
      submenu: [
        { icon: Users, label: 'Manage System Users', path: '/admin/system-users/manage' },
        { icon: UserPlus, label: 'Add System User', path: '/admin/system-users/add' },
      ]
    },
    { 
      icon: Activity, 
      label: 'System Logs', 
      path: '/admin/logs',
      hasSubmenu: true,
      submenu: [
        { icon: Activity, label: 'Activity Log', path: '/admin/logs/activity' },
        { icon: Activity, label: 'User Log', path: '/admin/logs/user' },
      ]
    },
    { 
      icon: Calendar, 
      label: 'Events', 
      path: '/admin/events',
      hasSubmenu: true,
      submenu: [
        { icon: UserPlus, label: 'Add Event', path: '/admin/events/add' },
        { icon: Clock, label: 'Upcoming Events', path: '/admin/events/upcoming' },
      ]
    },
    { icon: Users, label: 'Attendance', path: '/admin/attendance' },
    { icon: FileText, label: 'Reports', path: '/admin/reports' },
  ];

  const memberMenuItems = [
    { icon: Home, label: 'Dashboard', path: '/member' },
    { icon: QrCode, label: 'QR Check-in', path: '/member/qr-checkin' },
    { icon: Calendar, label: 'Events', path: '/member/events' },
    { icon: Heart, label: 'Birthdays', path: '/member/birthdays' },
    { icon: Settings, label: 'My Account', path: '/member/account' },
    { icon: Heart, label: 'My Givings', path: '/member/givings' },
  ];

  const menuItems = isAdmin ? adminMenuItems : memberMenuItems;

  return (
    <div className={`bg-primary text-white h-screen transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    } flex-shrink-0`}>
      <div className="p-4">
        <div className="flex items-center space-x-3">
          <img src={logo} alt="SDA Mt. Zion Logo" className="w-16 h-16 object-contain" />
          {!isCollapsed && (
            <div>
              <h1 className="text-lg font-bold">SDA Mt. Zion</h1>
              <p className="text-xs text-blue-200">Church Management</p>
            </div>
          )}
        </div>
      </div>

      <nav className="mt-8">
        {menuItems.map((item) => (
          <div key={item.path}>
            {item.hasSubmenu && item.label === 'Members' ? (
              <div>
                <button
                  onClick={() => setIsMembersExpanded(!isMembersExpanded)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-[##006a7e] ${
                    isMembersExpanded ? 'bg-[##006a7e]' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <item.icon className="w-5 h-5" />
                    {!isCollapsed && <span className="ml-3">{item.label}</span>}
                  </div>
                  {!isCollapsed && (
                    isMembersExpanded ? 
                      <ChevronDown className="w-4 h-4" /> : 
                      <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                {isMembersExpanded && !isCollapsed && (
                  <div className="ml-6 mt-1">
                    {item.submenu?.map((subItem) => (
                      <NavLink
                        key={subItem.path}
                        to={subItem.path}
                        className={({ isActive }) =>
                          `flex items-center px-4 py-2 text-sm transition-colors rounded ${
                            isActive
                              ? 'bg-[##006a7e] text-yellow-300'
                              : 'hover:bg-[##006a7e] text-blue-100'
                          }`
                        }
                      >
                        <subItem.icon className="w-4 h-4" />
                        <span className="ml-3">{subItem.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : item.hasSubmenu && item.label === 'Children & Sabbath School' ? (
              <div>
                <button
                  onClick={() => setIsTeensExpanded(!isTeensExpanded)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-blue-800 ${
                    isTeensExpanded ? 'bg-blue-800' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <item.icon className="w-5 h-5" />
                    {!isCollapsed && <span className="ml-3">{item.label}</span>}
                  </div>
                  {!isCollapsed && (
                    isTeensExpanded ? 
                      <ChevronDown className="w-4 h-4" /> : 
                      <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                {isTeensExpanded && !isCollapsed && (
                  <div className="ml-6 mt-1">
                    {item.submenu?.map((subItem) => (
                      <NavLink
                        key={subItem.path}
                        to={subItem.path}
                        className={({ isActive }) =>
                          `flex items-center px-4 py-2 text-sm transition-colors rounded ${
                            isActive
                              ? 'bg-blue-700 text-yellow-300'
                              : 'hover:bg-blue-800 text-blue-200'
                          }`
                        }
                      >
                        <subItem.icon className="w-4 h-4" />
                        <span className="ml-3">{subItem.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : item.hasSubmenu && item.label === 'Visitors' ? (
              <div>
                <button
                  onClick={() => setIsVisitorsExpanded(!isVisitorsExpanded)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-blue-800 ${
                    isVisitorsExpanded ? 'bg-blue-800' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <item.icon className="w-5 h-5" />
                    {!isCollapsed && <span className="ml-3">{item.label}</span>}
                  </div>
                  {!isCollapsed && (
                    isVisitorsExpanded ? 
                      <ChevronDown className="w-4 h-4" /> : 
                      <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                {isVisitorsExpanded && !isCollapsed && (
                  <div className="ml-6 mt-1">
                    {item.submenu?.map((subItem) => (
                      <NavLink
                        key={subItem.path}
                        to={subItem.path}
                        className={({ isActive }) =>
                          `flex items-center px-4 py-2 text-sm transition-colors rounded ${
                            isActive
                              ? 'bg-blue-700 text-yellow-300'
                              : 'hover:bg-blue-800 text-blue-200'
                          }`
                        }
                      >
                        <subItem.icon className="w-4 h-4" />
                        <span className="ml-3">{subItem.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : item.hasSubmenu && item.label === 'Givings/Tithe' ? (
              <div>
                <button
                  onClick={() => setIsGivingsExpanded(!isGivingsExpanded)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-blue-800 ${
                    isGivingsExpanded ? 'bg-blue-800' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <item.icon className="w-5 h-5" />
                    {!isCollapsed && <span className="ml-3">{item.label}</span>}
                  </div>
                  {!isCollapsed && (
                    isGivingsExpanded ? 
                      <ChevronDown className="w-4 h-4" /> : 
                      <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                {isGivingsExpanded && !isCollapsed && (
                  <div className="ml-6 mt-1">
                    {item.submenu?.map((subItem) => (
                      <NavLink
                        key={subItem.path}
                        to={subItem.path}
                        className={({ isActive }) =>
                          `flex items-center px-4 py-2 text-sm transition-colors rounded ${
                            isActive
                              ? 'bg-blue-700 text-yellow-300'
                              : 'hover:bg-blue-800 text-blue-200'
                          }`
                        }
                      >
                        <subItem.icon className="w-4 h-4" />
                        <span className="ml-3">{subItem.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : item.hasSubmenu && item.label === 'System Users' ? (
              <div>
                <button
                  onClick={() => setIsSystemExpanded(!isSystemExpanded)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-blue-800 ${
                    isSystemExpanded ? 'bg-blue-800' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <item.icon className="w-5 h-5" />
                    {!isCollapsed && <span className="ml-3">{item.label}</span>}
                  </div>
                  {!isCollapsed && (
                    isSystemExpanded ? 
                      <ChevronDown className="w-4 h-4" /> : 
                      <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                {isSystemExpanded && !isCollapsed && (
                  <div className="ml-6 mt-1">
                    {item.submenu?.map((subItem) => (
                      <NavLink
                        key={subItem.path}
                        to={subItem.path}
                        className={({ isActive }) =>
                          `flex items-center px-4 py-2 text-sm transition-colors rounded ${
                            isActive
                              ? 'bg-blue-700 text-yellow-300'
                              : 'hover:bg-blue-800 text-blue-200'
                          }`
                        }
                      >
                        <subItem.icon className="w-4 h-4" />
                        <span className="ml-3">{subItem.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : item.hasSubmenu && item.label === 'System Logs' ? (
              <div>
                <button
                  onClick={() => setIsLogsExpanded(!isLogsExpanded)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-blue-800 ${
                    isLogsExpanded ? 'bg-blue-800' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <item.icon className="w-5 h-5" />
                    {!isCollapsed && <span className="ml-3">{item.label}</span>}
                  </div>
                  {!isCollapsed && (
                    isLogsExpanded ? 
                      <ChevronDown className="w-4 h-4" /> : 
                      <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                {isLogsExpanded && !isCollapsed && (
                  <div className="ml-6 mt-1">
                    {item.submenu?.map((subItem) => (
                      <NavLink
                        key={subItem.path}
                        to={subItem.path}
                        className={({ isActive }) =>
                          `flex items-center px-4 py-2 text-sm transition-colors rounded ${
                            isActive
                              ? 'bg-blue-700 text-yellow-300'
                              : 'hover:bg-blue-800 text-blue-200'
                          }`
                        }
                      >
                        <subItem.icon className="w-4 h-4" />
                        <span className="ml-3">{subItem.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : item.hasSubmenu && item.label === 'Events' ? (
              <div>
                <button
                  onClick={() => setIsEventsExpanded(!isEventsExpanded)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-blue-800 ${
                    isEventsExpanded ? 'bg-blue-800' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <item.icon className="w-5 h-5" />
                    {!isCollapsed && <span className="ml-3">{item.label}</span>}
                  </div>
                  {!isCollapsed && (
                    isEventsExpanded ? 
                      <ChevronDown className="w-4 h-4" /> : 
                      <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                {isEventsExpanded && !isCollapsed && (
                  <div className="ml-6 mt-1">
                    {item.submenu?.map((subItem) => (
                      <NavLink
                        key={subItem.path}
                        to={subItem.path}
                        className={({ isActive }) =>
                          `flex items-center px-4 py-2 text-sm transition-colors rounded ${
                            isActive
                              ? 'bg-blue-700 text-yellow-300'
                              : 'hover:bg-blue-800 text-blue-200'
                          }`
                        }
                      >
                        <subItem.icon className="w-4 h-4" />
                        <span className="ml-3">{subItem.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 text-sm transition-colors ${
                    isActive
                      ? 'bg-blue-800 border-r-4 border-yellow-500'
                      : 'hover:bg-blue-800'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                {!isCollapsed && <span className="ml-3">{item.label}</span>}
              </NavLink>
            )}
          </div>
        ))}
      </nav>

      {!isCollapsed && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-blue-800 rounded-lg p-3">
            <p className="text-xs text-blue-200">
              {isAdmin ? 'Admin Panel' : 'Member Portal'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;