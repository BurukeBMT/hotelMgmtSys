import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import StripeCheckout from '../components/Payments/StripeCheckout';
import { bookingsService, roomsService, authService } from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const Payments = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { bookingId: stateBookingId, amount: stateAmount } = location.state || {};

  const handleSuccess = async (paymentIntent) => {
    console.log('Payment succeeded:', paymentIntent);

    try {
      const bookingId = stateBookingId || paymentIntent?.bookingId;
      if (!bookingId) {
        toast.success('Payment recorded');
        return;
      }

      // If user is not authenticated, create a Firebase Auth user using booking form data
      if (!isAuthenticated) {
        try {
          // Fetch booking to get guest data
          const bookingRes = await bookingsService.getById(bookingId);
          const booking = bookingRes?.data;
          if (booking) {
            // Find guest data from booking
            const guestRes = await bookingsService.getAll({ id: booking.guest_id });
            const guest = guestRes?.data?.find(g => g.id === booking.guest_id);

            if (guest) {
              // Create Firebase Auth user
              await authService.register({
                email: guest.email,
                password: 'TempPass123!', // Temporary password - user should change later
                firstName: guest.first_name,
                lastName: guest.last_name,
                phone: guest.phone,
                address: guest.address,
                role: 'client'
              });
              toast.success('Account created! Please check your email for login details.');
            }
          }
        } catch (authError) {
          console.warn('Could not create user account:', authError.message);
          // Continue with payment processing even if account creation fails
        }
      }

      // Fetch booking to get room id
      let bookingDoc = null;
      try {
        const res = await bookingsService.getById(bookingId);
        bookingDoc = res?.data || null;
      } catch (e) {
        console.warn('Could not fetch booking after payment:', e.message || e);
      }

      // Mark booking as confirmed and paymentStatus paid
      await bookingsService.update(bookingId, { status: 'confirmed', paymentStatus: 'paid' });

      // If booking has a room, mark it as occupied (reduce availability)
      const roomId = bookingDoc?.room_id || bookingDoc?.roomId || bookingDoc?.room_id;
      if (roomId) {
        try {
          await roomsService.update(roomId, { status: 'occupied' });
        } catch (e) {
          console.warn('Failed to update room status:', e.message || e);
        }
      }

      toast.success('Payment successful and booking confirmed');
      // Redirect client to their dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Error post-payment:', err);
      toast.error('Payment recorded but post-processing failed');
    }
  };

  const handleCheckout = async () => {
    // NOTE: Stripe checkout sessions require a backend server for security
    // The secret key cannot be exposed in client-side code.
    // To implement Stripe payments in a Firebase-only app, you have two options:
    // 1. Use Firebase Functions (Cloud Functions) to create checkout sessions
    // 2. Use Stripe Checkout redirect mode with Firebase Functions as webhook handler
    // 
    // Example Firebase Function endpoint would be:
    // https://your-region-your-project.cloudfunctions.net/createCheckoutSession
    toast.error('Payment processing requires Firebase Functions. Please set up a Cloud Function for Stripe integration.');
    console.warn('Stripe integration requires backend - implement via Firebase Functions');
    
    // Uncomment and modify when Firebase Function is set up:
    /*
    try {
      const res = await fetch('https://your-region-your-project.cloudfunctions.net/createCheckoutSession', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 10.00, currency: 'USD', booking_id: 1 })
      });
      const data = await res.json();
      if (data && data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      console.error('Error creating checkout session', e);
    }
    */
  };

  const bookingId = stateBookingId || null;
  const amount = stateAmount || 10.00;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Payments</h1>
      <p className="mt-1 text-sm text-gray-500">Make a payment for a booking</p>
      <div className="mt-6 bg-white shadow rounded-lg p-6">
        <div className="space-y-4">
          <StripeCheckout bookingId={bookingId} amount={amount} currency="USD" onSuccess={handleSuccess} />
          <div className="mt-4">
            <button onClick={handleCheckout} className="px-4 py-2 bg-green-600 text-white rounded">Pay with Stripe Checkout</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payments;
