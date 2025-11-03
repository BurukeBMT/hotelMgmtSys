import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { guestsService } from '../services/api';

const Guests = () => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['guests'],
    queryFn: async () => {
      const res = await guestsService.getGuests();
      return res?.data || res;
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Guests</h1>
      <p className="mt-1 text-sm text-gray-500">Manage guest information and profiles</p>
      <div className="mt-6 bg-white shadow rounded-lg p-6">
        {isLoading && <div className="text-gray-500">Loading guests...</div>}
        {isError && <div className="text-red-600">Failed to load guests: {error.message}</div>}
        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(data?.data || data || []).map((g) => (
                  <tr key={g.id}>
                    <td className="px-4 py-2 text-sm text-gray-900">{g.first_name} {g.last_name}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{g.email}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{g.phone}</td>
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

export default Guests;
