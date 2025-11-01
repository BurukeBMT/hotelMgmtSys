import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY || '');

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
      // Create payment intent on server
      const res = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency, booking_id: bookingId })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to create payment intent');

      const clientSecret = data.clientSecret;

      const cardElement = elements.getElement(CardElement);
      const confirm = await stripe.confirmCardPayment(clientSecret, { payment_method: { card: cardElement } });

      if (confirm.error) {
        // Card was declined or authentication failed
        setError(confirm.error.message || 'Payment confirmation failed');
        setLoading(false);
        return;
      }

      const pi = confirm.paymentIntent;
      if (!pi) {
        setError('No payment intent returned');
        setLoading(false);
        return;
      }

      if (pi.status === 'requires_action' || pi.status === 'requires_source_action') {
        // Additional action required (3DS). Stripe.js should have handled this, but handle defensively.
        const handled = await stripe.confirmCardPayment(clientSecret);
        if (handled.error) {
          setError(handled.error.message || 'Authentication failed');
          setLoading(false);
          return;
        }
        if (handled.paymentIntent && handled.paymentIntent.status === 'succeeded') {
          onSuccess && onSuccess(handled.paymentIntent);
        }
      } else if (pi.status === 'succeeded') {
        onSuccess && onSuccess(pi);
      } else {
        // other statuses: processing, requires_payment_method, etc.
        setError(`Payment status: ${pi.status}`);
      }

      // As a resilience measure, call server to record payment (webhook should normally do this)
      try {
        await fetch('/api/stripe/record-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentIntentId: pi.id, booking_id: bookingId, amount })
        });
      } catch (e) {
        // non-fatal
        console.warn('Failed to call record-payment', e.message);
      }
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
