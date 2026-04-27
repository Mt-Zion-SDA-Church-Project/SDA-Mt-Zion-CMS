import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="hidden lg:block">
        <Sidebar isCollapsed={sidebarCollapsed} />
      </div>
      
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Header toggleSidebar={toggleSidebar} />

        <main className="min-h-0 flex-1 overflow-auto p-3 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;