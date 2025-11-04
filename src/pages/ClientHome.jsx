import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Star, Wifi, Car, Coffee, User, LogOut, Bell, Search, Building2, ArrowRight, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { bookingsService, roomsService } from '../services/api';
import toast from 'react-hot-toast';

const ClientHome = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [recentBookings, setRecentBookings] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      loadClientData();
    }
  }, [isAuthenticated]);

  const loadClientData = async () => {
    try {
      setLoading(true);
      // Load recent bookings for the client
      const bookingsResponse = await bookingsService.getBookings();
      setRecentBookings(bookingsResponse.data?.slice(0, 3) || []);

      // Load available rooms
      const roomsResponse = await roomsService.getRooms();
      setAvailableRooms(roomsResponse.data?.slice(0, 6) || []);
    } catch (error) {
      toast.error('Failed to load data');
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

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
    if (isAuthenticated && !['admin', 'manager', 'staff'].includes(user?.role)) {
      navigate('/client');
      return;
    }
    // Registration is disabled for public client flows — keep users on landing
    // and direct them to login if they already have an account.
    navigate('/');
  };

  const features = [
    { icon: Wifi, title: 'Free WiFi', description: 'High-speed internet throughout the hotel' },
    { icon: Car, title: 'Free Parking', description: 'Complimentary parking for all guests' },
    { icon: Coffee, title: 'Room Service', description: '24/7 room service available' },
    { icon: Star, title: 'Luxury Amenities', description: 'Premium amenities in every room' },
  ];

  if (loading && isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If not authenticated, show landing page style
  if (!isAuthenticated) {
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
      </div>
    );
  }

  // Authenticated client view
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">H</span>
              </div>
              <span className="ml-2 text-xl font-semibold text-gray-900">Hotel Management</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search rooms, amenities..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button className="p-2 text-gray-500 hover:text-gray-900">
                <Bell className="h-5 w-5" />
              </button>
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {user?.firstName} {user?.lastName}
                </span>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-500 hover:text-gray-900"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">Welcome back, {user?.firstName}!</h1>
          <p className="text-xl mb-8">Ready for your next luxurious stay?</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/client/book"
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Book New Stay
            </Link>
            <Link
              to="/client/bookings"
              className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
            >
              View My Bookings
            </Link>
            <Link
              to="/client/profile"
              className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
            >
              My Profile
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-6 rounded-lg text-center">
              <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-gray-900">Recent Bookings</h3>
              <p className="text-2xl font-bold text-blue-600">{recentBookings.length}</p>
            </div>
            <div className="bg-green-50 p-6 rounded-lg text-center">
              <Star className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-gray-900">Available Rooms</h3>
              <p className="text-2xl font-bold text-green-600">{availableRooms.length}</p>
            </div>
            <div className="bg-purple-50 p-6 rounded-lg text-center">
              <MapPin className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-gray-900">Hotel Location</h3>
              <p className="text-sm text-gray-600">Downtown City Center</p>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Bookings */}
      {recentBookings.length > 0 && (
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Recent Bookings</h2>
              <Link
                to="/client/bookings"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                View All
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentBookings.map((booking) => (
                <div key={booking.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Booking #{booking.booking_number}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p><strong>Check-in:</strong> {new Date(booking.check_in_date).toLocaleDateString()}</p>
                    <p><strong>Check-out:</strong> {new Date(booking.check_out_date).toLocaleDateString()}</p>
                    <p><strong>Guests:</strong> {booking.adults} adults, {booking.children} children</p>
                    <p><strong>Total:</strong> ${booking.total_amount}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Available Rooms */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Available Rooms</h2>
            <Link
              to="/client/book"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Book Now
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableRooms.map((room) => (
              <div key={room.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="h-48 bg-gray-200 flex items-center justify-center">
                  <Building2 className="h-12 w-12 text-gray-400" />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Room {room.room_number}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {room.room_type?.name || 'Standard Room'}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-blue-600">
                      ${room.room_type?.base_price || 100}/night
                    </span>
        <Link
          to="/client/book"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
                      Book Now
        </Link>
      </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">
            Why Choose Our Hotel?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Hotel Management</h3>
              <p className="text-gray-400">
                Your gateway to luxury and comfort. Book your perfect stay with us.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><Link to="/client/book" className="text-gray-400 hover:text-white">Book Now</Link></li>
                <li><Link to="/client/bookings" className="text-gray-400 hover:text-white">My Bookings</Link></li>
                <li><Link to="/client/profile" className="text-gray-400 hover:text-white">Profile</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <p className="text-gray-400">Email: info@hotel.com</p>
              <p className="text-gray-400">Phone: +1 (555) 123-4567</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ClientHome;
