# Stripe Payment Integration

This implementation provides a complete Stripe payment integration for the React + Express application, following the architecture you specified.

## Architecture Overview

### Core Components

1. **Secret Key Management**: `STRIPE_SECRET_KEY` stored securely in environment/Azure Key Vault
2. **Client Secret Generation**: Per-payment `client_secret` created for each PaymentIntent
3. **PaymentIntent Lifecycle**: Central object managing payment state
4. **Stripe Elements**: Secure UI components for payment collection
5. **Webhook Processing**: Authoritative payment status updates

### Request Flow

```
1. UI → Server: POST /api/payments/create-payment-intent
2. Server → Stripe: Create PaymentIntent with secret key
3. Stripe → Server → UI: Return client_secret
4. UI → Stripe: stripe.confirmPayment({ elements, clientSecret })
5. Stripe → UI: Immediate feedback (succeeded/failed/requires_action)
6. Stripe → Server: Webhook with authoritative status
7. Server → DB: Update payment_status and internal_status
8. UI: Poll GET /api/payments/status/:id for final state
```

### Status Model

- **payment_status**: `processing` | `succeeded` | `failed` | `requires_action`
- **internal_status**: `pending` | `completed` | `failed`

**Examples**:
- `succeeded + completed` → Payment successful and processed
- `succeeded + failed` → Payment received but internal processing failed
- `failed + failed` → Payment failed
- `requires_action + pending` → 3D Secure authentication required

## Backend Implementation

### Dependencies Added
```json
{
  "stripe": "^16.12.0"
}
```

### Environment Variables
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Core Files

#### 1. `stripe-service.js`
- Stripe SDK wrapper
- PaymentIntent creation and management
- Webhook signature verification
- Status mapping utilities

#### 2. `payment-database.js`
- Payment record CRUD operations
- Status tracking with webhook events
- SQL Server integration

#### 3. `payment-routes.js`
- REST API endpoints for payment operations
- Webhook handler with signature verification
- Error handling and validation

### API Endpoints

#### `POST /api/payments/create-payment-intent`
Creates a new PaymentIntent and returns client_secret.

**Request:**
```json
{
  "amount": 500.00,
  "currency": "gbp",
  "instructionRef": "HLX-123-456",
  "metadata": {
    "clientName": "John Doe",
    "matterType": "Conveyancing"
  }
}
```

**Response:**
```json
{
  "paymentId": "abc123",
  "clientSecret": "pi_xxx_secret_xxx",
  "amount": 50000,
  "currency": "gbp"
}
```

#### `GET /api/payments/status/:id`
Returns current payment status (source of truth).

**Response:**
```json
{
  "paymentId": "abc123",
  "paymentStatus": "succeeded",
  "internalStatus": "completed",
  "amount": 500.00,
  "currency": "gbp",
  "instructionRef": "HLX-123-456",
  "createdAt": "2025-01-01T12:00:00Z",
  "updatedAt": "2025-01-01T12:01:30Z",
  "webhookEvents": [
    {
      "id": "evt_123",
      "type": "payment_intent.succeeded",
      "created": 1704110490,
      "timestamp": "2025-01-01T12:01:30Z"
    }
  ]
}
```

#### `POST /api/webhook/stripe`
Handles Stripe webhook events with signature verification.

**Headers:** `stripe-signature: t=xxx,v1=xxx`
**Body:** Raw JSON webhook payload

### Database Schema

```sql
CREATE TABLE payments (
  id NVARCHAR(50) PRIMARY KEY,
  payment_intent_id NVARCHAR(100) UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  currency NVARCHAR(3) NOT NULL DEFAULT 'GBP',
  payment_status NVARCHAR(20) NOT NULL DEFAULT 'processing',
  internal_status NVARCHAR(20) NOT NULL DEFAULT 'pending',
  client_secret NVARCHAR(255),
  metadata NVARCHAR(MAX),
  instruction_ref NVARCHAR(50),
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE(),
  webhook_events NVARCHAR(MAX) DEFAULT '[]'
);
```

## Frontend Implementation

### Dependencies Added
```json
{
  "@stripe/react-stripe-js": "^2.8.0",
  "@stripe/stripe-js": "^4.6.0"
}
```

### Core Components

#### 1. `StripeContext.tsx`
- Stripe configuration provider
- Loads publishable key from backend
- Wraps app with Stripe Elements

#### 2. `PaymentForm.tsx`
- Complete payment form with Stripe Elements
- Handles payment confirmation and 3D Secure
- Real-time status updates with polling

