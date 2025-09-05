# Payment Architecture Update - API Changes

## Overview

The payment architecture has been updated to separate Instructions and Payments data. Instructions now contain only client business data, while payment data is handled by a separate Payments table and API endpoints.

## New Payment Endpoints

### GET /api/payments/instruction/:ref
Get payment data for a specific instruction reference.

**Response:**
```json
{
  "PaymentIntentId": "pi_1234567890",
  "Amount": 750.00,
  "Currency": "gbp",
  "Status": "succeeded",
  "Method": "card",
  "ReceiptUrl": "https://pay.stripe.com/receipts/...",
  "CreatedAt": "2025-09-04T20:00:00Z",
  "UpdatedAt": "2025-09-04T20:05:00Z"
}
```

### GET /api/payments/status/:id
Get payment status by payment intent ID.

### POST /api/payments/create-payment-intent
Create a new payment intent (existing endpoint, unchanged).

## Updated Email Templates

Email templates now fetch payment data using the `paymentService.js` helper:

```javascript
const { getPaymentByInstructionRef, formatPaymentAmount } = require('./paymentService');

// In email template function
const payment = await getPaymentByInstructionRef(instructionRef);
const amount = payment ? formatPaymentAmount(payment) : '';
const receiptUrl = payment?.ReceiptUrl;
```

## Removed Legacy Code

- ✅ `updatePaymentStatus()` function removed from instructionDb.js
- ✅ Payment fields removed from instruction API responses
- ✅ Email templates updated to use Payments table
- ✅ Test files updated to remove payment references

## Key Changes Made

1. **Server.js**: Removed payment field handling from instruction endpoints
2. **InstructionDb.js**: Removed `updatePaymentStatus` function  
3. **Payment-routes.js**: Updated webhook to use `upsertInstruction` instead of `updatePaymentStatus`
4. **Email.js**: All email templates now use `paymentService.js` to fetch payment data
5. **PaymentService.js**: New helper module for fetching payment data

## Migration Notes

- Instructions table still contains legacy payment columns but they are no longer populated or returned
- Payment data is now exclusively managed through the Payments table
- Email logic now uses `InternalStatus` field instead of payment fields for decision making
- Receipt URLs come from Payments table instead of instruction record

## Testing Checklist

- [ ] Instructions API returns no payment fields
- [ ] Email templates display correct payment data from Payments table  
- [ ] Payment webhooks work end-to-end
- [ ] No `updatePaymentStatus` calls remain in codebase
