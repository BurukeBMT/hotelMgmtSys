const axios = require('axios');
const crypto = require('crypto');

class ChapaService {
  constructor() {
    this.baseURL = process.env.CHAPA_BASE_URL || 'https://api.chapa.co/v1';
    this.secretKey = process.env.CHAPA_SECRET_KEY;
    this.publicKey = process.env.CHAPA_PUBLIC_KEY;
    this.webhookSecret = process.env.CHAPA_WEBHOOK_SECRET;
    this.testMode = process.env.CHAPA_TEST_MODE === 'true';
  }

  /**
   * Initialize a new payment with Chapa
   * @param {Object} paymentData - Payment details
   * @returns {Promise<Object>} - Chapa payment response
   */
  async initializePayment(paymentData) {
    try {
      const {
        amount,
        currency = 'ETB',
        email,
        first_name,
        last_name,
        phone_number,
        tx_ref,
        callback_url,
        return_url,
        booking_id,
        customizations
      } = paymentData;

      const payload = {
        amount,
        currency,
        email,
        first_name,
        last_name,
        phone_number,
        tx_ref,
        callback_url,
        return_url,
        customizations: customizations || {
          title: 'Hotel Payment',
          description: 'Payment for hotel booking',
          logo: 'https://your-hotel-logo.com/logo.png'
        }
      };

      const response = await axios.post(
        `${this.baseURL}/transaction/initialize`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Chapa initialization error:', error.response?.data || error.message);
      throw new Error(`Chapa payment initialization failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Verify a payment transaction
   * @param {string} tx_ref - Transaction reference
   * @returns {Promise<Object>} - Verification response
   */
  async verifyPayment(tx_ref) {
    try {
      const response = await axios.get(
        `${this.baseURL}/transaction/verify/${tx_ref}`,
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Chapa verification error:', error.response?.data || error.message);
      throw new Error(`Chapa payment verification failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get transaction details
   * @param {string} tx_ref - Transaction reference
   * @returns {Promise<Object>} - Transaction details
   */
  async getTransactionDetails(tx_ref) {
    try {
      const response = await axios.get(
        `${this.baseURL}/transaction/${tx_ref}`,
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Chapa transaction details error:', error.response?.data || error.message);
      throw new Error(`Failed to get transaction details: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Verify webhook signature
   * @param {string} signature - Webhook signature from headers
   * @param {Object} payload - Webhook payload
   * @returns {boolean} - Whether signature is valid
   */
  verifyWebhookSignature(signature, payload) {
    if (!this.webhookSecret) {
      console.warn('Webhook secret not configured');
      return true; // Allow in development
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return signature === expectedSignature;
  }

  /**
   * Generate unique transaction reference
   * @param {string} prefix - Prefix for transaction reference
   * @returns {string} - Unique transaction reference
   */
  generateTransactionRef(prefix = 'HOTEL') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Format amount for Chapa (convert to cents)
   * @param {number} amount - Amount in main currency
   * @returns {number} - Amount in cents
   */
  formatAmount(amount) {
    return Math.round(amount * 100);
  }

  /**
   * Parse amount from Chapa (convert from cents)
   * @param {number} amount - Amount in cents
   * @returns {number} - Amount in main currency
   */
  parseAmount(amount) {
    return amount / 100;
  }
}

module.exports = new ChapaService();
