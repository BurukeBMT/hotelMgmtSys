import axios from 'axios';

// Payment service for handling Stripe payments without Firebase Functions
// This creates a simple payment API that can be hosted on any backend

const API_BASE_URL = process.env.REACT_APP_PAYMENT_API_URL || 'https://payment-api-f7uu.onrender.com/api';

class PaymentService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // Create a payment intent for Stripe
  async createPaymentIntent(amount, currency = 'usd', metadata = {}) {
    try {
      const response = await this.client.post('/payments/create-intent', {
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata,
      });
      return response.data;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  // Confirm a payment intent
  async confirmPaymentIntent(paymentIntentId, paymentMethodId) {
    try {
      const response = await this.client.post('/payments/confirm-intent', {
        paymentIntentId,
        paymentMethodId,
      });
      return response.data;
    } catch (error) {
      console.error('Error confirming payment intent:', error);
      throw error;
    }
  }

  // Get payment status
  async getPaymentStatus(paymentIntentId) {
    try {
      const response = await this.client.get(`/payments/status/${paymentIntentId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting payment status:', error);
      throw error;
    }
  }

  // Process a simple payment (for testing/development)
  async processPayment(amount, currency = 'usd', paymentData = {}) {
    try {
      const response = await this.client.post('/payments/process', {
        amount,
        currency,
        ...paymentData,
      });
      return response.data;
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  }

  // Create a checkout session (alternative to payment intents)
  async createCheckoutSession(items, successUrl, cancelUrl, metadata = {}) {
    try {
      const response = await this.client.post('/payments/create-checkout-session', {
        items,
        successUrl,
        cancelUrl,
        metadata,
      });
      return response.data;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }
}

export const paymentService = new PaymentService();
export default paymentService;
