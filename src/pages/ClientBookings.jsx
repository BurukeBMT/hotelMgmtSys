import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Users, DollarSign, Search, Filter, Eye, Download, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { bookingsService } from '../services/firebaseService';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const toJsDate = (val) => {
  if (!val) return null;
  try {
    return typeof val?.toDate === 'function' ? val.toDate() : new Date(val);
  } catch {
    return null;
  }
};

const ClientBookings = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      console.log('📖 Loading bookings for authenticated user...');
      const response = await bookingsService.getBookings();
      setBookings(response.data || []);
      console.log(`✅ Loaded ${response.data?.length || 0} bookings`);
    } catch (error) {
      // Don't show error toast if user is not authenticated - we'll redirect
      if (error.message === 'Not authenticated') {
        console.log('User not authenticated, will redirect');
        navigate('/client');
        return;
      }
      toast.error('Failed to load bookings');
      console.error('Load bookings error:', error);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    // If not authenticated, redirect to login or client home
    if (!isAuthenticated) {
      console.log('User not authenticated, redirecting...');
      navigate('/client');
      return;
    }

    // User is authenticated, load bookings
    loadBookings();
  }, [isAuthenticated, authLoading, user, navigate, loadBookings]);

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = (booking.booking_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (booking.guest?.first_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (booking.guest?.last_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      confirmed: { color: 'bg-green-100 text-green-800', text: 'Confirmed' },
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      cancelled: { color: 'bg-red-100 text-red-800', text: 'Cancelled' },
      completed: { color: 'bg-blue-100 text-blue-800', text: 'Completed' }
    };
    
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', text: status };
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const openBookingDetails = (booking) => {
    setSelectedBooking(booking);
    setShowDetails(true);
  };

  const closeBookingDetails = () => {
    setSelectedBooking(null);
    setShowDetails(false);
  };

  const exportBookings = () => {
    // Simple CSV export
    const csvContent = [
      ['Booking Number', 'Check-in', 'Check-out', 'Guests', 'Total Amount', 'Status'],
      ...filteredBookings.map(booking => [
        booking.booking_number,
        new Date(booking.check_in_date).toLocaleDateString(),
        new Date(booking.check_out_date).toLocaleDateString(),
        `${booking.adults} adults, ${booking.children} children`,
        `$${booking.total_amount}`,
        booking.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-bookings.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Show loading while auth is being checked or bookings are loading
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {authLoading ? 'Checking authentication...' : 'Loading bookings...'}
          </p>
        </div>
      </div>
    );
  }

  // If not authenticated, show nothing (redirect will happen)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
                <p className="text-gray-600">Manage your hotel reservations</p>
              </div>
              <button
                onClick={exportBookings}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search bookings..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                </select>
                <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bookings List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
              <p className="text-gray-500">You haven't made any bookings yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Booking
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dates
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Guests
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            #{booking.booking_number || booking.id}
                          </div>
                          <div className="text-sm text-gray-500">
                            Room {booking.room?.room_number || booking.room_number || booking.roomId || booking.room_id || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {(() => { const d = toJsDate(booking.check_in_date || booking.checkInDate); return d ? d.toLocaleDateString() : '-'; })()}
                        </div>
                        <div className="text-sm text-gray-500">
                          to {(() => { const d = toJsDate(booking.check_out_date || booking.checkOutDate); return d ? d.toLocaleDateString() : '-'; })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Users className="h-4 w-4 mr-1 text-gray-400" />
                          {booking.adults} adults, {booking.children} children
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm font-medium text-gray-900">
                          <DollarSign className="h-4 w-4 mr-1 text-gray-400" />
                          ${booking.total_amount}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(booking.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => openBookingDetails(booking)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Booking Details Modal */}
        {showDetails && selectedBooking && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Booking Details - #{selectedBooking.booking_number}
                  </h3>
                  <button
                    onClick={closeBookingDetails}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="space-y-6">
                  {/* Booking Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Check-in Date</h4>
                      <p className="text-sm text-gray-900">
                        {(() => { const d = toJsDate(selectedBooking.check_in_date || selectedBooking.checkInDate); return d ? d.toLocaleDateString() : '-'; })()}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Check-out Date</h4>
                      <p className="text-sm text-gray-900">
                        {(() => { const d = toJsDate(selectedBooking.check_out_date || selectedBooking.checkOutDate); return d ? d.toLocaleDateString() : '-'; })()}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Room Number</h4>
                      <p className="text-sm text-gray-900">
                        {selectedBooking.room?.room_number || selectedBooking.room_number || selectedBooking.roomId || selectedBooking.room_id || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Status</h4>
                      {getStatusBadge(selectedBooking.status)}
                    </div>
                  </div>

                  {/* Guest Info */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Guest Information</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-900">
                        <strong>Name:</strong> {selectedBooking.guest?.first_name} {selectedBooking.guest?.last_name}
                      </p>
                      <p className="text-sm text-gray-900">
                        <strong>Email:</strong> {selectedBooking.guest?.email || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-900">
                        <strong>Phone:</strong> {selectedBooking.guest?.phone || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Booking Details */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Booking Details</h4>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <p className="text-sm text-gray-900">
                        <strong>Adults:</strong> {selectedBooking.adults}
                      </p>
                      <p className="text-sm text-gray-900">
                        <strong>Children:</strong> {selectedBooking.children}
                      </p>
                      <p className="text-sm text-gray-900">
                        <strong>Total Amount:</strong> ${selectedBooking.total_amount}
                      </p>
                      {selectedBooking.special_requests && (
                        <p className="text-sm text-gray-900">
                          <strong>Special Requests:</strong> {selectedBooking.special_requests}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Created Date */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Booking Date</h4>
                    <p className="text-sm text-gray-900">
                      {(() => { const d = toJsDate(selectedBooking.created_at || selectedBooking.createdAt); return d ? d.toLocaleString() : '-'; })()}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={closeBookingDetails}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientBookings;
