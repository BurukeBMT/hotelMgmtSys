import React from 'react';
import StripeCheckout from '../components/Payments/StripeCheckout';

const Payments = () => {
  const handleSuccess = (paymentIntent) => {
    console.log('Payment succeeded:', paymentIntent);
    // You can call backend to record success or update UI
  };

  const handleCheckout = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ amount: 10.00, currency: 'USD', booking_id: 1 })
      });
      const data = await res.json();
      if (data && data.url) {
        window.location.href = data.url;
      } else {
        console.error('Failed to create checkout session', data);
      }
    } catch (e) {
      console.error('Error creating checkout session', e);
    }
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
