import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { roomsService, guestsService, bookingsService } from '../services/firebaseService';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const ClientBooking = () => {
  const { roomId } = useParams();
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [rooms, setRooms] = React.useState([]);
  const { isAuthenticated, user } = useAuth();

  const [loading, setLoading] = React.useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    const loadRooms = async () => {
      try {
        const data = await roomsService.getRooms();
        const list = data?.data || data; // normalize
        setRooms(list || []);

        // If roomId is provided in URL, pre-select that room
        // Note: Room selection is handled by defaultValue in the select element
      } catch (e) {
        toast.error('Failed to load rooms');
      }
    };
    loadRooms();
  }, [roomId]);

  const onSubmit = async (values) => {
    try {
      setLoading(true);

      let guestId;

      if (isAuthenticated && user) {
        // If authenticated, use current user as guest or create guest record
        // For simplicity, we'll create a guest record even for authenticated users
        // You could modify this to link to user profile instead
        const guestPayload = await guestsService.createGuest({
          first_name: values.firstName,
          last_name: values.lastName,
          email: values.email,
          phone: values.phone,
          address: values.address || null,
        });
        const guest = guestPayload?.data || guestPayload;
        if (!guest?.id) {
          throw new Error('Could not create guest');
        }
        guestId = guest.id;
      } else {
        // If not authenticated, create guest (this should work now with the auth bypass)
        const guestPayload = await guestsService.createGuest({
          first_name: values.firstName,
          last_name: values.lastName,
          email: values.email,
          phone: values.phone,
          address: values.address || null,
        });
        const guest = guestPayload?.data || guestPayload;
        if (!guest?.id) {
          throw new Error('Could not create guest');
        }
        guestId = guest.id;
      }

      // 2) create booking
      const bookingPayload = await bookingsService.createBooking({
        guest_id: guestId,
        // keep room id as string (Firestore doc id), do not parseInt
        room_id: values.roomId,
        check_in_date: values.checkIn,
        check_out_date: values.checkOut,
        adults: parseInt(values.adults, 10),
        children: parseInt(values.children || '0', 10),
        special_requests: values.requests || null,
      });

      if (bookingPayload?.success === false) {
        throw new Error(bookingPayload?.message || 'Booking failed');
      }

      toast.success('Booking created successfully');

      // redirect to payment page with booking id, amount, and guest data (for account creation if needed)
      const bookingId = bookingPayload?.data?.id || bookingPayload?.id || null;
      const selectedRoom = rooms.find(r => r.id === values.roomId) || {};
      const amount = parseFloat(selectedRoom.price || selectedRoom.base_price || selectedRoom.basePrice || selectedRoom.rate || 10.00);

      if (bookingId) {
        // Pass guest data to Payments page for account creation if user is not authenticated
        navigate('/payments', { 
          state: { 
            bookingId, 
            amount,
            guestData: {
              email: values.email,
              firstName: values.firstName,
              lastName: values.lastName,
              phone: values.phone,
              address: values.address || '',
              // Generate a temporary password (user should change it later)
              password: `Temp${Date.now()}!`
            },
            roomId: values.roomId
          } 
        });
      }
    } catch (e) {
      toast.error(e.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">Book a Room</h1>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">First name</label>
            <input {...register('firstName', { required: 'Required' })} className={`mt-1 block w-full rounded-md border ${errors.firstName ? 'border-red-300' : 'border-gray-300'} px-3 py-2`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Last name</label>
            <input {...register('lastName', { required: 'Required' })} className={`mt-1 block w-full rounded-md border ${errors.lastName ? 'border-red-300' : 'border-gray-300'} px-3 py-2`} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input {...register('email', { required: 'Required' })} className={`mt-1 block w-full rounded-md border ${errors.email ? 'border-red-300' : 'border-gray-300'} px-3 py-2`} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input {...register('phone', { required: 'Required' })} className={`mt-1 block w-full rounded-md border ${errors.phone ? 'border-red-300' : 'border-gray-300'} px-3 py-2`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Address (optional)</label>
            <input {...register('address')} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Room</label>
            <select {...register('roomId', { required: 'Required' })} defaultValue={roomId || ''} className={`mt-1 block w-full rounded-md border ${errors.roomId ? 'border-red-300' : 'border-gray-300'} px-3 py-2`}>
              <option value="">Select room</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Room {r.room_number}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Check-in</label>
            <input type="date" {...register('checkIn', { required: 'Required' })} className={`mt-1 block w-full rounded-md border ${errors.checkIn ? 'border-red-300' : 'border-gray-300'} px-3 py-2`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Check-out</label>
            <input type="date" {...register('checkOut', { required: 'Required' })} className={`mt-1 block w-full rounded-md border ${errors.checkOut ? 'border-red-300' : 'border-gray-300'} px-3 py-2`} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Adults</label>
            <input type="number" min="1" defaultValue={1} {...register('adults', { required: 'Required', min: 1 })} className={`mt-1 block w-full rounded-md border ${errors.adults ? 'border-red-300' : 'border-gray-300'} px-3 py-2`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Children</label>
            <input type="number" min="0" defaultValue={0} {...register('children', { min: 0 })} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Requests (optional)</label>
            <input {...register('requests')} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
          </div>
        </div>

        <button type="submit" disabled={loading} className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50">{loading ? 'Booking...' : 'Create booking'}</button>
      </form>
    </div>
  );
};

export default ClientBooking;


