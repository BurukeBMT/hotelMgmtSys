import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { bookingsService } from '../services/api';

const Bookings = () => {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['bookings', { page: 1 }],
    queryFn: async () => {
      const res = await bookingsService.getBookings();
      return res?.data || res;
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Bookings</h1>
      <p className="mt-1 text-sm text-gray-500">Manage hotel bookings and reservations</p>
      <div className="mt-6 bg-white shadow rounded-lg p-6">
        {isLoading && (
          <div className="text-gray-500">Loading bookings...</div>
        )}
        {isError && (
          <div className="text-red-600">Failed to load bookings: {error.message}</div>
        )}
        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking #</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-in</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-out</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(data?.data || data || []).map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-2 text-sm text-gray-900">{b.booking_number}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{b.first_name} {b.last_name}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{b.room_number}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{new Date(b.check_in_date).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{new Date(b.check_out_date).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">${b.total_amount}</td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => refetch()} className="text-blue-600 hover:underline text-sm">Refresh</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Bookings;
