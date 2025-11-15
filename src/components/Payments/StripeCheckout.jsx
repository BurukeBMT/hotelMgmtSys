import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { paymentService } from '../../services/paymentService';

const stripePromise = loadStripe('pk_test_51SOGGbQKEpTq8ihWbeAVv4wMbODXZh9I7euPQlJ923gN5MPlyvbuQB4j8QsysHZZgRt9v8lT5cBJwFKwpoKNJjXz00xdPmpw0X');

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
      // Create payment intent using our payment service
      const paymentIntentData = await paymentService.createPaymentIntent(amount, currency.toLowerCase(), {
        bookingId,
      });

      const clientSecret = paymentIntentData.client_secret;

      // Confirm the payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        },
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (paymentIntent.status === 'succeeded') {
        console.log('✅ Stripe payment succeeded, calling onSuccess handler...');
        // Payment succeeded - let the onSuccess handler in Payments.jsx
        // handle all Firestore updates after ensuring authentication
        // This avoids permission errors from trying to update Firestore
        // before the user is authenticated
        onSuccess && onSuccess(paymentIntent);
      } else {
        throw new Error('Payment was not successful');
      }

      setLoading(false);
    } catch (err) {
      const backendMsg = err?.response?.data?.error || err?.response?.data?.message;
      setError(backendMsg || err?.message || 'Payment failed');
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
