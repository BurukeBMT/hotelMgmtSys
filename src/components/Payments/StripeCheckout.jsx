import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
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
        try {
          // Record the payment in Firestore (with error handling)
          const paymentRef = doc(db, 'payments', paymentIntent.id);
          await setDoc(paymentRef, {
            id: paymentIntent.id,
            bookingId,
            amount: amount,
            currency: currency,
            status: 'completed',
            paymentMethod: 'card',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          // Update booking status to paid (only if bookingId exists)
          if (bookingId) {
            const bookingRef = doc(db, 'bookings', bookingId);
            await updateDoc(bookingRef, {
              paymentStatus: 'paid',
              status: 'confirmed',
              updatedAt: serverTimestamp(),
            });
          }

          onSuccess && onSuccess(paymentIntent);
        } catch (firestoreError) {
          console.warn('Firestore update failed, but payment succeeded:', firestoreError);
          // Still call onSuccess since the payment went through
          onSuccess && onSuccess(paymentIntent);
        }
      } else {
        throw new Error('Payment was not successful');
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
