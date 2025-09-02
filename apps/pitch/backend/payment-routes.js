/**
 * Payment Routes
 * 
 * Handles all payment-related API endpoints:
 * - POST /api/payments/create-payment-intent
 * - POST /api/webhook/stripe  
 * - GET /api/payments/status/:id
 * - GET /api/payments/config
 */

const express = require('express');
const stripeService = require('./stripe-service');
const paymentDatabase = require('./payment-database');

const router = express.Router();

// Dynamic import for nanoid (ESM module)
let nanoid;
(async () => {
  const nanoidModule = await import('nanoid');
  nanoid = nanoidModule.nanoid;
})();

// If server provides req.rawBody we can rely on that; fallback to raw parser otherwise.
const rawBodyMiddleware = (req, res, next) => {
  if (req.rawBody) return next();
  express.raw({ type: 'application/json' })(req, res, next);
};

/**
 * GET /api/payments/config
 * Returns Stripe configuration for frontend
 */
router.get('/config', async (req, res) => {
  try {
    // Check if Stripe service is initialized
    if (!stripeService.initialized) {
      console.log('⚠️ Stripe service not yet initialized, returning 503');
      return res.status(503).json({
        error: 'Payment system still initializing',
        retryAfter: 3
      });
    }

    const publishableKey = stripeService.getPublishableKey();
    
    console.log('🔍 Config endpoint called:');
    console.log('  - STRIPE_PUBLISHABLE_KEY:', process.env.STRIPE_PUBLISHABLE_KEY ? 'SET' : 'NOT SET');
    console.log('  - INSTRUCTIONS_SANDBOX_PK:', process.env.INSTRUCTIONS_SANDBOX_PK ? 'SET' : 'NOT SET');
    console.log('  - publishableKey result:', publishableKey ? 'VALID' : 'EMPTY');
    console.log('  - publishableKey length:', publishableKey ? publishableKey.length : 0);
    
    if (!publishableKey) {
      console.error('❌ No publishable key available!');
      return res.status(500).json({
        error: 'Stripe configuration not available'
      });
    }

    console.log('✅ Returning Stripe config successfully');
    res.json({
      publishableKey,
      currency: 'gbp' // Default currency
    });
  } catch (error) {
    console.error('❌ Failed to get Stripe config:', error);
    res.status(500).json({
      error: 'Failed to get payment configuration'
    });
  }
});

/**
 * POST /api/payments/create-payment-intent
 * Creates a new PaymentIntent and returns client_secret
 * Incoming amount is assumed in MAJOR units (e.g. pounds). We convert to minor for Stripe
 * and store major in DB for now (future: store minor only + computed view).
 */
router.post('/create-payment-intent', async (req, res) => {
  try {
    const {
      amount,
      currency = 'gbp',
      instructionRef,
      metadata = {}
    } = req.body;

    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: 'Valid amount is required'
      });
    }

    if (!instructionRef) {
      return res.status(400).json({
        error: 'Instruction reference is required'
      });
    }

    // Ensure nanoid fn
    if (!nanoid) {
      const nanoidModule = await import('nanoid');
      nanoid = nanoidModule.nanoid;
    }

    // Reuse existing processing payment for same instruction & amount to avoid duplicates
    try {
      const existing = await paymentDatabase.getPaymentsByInstruction(instructionRef);
      const candidate = existing.find(p => p.amount === amount && p.payment_status === 'processing');
      if (candidate && candidate.client_secret) {
        console.log(`♻️ Reusing existing in-flight payment ${candidate.id} for ${instructionRef}`);
        return res.json({
          paymentId: candidate.id,
          clientSecret: candidate.client_secret,
          amount: candidate.amount,
          currency: candidate.currency
        });
      }
    } catch (e) {
      console.warn('Reuse check failed (continuing):', e.message);
    }

    const paymentId = nanoid();

    // Create PaymentIntent with Stripe (convert major -> minor inside stripeService)
    const paymentIntent = await stripeService.createPaymentIntent({
      amount, // major units
      currency,
      paymentId,
      metadata: {
        instructionRef,
        paymentId,
        ...metadata
      }
    });

    // Store payment in database
  const payment = await paymentDatabase.createPayment({
      id: paymentId,
      paymentIntentId: paymentIntent.paymentIntentId,
      amount, // major units persisted (legacy)
      amountMinor: paymentIntent.amount, // minor units canonical
      currency,
      clientSecret: paymentIntent.clientSecret,
      metadata: {
        instructionRef,
        ...metadata
      },
      instructionRef
    });

    console.log(`✅ Created payment: ${paymentId} for instruction: ${instructionRef}`);

    // paymentIntent.amount is in minor units from Stripe; convert back to major for UI
    res.json({
      paymentId,
      clientSecret: paymentIntent.clientSecret,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency
    });

  } catch (error) {
    console.error('❌ Failed to create payment intent:', error);
    res.status(500).json({
      error: 'Failed to create payment intent',
      details: error.message
    });
  }
});

