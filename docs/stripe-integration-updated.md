# Stripe Payment Integration - Updated Implementation

This document describes the current complete Stripe payment integration with comprehensive email notifications and receipt handling.

## Architecture Overview

### Core Components

1. **Secret Key Management**: Stripe keys stored securely in Azure Key Vault
2. **Client Secret Generation**: Per-payment `client_secret` created for each PaymentIntent
3. **PaymentIntent Lifecycle**: Central object managing payment state with full webhook integration
4. **Stripe Elements**: Secure UI components for payment collection
5. **Webhook Processing**: Authoritative payment status updates with email notifications
6. **Receipt URL Integration**: Automatic extraction of Stripe receipt URLs for client emails
7. **Email System**: Comprehensive notifications for all payment outcomes
8. **Debug Monitoring**: Automatic detection and notification of stuck clients

### Enhanced Request Flow

```
1. UI → Server: POST /api/payments/create-payment-intent
2. Server → Stripe: Create PaymentIntent with secret key
3. Stripe → Server → UI: Return client_secret
4. UI → Stripe: stripe.confirmPayment({ elements, clientSecret })
5. Stripe → UI: Immediate feedback (succeeded/failed/requires_action)
6. Stripe → Server: Webhook with authoritative status
7. Server → Stripe: Retrieve charge object for receipt URL
8. Server → DB: Update payment_status and internal_status
9. Server → Email System: Trigger notifications based on outcome
10. Email System → Recipients: Send professional emails with receipt links
11. Server → Debug System: Monitor for stuck clients and send alerts
12. UI: Poll GET /api/payments/status/:id for final state
```

## Email Integration Features

### Payment Success Flow
1. **Webhook receives** `payment_intent.succeeded`
2. **Receipt URL extracted** from latest charge object
3. **Client success email** sent with real Stripe receipt URL
4. **Fee earner diagnostic** email sent with complete system state
5. **Database updated** with payment completion

### Payment Failure Flow
1. **Webhook receives** `payment_intent.payment_failed`
2. **Client failure email** sent with next steps
3. **Admin notification** sent to internal team
4. **Debug stuck client** email triggered if client appears stuck
5. **Database updated** with failure status

### Receipt URL Implementation
```javascript
// Extract receipt URL from successful payment
let receiptUrl = null;
if (paymentIntent.latest_charge) {
  const charge = await stripeService.stripe.charges.retrieve(paymentIntent.latest_charge);
  receiptUrl = charge.receipt_url;
  console.log(`📧 Retrieved receipt URL: ${receiptUrl ? 'Present' : 'Not available'}`);
}

// Include in email record
const emailRecord = {
  ...instruction,
  ReceiptUrl: receiptUrl // Real Stripe receipt URL
};
```

## Environment Configuration

### Required Environment Variables
```bash
# Stripe Configuration (from Azure Key Vault)
STRIPE_SECRET_KEY=sk_live_... or sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_... or pk_test_...

# Email Configuration
GRAPH_CLIENT_ID=... (from Key Vault)
GRAPH_CLIENT_SECRET=... (from Key Vault)
TENANT_ID=...

# Development Settings
EMAIL_LOG_ONLY=1          # Log emails without sending
EMAIL_FORCE_SEND=1        # Force sending even in log-only mode
DISABLE_PAYMENTS=false    # Enable payment processing
```

### Key Vault Secrets
- `stripe-restricted-payments-key` - Stripe secret key
- `graph-client-id` - Microsoft Graph application ID
- `graph-client-secret` - Microsoft Graph application secret

## Webhook Implementation

### Supported Events
```javascript
switch (event.type) {
  case 'payment_intent.succeeded':
    // Extract receipt URL and send success emails
    break;
  case 'payment_intent.payment_failed':
    // Send failure notifications and debug alerts
    break;
  case 'payment_intent.requires_action':
    // Handle 3D Secure requirements
    break;
  case 'payment_intent.processing':
    // Update status to processing
    break;
  case 'payment_intent.canceled':
    // Handle cancellation
    break;
}
```

### Webhook Security
- **Signature verification** using Stripe webhook secret
- **Idempotency protection** to prevent duplicate processing
- **Comprehensive error handling** with detailed logging

## Status Model

### Payment Status Mapping
- **payment_status**: `processing` | `succeeded` | `failed` | `requires_action`
- **internal_status**: `pending` | `completed` | `failed`

### Email Triggers by Status
- `succeeded + completed` → Client success email with receipt + fee earner diagnostic
- `succeeded + failed` → Payment received but processing failed, admin notified
- `failed + failed` → Client failure email + admin alert + debug monitoring
- `requires_action + pending` → 3D Secure flow, monitor for completion

## Debug and Monitoring

### Stuck Client Detection
```javascript
// Automatic detection at completion endpoint
if (clientAppearsStuck) {
  await sendDebugStuckClientEmail(record, 'Client stuck at completion');
}

// Payment failure monitoring
if (paymentFailed) {
  await sendDebugStuckClientEmail(record, 'Payment failure detected');
}
```

### Debug Email Format
- **Brief technical alerts** for development team
- **HLX-PASSCODE reference** for easy identification
- **Client contact information** and system status
- **Timestamp and stage** information for debugging

## Testing

### Development Testing
```bash
cd apps/pitch/backend

# Test all email templates
node test-emails.js

# Test debug notification system
node test-debug-emails.js

# Test with specific scenarios
EMAIL_LOG_ONLY=1 node test-emails.js  # Log only mode
```

### Stripe Test Cards
```javascript
// Success
4242424242424242

// Decline
4000000000000002

// 3D Secure Required
4000002500003155
```

## Production Deployment

### Pre-deployment Checklist
1. ✅ Update webhook endpoint in Stripe Dashboard
2. ✅ Configure production Stripe keys in Key Vault
3. ✅ Test webhook signature verification
4. ✅ Update email routing for production recipients
5. ✅ Verify Microsoft Graph permissions
6. ✅ Test receipt URL extraction with live payments

### Monitoring
- **Webhook delivery status** in Stripe Dashboard
- **Email delivery logs** in application logs
- **Payment completion rates** and failure analysis
- **Debug alert frequency** for system health

## Advanced Features

### Receipt URL Benefits
- **Official Stripe receipts** for client records
- **PDF download capability** directly from Stripe
- **Audit trail** for payment verification
- **Professional appearance** for client communications

### Email System Benefits
- **Litigation-grade templates** suitable for legal practice
- **Comprehensive diagnostics** for technical troubleshooting
- **Proactive monitoring** with stuck client detection
- **Consistent branding** with professional typography
