import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wifi, Car, Coffee, Star, User, LogOut, Search, Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { roomsService } from '../services/api';
import toast from 'react-hot-toast';

const ClientHome = () => {
  const { user, logout, isAuthenticated } = useAuth();

  // Removed unused state
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      setLoading(true);
      // Load available rooms
      const roomsResponse = await roomsService.getRooms();
      setAvailableRooms(roomsResponse.data?.slice(0, 6) || []);
    } catch (error) {
      toast.error('Failed to load rooms');
      console.error('Load rooms error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
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

  // Show room listings for all users (authenticated and non-authenticated)
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
                  placeholder="Search rooms..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {isAuthenticated ? (
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
              ) : (
                <Link
                  to="/login"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">
            {isAuthenticated ? `Welcome back, ${user?.firstName}!` : 'Welcome to Our Hotel'}
          </h1>
          <p className="text-xl mb-8">
            {isAuthenticated ? 'Ready for your next luxurious stay?' : 'Experience comfort and luxury. Book your stay with ease.'}
          </p>
          {isAuthenticated && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/client/bookings"
                className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
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
          )}
        </div>
      </section>

      {/* Available Rooms */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Available Rooms</h2>
            {isAuthenticated && (
              <Link
                to="/client/bookings"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                View My Bookings
              </Link>
            )}
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            </div>
          ) : availableRooms.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No rooms available</h3>
              <p className="text-gray-500">Please check back later for available rooms.</p>
            </div>
          ) : (
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
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-2xl font-bold text-blue-600">
                        ${room.room_type?.base_price || room.price || 100}/night
                      </span>
                    </div>
                    <Link
                      to={`/book/${room.id}`}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-center block"
                    >
                      Book Now
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                <li><Link to="/" className="text-gray-400 hover:text-white">Home</Link></li>
                {isAuthenticated ? (
                  <>
                    <li><Link to="/client/bookings" className="text-gray-400 hover:text-white">My Bookings</Link></li>
                    <li><Link to="/client/profile" className="text-gray-400 hover:text-white">Profile</Link></li>
                  </>
                ) : (
                  <li><Link to="/login" className="text-gray-400 hover:text-white">Sign In</Link></li>
                )}
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