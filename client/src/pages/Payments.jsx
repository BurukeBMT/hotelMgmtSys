import React from 'react';
import StripeCheckout from '../components/Payments/StripeCheckout';

const Payments = () => {
  const handleSuccess = (paymentIntent) => {
    console.log('Payment succeeded:', paymentIntent);
    // You can call backend to record success or update UI
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Payments</h1>
      <p className="mt-1 text-sm text-gray-500">Make a payment for a booking</p>
      <div className="mt-6 bg-white shadow rounded-lg p-6">
        <StripeCheckout bookingId={1} amount={10.00} currency="USD" onSuccess={handleSuccess} />
      </div>
    </div>
  );
};

export default Payments;
