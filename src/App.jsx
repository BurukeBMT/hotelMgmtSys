import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Landing from './pages/Landing';

import ClientHome from './pages/ClientHome';
import ClientBooking from './pages/ClientBooking';
import ClientProfile from './pages/ClientProfile';
import ClientBookings from './pages/ClientBookings';
import Dashboard from './pages/Dashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AdminManagement from './pages/AdminManagement';
import PriceTracking from './pages/PriceTracking';
import Layout from './components/Layout';
import Bookings from './pages/Bookings';
import Rooms from './pages/Rooms';
import Guests from './pages/Guests';
import HR from './pages/HR';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Register from './pages/Admin/Register';

const SuperAdminRoute = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const isSuperAdmin = user?.role === 'super_admin';
  return isSuperAdmin ? <>{children}</> : <Navigate to="/admin" />;
};

const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const isAdmin = ['super_admin', 'admin', 'manager', 'staff'].includes(user?.role);
  return isAdmin ? <>{children}</> : <Navigate to="/client" />;
};

// Client pages are public — no auth guard required. If you want to reintroduce
// auth for clients later, implement a redirect based on `useAuth()` here.

const App = () => {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          {/* Registration page removed from client-facing routes. */}

          <Route
            path="/super-admin"
            element={
              <SuperAdminRoute>
                <Layout />
              </SuperAdminRoute>
            }
          >
            <Route index element={<SuperAdminDashboard />} />
            <Route path="admins" element={<AdminManagement />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="rooms" element={<Rooms />} />
            <Route path="cabins" element={<Rooms />} />
            <Route path="pricing" element={<PriceTracking />} />
            <Route path="guests" element={<Guests />} />
            <Route path="hr" element={<HR />} />
            <Route path="payments" element={<Payments />} />
            <Route path="payment-gateway" element={<Payments />} />
            <Route path="reports" element={<Reports />} />
            <Route path="users" element={<Users />} />
            <Route path="register" element={<Register />} />
          </Route>

          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Layout />
              </AdminRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="rooms" element={<Rooms />} />
            <Route path="cabins" element={<Rooms />} />
            <Route path="pricing" element={<PriceTracking />} />
            <Route path="guests" element={<Guests />} />
            <Route path="hr" element={<HR />} />
            <Route path="payments" element={<Payments />} />
            <Route path="payment-gateway" element={<Payments />} />
            <Route path="reports" element={<Reports />} />
            <Route path="users" element={<Users />} />
          </Route>

          <Route path="/client" element={<ClientHome />} />
          <Route path="/client/book" element={<ClientBooking />} />
          <Route path="/client/profile" element={<ClientProfile />} />
          <Route path="/client/bookings" element={<ClientBookings />} />
        </Routes>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </div>
    </AuthProvider>
  );
};

export default App;
