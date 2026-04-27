import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import LoginForm from './components/Auth/LoginForm';
import PostLoginRedirect from './components/Auth/PostLoginRedirect';
import EmailCredentialsChecker from './components/EmailCredentialsChecker';
import AdminDashboard from './pages/Admin/Dashboard';
import MemberDashboard from './pages/Member/Dashboard';
import MemberQRCheckIn from './pages/Member/QRCheckIn';
import MemberEvents from './pages/Member/Events';
import MemberBirthdays from './pages/Member/Birthdays';
import MemberResources from './pages/Member/Resources';
import GiveOffertory from './pages/Member/GiveOffertory';
import OffertoryReceipt from './pages/Member/OffertoryReceipt';
import MemberDetails from './pages/Admin/Members/MemberDetails';
import AddMember from './pages/Admin/Members/AddMember';
import Birthdays from './pages/Admin/Members/Birthdays';
import MembersList from './pages/Admin/Members/List';
import TeensDetails from './pages/Admin/Members/TeensDetails';
import AddTeen from './pages/Admin/Members/AddTeen';
import SabbathDetails from './pages/Admin/Members/SabbathDetails';
import AddSabbath from './pages/Admin/Members/AddSabbath';
import VisitorsDetails from './pages/Admin/Visitors/VisitorsDetails';
import AddVisitor from './pages/Admin/Visitors/AddVisitor';
import TithesPaid from './pages/Admin/Givings/TithesPaid';
import AddTithe from './pages/Admin/Givings/AddTithe';
import Offering from './pages/Admin/Givings/Offering';
import AddOffering from './pages/Admin/Givings/AddOffering';
import ManageSystemUsers from './pages/Admin/SystemUsers/ManageSystemUsers';
import AddSystemUser from './pages/Admin/SystemUsers/AddSystemUser';
import ManagePrivileges from './pages/Admin/Privileges/ManagePrivileges';
import ActivityLog from './pages/Admin/Logs/ActivityLog';
import UserLog from './pages/Admin/Logs/UserLog';
import AddEvent from './pages/Admin/Events/AddEvent';
import UpcomingEvents from './pages/Admin/Events/UpcomingEvents';
import AttendanceManager from './pages/Admin/Attendance/AttendanceManager';
import Reports from './pages/Admin/Reports/Reports';
import AdminGallery from './pages/Admin/Gallery';
import MemberGallery from './pages/Member/Gallery';
import PageLoader from './components/Layout/PageLoader';

function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode, requiredRole?: string }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader message="Verifying your session…" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const hasRequiredRole = !requiredRole || user.role === 'super_admin' || user.role === requiredRole;
  if (!hasRequiredRole) {
    return <Navigate to={user.role === 'admin' || user.role === 'super_admin' ? '/admin' : '/member'} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader message="Loading your workspace…" />;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        {/* Allow QR deep link while logged out so ?data= is preserved and we can return after login */}
        <Route path="/member/qr-checkin" element={<MemberQRCheckIn />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<PostLoginRedirect />} />
      
      <Route element={<Layout />}>
        {/* Admin Routes */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/members" 
          element={
            <ProtectedRoute requiredRole="admin">
              <MembersList />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/members/details" 
          element={
            <ProtectedRoute requiredRole="admin">
              <MemberDetails />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/members/add" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AddMember />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/members/birthdays" 
          element={
            <ProtectedRoute requiredRole="admin">
              <Birthdays />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/teens/details" 
          element={
            <ProtectedRoute requiredRole="admin">
              <TeensDetails />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/teens/add" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AddTeen />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/sabbath/details" 
          element={
            <ProtectedRoute requiredRole="admin">
              <SabbathDetails />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/sabbath/add" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AddSabbath />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/visitors/details" 
          element={
            <ProtectedRoute requiredRole="admin">
              <VisitorsDetails />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/visitors/add" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AddVisitor />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/givings/tithes" 
          element={
            <ProtectedRoute requiredRole="admin">
              <TithesPaid />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/givings/tithes/add" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AddTithe />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/givings/offering" 
          element={
            <ProtectedRoute requiredRole="admin">
              <Offering />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/givings/offering/add" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AddOffering />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/system-users/manage" 
          element={
            <ProtectedRoute requiredRole="admin">
              <ManageSystemUsers />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/system-users/add" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AddSystemUser />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/privileges" 
          element={
            <ProtectedRoute requiredRole="super_admin">
              <ManagePrivileges />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/logs/activity" 
          element={
            <ProtectedRoute requiredRole="admin">
              <ActivityLog />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/logs/user" 
          element={
            <ProtectedRoute requiredRole="admin">
              <UserLog />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/events/add" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AddEvent />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/events/upcoming" 
          element={
            <ProtectedRoute requiredRole="admin">
              <UpcomingEvents />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/attendance" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AttendanceManager />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/reports" 
          element={
            <ProtectedRoute requiredRole="admin">
              <Reports />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/gallery" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminGallery />
            </ProtectedRoute>
          } 
        />

        {/* Member Routes */}
        <Route 
          path="/member" 
          element={
            <ProtectedRoute requiredRole="member">
              <MemberDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/member/qr-checkin" 
          element={
            <ProtectedRoute requiredRole="member">
              <MemberQRCheckIn />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/member/events" 
          element={
            <ProtectedRoute requiredRole="member">
              <MemberEvents />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/member/birthdays" 
          element={
            <ProtectedRoute requiredRole="member">
              <MemberBirthdays />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/member/resources" 
          element={
            <ProtectedRoute requiredRole="member">
              <MemberResources />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/member/offertory" 
          element={
            <ProtectedRoute requiredRole="member">
              <GiveOffertory />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/member/offertory/receipt/:id" 
          element={
            <ProtectedRoute requiredRole="member">
              <OffertoryReceipt />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/member/gallery" 
          element={
            <ProtectedRoute requiredRole="member">
              <MemberGallery />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/member/events"
          element={
            <ProtectedRoute requiredRole="member">
              <div className="p-8 bg-white rounded-lg shadow-md">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">Events & Birthdays</h1>
                <p className="text-gray-600">Events and birthdays features coming soon...</p>
              </div>
            </ProtectedRoute>
          } 
        />
      </Route>

      <Route path="/" element={<Navigate to={user.role === 'admin' || user.role === 'super_admin' ? '/admin' : '/member'} replace />} />
      <Route path="*" element={<Navigate to={user.role === 'admin' || user.role === 'super_admin' ? '/admin' : '/member'} replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-100">
          <EmailCredentialsChecker />
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;