/**
 * GET /api/payments/status/:id
 * Returns current payment status
 */
router.get('/status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get payment from database (source of truth)
    const payment = await paymentDatabase.getPaymentById(id);
    
    if (!payment) {
      return res.status(404).json({
        error: 'Payment not found'
      });
    }

    // Return payment status
    res.json({
      paymentId: payment.id,
      paymentStatus: payment.payment_status,
      internalStatus: payment.internal_status,
      amount: payment.amount,
      amountMinor: payment.amount_minor || Math.round(payment.amount * 100),
      currency: payment.currency,
      instructionRef: payment.instruction_ref,
      createdAt: payment.created_at,
      updatedAt: payment.updated_at,
      webhookEvents: payment.webhook_events || []
    });

  } catch (error) {
    console.error('❌ Failed to get payment status:', error);
    res.status(500).json({
      error: 'Failed to get payment status',
      details: error.message
    });
  }
});

/**
 * GET /api/payments/instruction/:ref
 * Returns all payments for an instruction
 */
router.get('/instruction/:ref', async (req, res) => {
  try {
    const { ref } = req.params;
    
    const payments = await paymentDatabase.getPaymentsByInstruction(ref);
    
    res.json({
      instructionRef: ref,
      payments: payments.map(payment => ({
        paymentId: payment.id,
        paymentStatus: payment.payment_status,
        internalStatus: payment.internal_status,
        amount: payment.amount,
  amountMinor: payment.amount_minor || Math.round(payment.amount * 100),
        currency: payment.currency,
        createdAt: payment.created_at,
        updatedAt: payment.updated_at
      }))
    });

  } catch (error) {
    console.error('❌ Failed to get instruction payments:', error);
    res.status(500).json({
      error: 'Failed to get instruction payments',
      details: error.message
    });
  }
});

/**
 * POST /webhook/stripe
 * Handles Stripe webhook events
 */
// Primary webhook endpoint
router.post('/webhook/stripe', rawBodyMiddleware, async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    
    if (!signature) {
      console.error('❌ Missing Stripe signature header');
      return res.status(400).json({
        error: 'Missing Stripe signature'
      });
    }

    // Prefer raw body (Buffer) for signature verification
    const payload = req.rawBody || req.body;
    console.log(`🔍 Webhook payload type: ${typeof payload}, isBuffer: ${Buffer.isBuffer(payload)}, size: ${payload?.length || 'unknown'}`);
    
    if (!payload) {
      console.error('❌ No webhook payload received');
      return res.status(400).json({
        error: 'No payload received'
      });
    }

    const event = stripeService.verifyWebhookSignature(payload, signature);
    
    console.log(`📧 Received webhook: ${event.type} (${event.id})`);

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
      case 'payment_intent.payment_failed':
      case 'payment_intent.requires_action':
      case 'payment_intent.processing':
      case 'payment_intent.canceled':
      case 'payment_intent.created':
        await handlePaymentIntentEvent(event);
        break;
        
      default:
        console.log(`⚠️  Unhandled webhook event type: ${event.type}`);
    }

    // Always return 200 to acknowledge receipt
    res.json({ received: true });

  } catch (error) {
    console.error('❌ Webhook handling failed:', error);
    console.error('Error stack:', error.stack);
    // Return 400 to trigger Stripe retry
    res.status(400).json({
      error: 'Webhook handling failed',
      details: error.message
    });
  }
});

