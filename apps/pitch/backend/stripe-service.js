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
   * Initialize Stripe with an explicit secret key (fetched outside env)
   */
  async initialize(secretKey) {
    try {
    // Webhook secret still comes from env (allowed to remain an env var)
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || process.env.INSTRUCTIONS_SANDBOX_SS;

    if (!secretKey) throw new Error('Stripe secret key missing (not retrieved from vault)');
      if (!this.webhookSecret) {
        throw new Error('Stripe webhook secret missing (set STRIPE_WEBHOOK_SECRET)');
      }

      this.stripe = new Stripe(secretKey, {
        apiVersion: '2025-08-27.basil', // Bumped after dashboard upgrade
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
      const minorAmount = Math.round(amount * 100); // amount provided as major units
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: minorAmount,
        currency: currency.toLowerCase(),
        metadata: {
          paymentId,
          ...metadata,
        },
        // Specify exact payment methods for legal services
        payment_method_types: ['card'], // Only cards allowed
        // Alternative: Enable automatic but exclude redirects
        // automatic_payment_methods: {
        //   enabled: true,
        //   allow_redirects: 'never', // Prevents redirect-based methods like Revolut
        // },
      }, { idempotencyKey: paymentId });

      console.log(`✅ Created PaymentIntent: ${paymentIntent.id} for payment: ${paymentId}`);
      
      return {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
  amount: paymentIntent.amount, // minor units
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
   * Get publishable key for frontend (from Key Vault via App Settings)
   * @returns {string} Stripe publishable key
   */
  getPublishableKey() {
  return process.env.STRIPE_PUBLISHABLE_KEY || process.env.INSTRUCTIONS_SANDBOX_PK;
  }
}

// Export singleton instance
const stripeService = new StripeService();
module.exports = stripeService;