#### 3. `PaymentStatus.tsx`
- Payment status display with auto-refresh
- Webhook event history
- Status-based styling

#### 4. `paymentService.ts`
- API client for payment operations
- Status polling utility
- Amount formatting and status mapping

### Usage Example

```tsx
import { PaymentForm } from './components/PaymentForm';
import { StripeProvider } from './context/StripeContext';

function App() {
  return (
    <StripeProvider>
      <PaymentForm
        amount={500}
        currency="gbp"
        instructionRef="HLX-123-456"
        onSuccess={(payment) => console.log('Payment completed:', payment)}
        onError={(error) => console.error('Payment failed:', error)}
      />
    </StripeProvider>
  );
}
```

## Security Features

### 1. Webhook Signature Verification
```javascript
const event = stripeService.verifyWebhookSignature(payload, signature);
```

### 2. Secret Key Protection
- Server-only access to `STRIPE_SECRET_KEY`
- Client receives scoped `client_secret` per payment

### 3. Payment Scoping
- Each `client_secret` is tied to specific PaymentIntent
- Metadata includes instruction reference for tracking

### 4. Database as Source of Truth
- UI polls database status, not Stripe directly
- Webhook updates ensure eventual consistency

## Error Handling

### 1. Payment Failures
- Stripe validation errors
- Card declined scenarios
- Network connectivity issues

### 2. Webhook Retries
- Stripe retries failed webhooks up to 3 days
- Must return 200 OK to acknowledge receipt
- Idempotent processing for duplicate events

### 3. Status Reconciliation
- Database status takes precedence
- Webhook events logged for audit trail
- Manual reconciliation tools available

## Testing

### Backend Test
```bash
node test-stripe-integration.js
```

Tests:
- Service initialization
- PaymentIntent creation
- Database operations
- Status updates
- Webhook processing

### Frontend Test
- Manual testing with Stripe test cards
- `4242424242424242` - Successful payment
- `4000000000000002` - Card declined
- `4000000000003220` - 3D Secure required

## Deployment Checklist

### 1. Environment Setup
- [ ] `STRIPE_SECRET_KEY` configured
- [ ] `STRIPE_WEBHOOK_SECRET` configured  
- [ ] `STRIPE_PUBLISHABLE_KEY` configured
- [ ] Database connection working

### 2. Webhook Configuration
- [ ] Webhook endpoint deployed: `/api/webhook/stripe`
- [ ] Webhook URL configured in Stripe Dashboard
- [ ] Webhook events enabled: `payment_intent.*`
- [ ] Webhook signature verified

### 3. Testing
- [ ] Test payment flow end-to-end
- [ ] Verify webhook delivery
- [ ] Check database updates
- [ ] Test error scenarios

### 4. Monitoring
- [ ] Payment success/failure metrics
- [ ] Webhook delivery monitoring
- [ ] Database performance monitoring
- [ ] Error logging and alerts

## Troubleshooting

### Common Issues

1. **Webhook Not Receiving Events**
   - Check webhook URL is publicly accessible
   - Verify webhook signing secret
   - Check Stripe Dashboard delivery logs

2. **Payment Status Stuck**
   - Check webhook delivery
   - Verify database updates
   - Manual status reconciliation

3. **3D Secure Not Working**
   - Ensure `redirect: 'if_required'` in confirmPayment
   - Handle `requires_action` status appropriately

4. **Test Cards Not Working**
   - Use Stripe test environment
   - Check publishable key starts with `pk_test_`
   - Verify test mode configuration

### Debug Commands

```bash
# Check webhook deliveries
curl -X GET https://api.stripe.com/v1/webhook_endpoints \
  -u sk_test_...

# Check PaymentIntent status
curl -X GET https://api.stripe.com/v1/payment_intents/pi_... \
  -u sk_test_...

# Test webhook endpoint
curl -X POST http://localhost:3000/api/webhook/stripe \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test" \
  -d '{"type":"test"}'
```

## Production Considerations

### 1. Rate Limiting
- Implement rate limiting on payment endpoints
- Monitor for suspicious activity

### 2. Logging
- Log all payment operations (excluding sensitive data)
- Webhook event correlation
- Performance metrics

### 3. Backup & Recovery
- Regular database backups
- Payment reconciliation procedures
- Disaster recovery testing

### 4. Compliance
- PCI DSS compliance (Stripe handles card data)
- Data retention policies
- Audit trail maintenance

---

This implementation provides a production-ready Stripe integration that follows security best practices and handles all the edge cases you outlined in your architecture specification.