// Alias path to match potential dashboard configuration (/api/stripe/webhook)
router.post('/stripe/webhook', rawBodyMiddleware, async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    if (!signature) return res.status(400).json({ error: 'Missing Stripe signature' });
    
    const payload = req.rawBody || req.body;
    console.log(`🔍 (Alias) Webhook payload type: ${typeof payload}, isBuffer: ${Buffer.isBuffer(payload)}, size: ${payload?.length || 'unknown'}`);
    
    const event = stripeService.verifyWebhookSignature(payload, signature);
    console.log(`📧 (Alias) Received webhook: ${event.type} (${event.id})`);
    
    switch (event.type) {
      case 'payment_intent.succeeded':
      case 'payment_intent.payment_failed':
      case 'payment_intent.requires_action':
      case 'payment_intent.processing':
      case 'payment_intent.canceled':
      case 'payment_intent.created':
        await handlePaymentIntentEvent(event);
        break;
      default:
        console.log(`⚠️  (Alias) Unhandled webhook event type: ${event.type}`);
    }
    res.json({ received: true, alias: true });
  } catch (error) {
    console.error('❌ Alias webhook handling failed:', error);
    console.error('Error stack:', error.stack);
    res.status(400).json({ error: 'Webhook handling failed', details: error.message });
  }
});

/**
 * Handle PaymentIntent webhook events
 * @param {Object} event - Stripe webhook event
 */
async function handlePaymentIntentEvent(event) {
  const paymentIntent = event.data.object;
  const paymentIntentId = paymentIntent.id;
  
  try {
    // Get payment from database
    const payment = await paymentDatabase.getPaymentByIntentId(paymentIntentId);
    
    if (!payment) {
      console.error(`❌ Payment not found for PaymentIntent: ${paymentIntentId}`);
      return;
    }

    // Map Stripe status to internal status
    const statusMapping = stripeService.mapPaymentStatus(paymentIntent.status);
    
    // Handle specific event types
    switch (event.type) {
      case 'payment_intent.created':
        // Payment intent created - just log it, no status change needed
        console.log(`💡 PaymentIntent created: ${paymentIntentId}, status: ${paymentIntent.status}`);
        break;
        
      case 'payment_intent.succeeded':
        // Payment succeeded - mark as completed
        statusMapping.internal_status = 'completed';
        break;
        
      case 'payment_intent.payment_failed':
        // Payment failed - mark as failed
        statusMapping.internal_status = 'failed';
        break;
        
      case 'payment_intent.requires_action':
        // Requires user action (e.g., 3D Secure)
        statusMapping.internal_status = 'pending';
        break;
    }

    // Update payment status in database
    await paymentDatabase.updatePaymentStatus(
      paymentIntentId,
      statusMapping,
      event
    );

    console.log(`✅ Updated payment ${payment.id}: ${statusMapping.payment_status}/${statusMapping.internal_status}`);

    // Additional business logic can be added here
    // e.g., send confirmation emails, update instruction status, etc.
    if (statusMapping.payment_status === 'succeeded' && statusMapping.internal_status === 'completed') {
      await handleSuccessfulPayment(payment, paymentIntent);
    }

  } catch (error) {
    console.error(`❌ Failed to handle PaymentIntent event ${event.type}:`, error);
    throw error;
  }
}

/**
 * Handle successful payment completion
 * @param {Object} payment - Payment record
 * @param {Object} paymentIntent - Stripe PaymentIntent
 */
async function handleSuccessfulPayment(payment, paymentIntent) {
  try {
    console.log(`🎉 Payment completed successfully: ${payment.id}`);
    
    // Add your business logic here:
    // - Send confirmation email
    // - Update instruction status
    // - Trigger fulfillment process
    // - Generate receipts
    // etc.
    
  } catch (error) {
    console.error('❌ Failed to handle successful payment:', error);
    // Don't throw here - webhook should still be acknowledged
  }
}

/**
 * POST /admin/payment-failure-notification
 * Send admin notification for payment failures
 */
