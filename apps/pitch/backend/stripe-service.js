/**
 * Stripe Service Module
 * 
 * Handles all Stripe-related operations including:
 * - PaymentIntent creation
 * - Webhook signature verification
 * - Payment status management
 */

const Stripe = require('stripe');

class StripeService {
  constructor() {
    this.stripe = null;
    this.webhookSecret = null;
    this.initialized = false;
  }

  /**
   * Initialize Stripe with secret key from environment or Azure Key Vault
   */
  async initialize() {
    try {
      const secretKey = process.env.STRIPE_SECRET_KEY;
      this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!secretKey) {
        throw new Error('STRIPE_SECRET_KEY is required');
      }

      if (!this.webhookSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET is required');
      }

      this.stripe = new Stripe(secretKey, {
        apiVersion: '2024-06-20', // Use latest stable API version
      });

      this.initialized = true;
      console.log('✅ Stripe service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Stripe service:', error.message);
      throw error;
    }
  }

  /**
   * Create a PaymentIntent for a payment
   * @param {Object} params - Payment parameters
   * @param {number} params.amount - Amount in smallest currency unit (e.g., cents)
   * @param {string} params.currency - Currency code (e.g., 'usd', 'gbp')
   * @param {string} params.paymentId - Internal payment ID for tracking
   * @param {Object} params.metadata - Additional metadata
   * @returns {Object} PaymentIntent with client_secret
   */
  async createPaymentIntent({ amount, currency = 'gbp', paymentId, metadata = {} }) {
    if (!this.initialized) {
      throw new Error('Stripe service not initialized');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to smallest currency unit
        currency: currency.toLowerCase(),
        payment_method_types: ['card'],
        metadata: {
          paymentId,
          ...metadata,
        },
        // Enable automatic payment methods for future expansion
        automatic_payment_methods: {
          enabled: true,
        },
      });

      console.log(`✅ Created PaymentIntent: ${paymentIntent.id} for payment: ${paymentId}`);
      
      return {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      };
    } catch (error) {
      console.error('❌ Failed to create PaymentIntent:', error.message);
      throw new Error(`Failed to create payment intent: ${error.message}`);
    }
  }

  /**
   * Retrieve a PaymentIntent by ID
   * @param {string} paymentIntentId - Stripe PaymentIntent ID
   * @returns {Object} PaymentIntent details
   */
  async getPaymentIntent(paymentIntentId) {
    if (!this.initialized) {
      throw new Error('Stripe service not initialized');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata,
        charges: paymentIntent.charges?.data || [],
      };
    } catch (error) {
      console.error('❌ Failed to retrieve PaymentIntent:', error.message);
      throw new Error(`Failed to retrieve payment intent: ${error.message}`);
    }
  }

  /**
   * Verify webhook signature from Stripe
   * @param {string} payload - Raw webhook payload
   * @param {string} signature - Stripe signature header
   * @returns {Object} Verified webhook event
   */
  verifyWebhookSignature(payload, signature) {
    if (!this.initialized) {
      throw new Error('Stripe service not initialized');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      );

      console.log(`✅ Verified webhook event: ${event.type} (${event.id})`);
      return event;
    } catch (error) {
      console.error('❌ Webhook signature verification failed:', error.message);
      throw new Error(`Invalid webhook signature: ${error.message}`);
    }
  }

  /**
   * Map Stripe payment status to internal status
   * @param {string} stripeStatus - Stripe PaymentIntent status
   * @returns {Object} Status mapping
   */
  mapPaymentStatus(stripeStatus) {
    const statusMap = {
      requires_payment_method: { payment_status: 'processing', internal_status: 'pending' },
      requires_confirmation: { payment_status: 'processing', internal_status: 'pending' },
      requires_action: { payment_status: 'requires_action', internal_status: 'pending' },
      processing: { payment_status: 'processing', internal_status: 'pending' },
      requires_capture: { payment_status: 'processing', internal_status: 'pending' },
      canceled: { payment_status: 'failed', internal_status: 'failed' },
      succeeded: { payment_status: 'succeeded', internal_status: 'completed' },
    };

    return statusMap[stripeStatus] || { 
      payment_status: 'failed', 
      internal_status: 'failed' 
    };
  }

  /**
   * Get publishable key for frontend
   * @returns {string} Stripe publishable key
   */
  getPublishableKey() {
    return process.env.STRIPE_PUBLISHABLE_KEY;
  }
}

// Export singleton instance
const stripeService = new StripeService();
module.exports = stripeService;
