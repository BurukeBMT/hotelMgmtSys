import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Building2, LogIn, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Landing = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    // Don't redirect if already on landing page
    if (location.pathname === '/' && isAuthenticated) {
      return;
    }
    if (isAuthenticated) {
      if (['admin', 'manager', 'staff'].includes(user?.role)) {
        navigate('/admin', { replace: true });
      } else {
        navigate('/client', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, location.pathname]);

  const handleAdmin = () => {
    if (isAuthenticated) {
      if (['admin', 'manager', 'staff'].includes(user?.role)) {
        navigate('/admin');
        return;
      }
      navigate('/client');
      return;
    }
    navigate('/login');
  };

  const handleClient = () => {
    // Navigate to client page when client portal button is clicked
    navigate('/client');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100" />
        </div>
        <div className="relative pt-16 pb-24 sm:pt-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-2xl bg-blue-600 shadow-lg">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
                Welcome to Our Hotel
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-xl text-gray-600">
                Experience comfort and luxury. Book your stay with ease or manage hotel operations with a powerful admin suite.
              </p>
              <div className="mt-10 flex justify-center gap-4">
                <button
                  onClick={handleAdmin}
                  className="inline-flex items-center rounded-md bg-blue-600 px-6 py-3 text-white shadow hover:bg-blue-700"
                >
                  Admin Portal
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
                <button
                  onClick={handleClient}
                  className="inline-flex items-center rounded-md bg-white px-6 py-3 text-blue-700 ring-1 ring-inset ring-blue-200 hover:bg-blue-50"
                >
                  Client Portal
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
              </div>
              <div className="mt-6 flex justify-center gap-6 text-sm text-gray-600">
                <Link to="/login" className="inline-flex items-center hover:text-gray-800">
                  <LogIn className="mr-2 h-4 w-4" /> Sign in
                </Link>
                {/* Direct registration removed — users should sign in instead */}
                <Link to="/login" className="inline-flex items-center hover:text-gray-800">
                  <LogIn className="mr-2 h-4 w-4" /> Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="rounded-xl bg-white p-6 shadow">
            <h3 className="text-lg font-semibold text-gray-900">Modern Rooms</h3>
            <p className="mt-2 text-gray-600">Comfortable, well-appointed rooms with all the amenities you need.</p>
          </div>
          <div className="rounded-xl bg-white p-6 shadow">
            <h3 className="text-lg font-semibold text-gray-900">Prime Location</h3>
            <p className="mt-2 text-gray-600">Close to business hubs and attractions for convenience.</p>
          </div>
          <div className="rounded-xl bg-white p-6 shadow">
            <h3 className="text-lg font-semibold text-gray-900">Great Service</h3>
            <p className="mt-2 text-gray-600">Friendly staff ready to help 24/7 for a seamless stay.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;