router.post('/admin/payment-failure-notification', async (req, res) => {
  try {
    const { instructionRef, errorCode, errorMessage, clientEmail, amount, timestamp } = req.body;
    
    if (!instructionRef) {
      return res.status(400).json({
        error: 'Instruction reference is required'
      });
    }

    console.log(`📧 Sending admin notification for payment failure: ${instructionRef}`);

    // Import email functionality
    const { sendMail } = require('./email');
    
    // Prepare admin notification email
    const adminEmails = ['lz@helix-law.com'];
    const subject = `Payment Failure Alert - ${instructionRef}`;
    
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Payment Failure Alert</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #dc2626; margin-top: 0;">Payment Processing Failed</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #f3f4f6;">
              <td style="padding: 12px; border: 1px solid #d1d5db; font-weight: bold; width: 30%;">Instruction Reference</td>
              <td style="padding: 12px; border: 1px solid #d1d5db;">${instructionRef}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #d1d5db; font-weight: bold;">Error Code</td>
              <td style="padding: 12px; border: 1px solid #d1d5db;">${errorCode || 'Unknown'}</td>
            </tr>
            <tr style="background: #f3f4f6;">
              <td style="padding: 12px; border: 1px solid #d1d5db; font-weight: bold;">Error Message</td>
              <td style="padding: 12px; border: 1px solid #d1d5db;">${errorMessage || 'Payment processing failed'}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #d1d5db; font-weight: bold;">Amount</td>
              <td style="padding: 12px; border: 1px solid #d1d5db;">£${amount || 'Unknown'}</td>
            </tr>
            <tr style="background: #f3f4f6;">
              <td style="padding: 12px; border: 1px solid #d1d5db; font-weight: bold;">Client Email</td>
              <td style="padding: 12px; border: 1px solid #d1d5db;">${clientEmail || 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #d1d5db; font-weight: bold;">Timestamp</td>
              <td style="padding: 12px; border: 1px solid #d1d5db;">${new Date(timestamp).toLocaleString('en-GB')}</td>
            </tr>
          </table>
          
          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <h3 style="color: #92400e; margin-top: 0;">Action Required</h3>
            <ul style="color: #92400e; margin-bottom: 0;">
              <li>Contact the client to arrange alternative payment</li>
              <li>Review payment gateway logs for technical issues</li>
              <li>Verify client identity and documents are still valid</li>
              <li>Consider manual payment processing if appropriate</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://admin.helix-law.com/instructions/${instructionRef}" 
               style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Instruction Details
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            This is an automated alert from the Helix Law payment system. 
            Please respond promptly to ensure client satisfaction.
          </p>
        </div>
      </div>
    `;

    // Send notification to admin team
    for (const adminEmail of adminEmails) {
      try {
        await sendMail(adminEmail, subject, emailBody);
        console.log(`✅ Admin notification sent to ${adminEmail}`);
      } catch (emailError) {
        console.error(`❌ Failed to send notification to ${adminEmail}:`, emailError);
      }
    }

    // Also trigger the existing client failure email
    if (clientEmail) {
      try {
        const { sendClientFailureEmail } = require('./email');
        await sendClientFailureEmail({
          InstructionRef: instructionRef,
          Email: clientEmail,
          PaymentAmount: amount,
          PaymentProduct: 'Legal Services',
          PaymentResult: 'failed'
        });
        console.log(`✅ Client failure notification sent to ${clientEmail}`);
      } catch (clientEmailError) {
        console.error(`❌ Failed to send client notification:`, clientEmailError);
      }
    }

    res.json({ 
      success: true, 
      message: 'Admin notifications sent successfully',
      notifiedEmails: adminEmails 
    });

  } catch (error) {
    console.error('❌ Failed to send admin notification:', error);
    res.status(500).json({
      error: 'Failed to send admin notification',
      details: error.message
    });
  }
});

/**
 * POST /email/bank-details
 * Email bank transfer details to client upon request
 */
router.post('/email/bank-details', async (req, res) => {
  try {
    const { email, instructionRef, amount } = req.body || {};
    if (!email || !instructionRef) {
      return res.status(400).json({ error: 'email and instructionRef required' });
    }
    console.log(`[bank-details] Incoming request for instructionRef=${instructionRef} to ${email} (amount=${amount ?? 'n/a'}) bodyKeys=${Object.keys(req.body||{}).join(',')}`);
    // Basic email sanity
    const emailOk = /.+@.+\..+/.test(email);
    if (!emailOk) {
      return res.status(400).json({ error: 'invalid email format' });
    }
    const { sendBankDetailsEmail } = require('./email');
    try {
      await sendBankDetailsEmail({ Email: email, InstructionRef: instructionRef, Amount: amount });
      return res.json({ success: true });
    } catch (innerErr) {
      console.error('[bank-details] sendBankDetailsEmail failed:', innerErr);
      // In non-production environments, don't block flow; surface degraded warning
      if (process.env.NODE_ENV !== 'production') {
        return res.status(200).json({ success: false, warning: 'email not dispatched (dev fallback)', detail: innerErr.message });
      }
      throw innerErr; // escalate to outer catch for prod
    }
  } catch (err) {
    console.error('Failed to send bank details email:', err);
    res.status(500).json({ error: 'Failed to send bank details email', detail: err.message });
  }
});

module.exports = router;
