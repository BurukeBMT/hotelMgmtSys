import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

const stripePromise = loadStripe('pk_test_51PxexampleStripePublishableKeyHere123456789');

function CheckoutForm({ bookingId, amount, currency = 'USD', onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!stripe || !elements) return;
    setLoading(true);

    try {
      // For client-side only payments, we'll simulate a successful payment
      // In production, you'd want to use Stripe's Payment Links or hosted checkout
      // This is a simplified implementation for demo purposes

      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create a mock payment intent result
      const mockPaymentIntent = {
        id: `pi_mock_${Date.now()}`,
        status: 'succeeded',
        amount: amount * 100, // Convert to cents
        currency: currency.toLowerCase(),
        client_secret: 'mock_secret',
        created: Date.now() / 1000,
      };

      // Record the payment in Firestore
      const paymentRef = doc(db, 'payments', mockPaymentIntent.id);
      await setDoc(paymentRef, {
        id: mockPaymentIntent.id,
        bookingId,
        amount: amount,
        currency: currency,
        status: 'completed',
        paymentMethod: 'card',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update booking status to paid
      const bookingRef = doc(db, 'bookings', bookingId);
      await setDoc(bookingRef, {
        paymentStatus: 'paid',
        updatedAt: serverTimestamp(),
      }, { merge: true });

      onSuccess && onSuccess(mockPaymentIntent);
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Payment failed');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-3 border rounded">
        <CardElement options={{ hidePostalCode: true }} />
      </div>
      {error && <div className="text-red-600">{error}</div>}
      <button type="submit" disabled={!stripe || loading} className="px-4 py-2 bg-blue-600 text-white rounded">
        {loading ? 'Processing...' : `Pay ${currency} ${amount}`}
      </button>
    </form>
  );
}

export default function StripeCheckoutWrapper(props) {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm {...props} />
    </Elements>
  );
}
