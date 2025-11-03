import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { roomsService } from '../services/api';

const Rooms = () => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const res = await roomsService.getRooms();
      return res?.data || res;
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Rooms</h1>
      <p className="mt-1 text-sm text-gray-500">Manage hotel rooms and availability</p>
      <div className="mt-6 bg-white shadow rounded-lg p-6">
        {isLoading && <div className="text-gray-500">Loading rooms...</div>}
        {isError && <div className="text-red-600">Failed to load rooms: {error.message}</div>}
        {!isLoading && !isError && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(data?.data || data || []).map((room) => (
              <div key={room.id} className="rounded-lg border p-4">
                <div className="text-sm text-gray-500">Room</div>
                <div className="text-xl font-semibold text-gray-900">{room.room_number}</div>
                <div className="mt-2 text-gray-600">Type: {room.room_type || room.room_type_id}</div>
                <div className="mt-1 text-gray-600">Floor: {room.floor}</div>
                <div className="mt-1 text-gray-600">Status: {room.status}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Rooms;
