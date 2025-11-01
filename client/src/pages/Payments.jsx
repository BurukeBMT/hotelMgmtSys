import React from 'react';
import StripeCheckout from '../components/Payments/StripeCheckout';
import toast from 'react-hot-toast';

const Payments = () => {
  const handleSuccess = (paymentIntent) => {
    console.log('Payment succeeded:', paymentIntent);
    // You can call backend to record success or update UI
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

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Payments</h1>
      <p className="mt-1 text-sm text-gray-500">Make a payment for a booking</p>
      <div className="mt-6 bg-white shadow rounded-lg p-6">
        <div className="space-y-4">
          <StripeCheckout bookingId={1} amount={10.00} currency="USD" onSuccess={handleSuccess} />
          <div className="mt-4">
            <button onClick={handleCheckout} className="px-4 py-2 bg-green-600 text-white rounded">Pay with Stripe Checkout</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payments;
