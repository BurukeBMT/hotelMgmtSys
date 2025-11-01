import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersService } from '../services/api';

const Users = () => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await usersService.getUsers();
      return res?.data || res;
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
      <p className="mt-1 text-sm text-gray-500">Manage system users and permissions</p>
      <div className="mt-6 bg-white shadow rounded-lg p-6">
        {isLoading && <div className="text-gray-500">Loading users...</div>}
        {isError && <div className="text-red-600">Failed to load users: {error.message}</div>}
        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(data?.data || data || []).map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-2 text-sm text-gray-900">{u.first_name} {u.last_name}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{u.email}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{u.role}</td>
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

export default Users;
