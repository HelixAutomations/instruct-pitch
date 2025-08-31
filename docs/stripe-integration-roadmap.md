# Stripe Integration Roadmap - Final Sprint

**Date Created:** August 29, 2025  
**Branch:** final-sprint  
**Status:** � Backend Integration Priority

## ⚠️ Document Status

**This is the LATEST and AUTHORITATIVE roadmap document.**  
Other payment/stripe docs in this repository are likely outdated and should be referenced cautiously.

## Current State Assessment

### ✅ Frontend UI Status
- **UI Ready:** Frontend payment components are complete and functional
- **Preflight Experience:** Service card morph animation working correctly
- **VAT Calculations:** Fixed double-VAT issues in preflight display
- **UX Flow:** Premium payment experience implemented
- **Possible Improvements:** Minor UI enhancements spotted but not critical

### 🚨 Backend Integration Issues (PRIORITY)

**Current Problem:** Gateway design not responding to changes, indicating file reference conflicts or architectural issues.

**Symptoms:**
- Changes to backend code not reflected in frontend behavior
- Potential file routing conflicts
- Frontend/backend connection issues
- Gateway endpoint mismatches

---

## 🎯 Phase 1: Core Business Logic & Data Consistency

### 1.1 Consistent Amount Handling
**Priority:** High  
**GitHub Issue:** [Link needed]

**Current State:** Inconsistent amount handling between major and minor units  
**Required Changes:**
- Return both `amount` (major) and `amountMinor` (minor) on all status endpoints
- Use minor units internally throughout the application
- Update database schema if needed to store amounts consistently

**Files to Update:**
- `apps/pitch/backend/payment-routes.js`
- `apps/pitch/backend/payment-database.js`
- `apps/pitch/backend/stripe-service.js`
- Frontend payment components

### 1.2 Business Logic on Payment Success
**Priority:** High  
**GitHub Issue:** [Link needed]

**Current State:** `handleSuccessfulPayment` is a stub  
**Required Implementation:**
- Update instruction statuses in database
- Send confirmation emails to clients
- Trigger post-payment workflows
- Update deal/matter records
- Generate receipts/invoices

**Files to Update:**
- `apps/pitch/backend/payment-routes.js` (webhook handler)
- Email service integration
- Database update functions

---

## 🎯 Phase 2: Webhook & Event Management

### 2.1 Webhook Event Audit Optimization
**Priority:** Medium  
**GitHub Issue:** [Link needed]

**Current State:** Entire Stripe event stored in `webhook_events` table  
**Required Changes:**
- Trim webhook data to essential fields only
- Store: `id`, `type`, `created` timestamp, minimal metadata
- Reduce database storage overhead
- Improve query performance

**Database Schema:**
```sql
CREATE TABLE webhook_events (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    metadata JSON,
    processed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending'
);
```

### 2.2 Event Replay System
**Priority:** Low  
**GitHub Issue:** [Link needed]

**Required Implementation:**
- CLI script to replay stored webhook events
- Support for debugging and recovery scenarios
- Filter by date range, event type, or status

**Deliverable:** `scripts/replay-webhook-events.js`

---

## 🎯 Phase 3: Error Handling & Resilience

### 3.1 Failure Handling & User Experience
**Priority:** High  
**GitHub Issue:** [Link needed]

**Required Implementation:**
- Map Stripe error codes to user-friendly messages
- Persist error codes in database for reconciliation
- Provide clear next steps for users on payment failure
- Support retry workflows

**Error Mapping Examples:**
```javascript
const stripeErrorMap = {
  'card_declined': 'Your card was declined. Please try a different payment method.',
  'insufficient_funds': 'Insufficient funds. Please check your account balance.',
  'authentication_required': 'Please complete card authentication to proceed.'
};
```

### 3.2 Retry & Back-off Strategy
**Priority:** Medium  
**GitHub Issue:** [Link needed]

**Required Implementation:**
- Limited retries for transient Stripe/DB errors
- Exponential back-off on status polling
- Circuit breaker pattern for external service calls
- Dead letter queue for failed webhook processing

---

## 🎯 Phase 4: Monitoring & Administration

### 4.1 Reconciliation Endpoint
**Priority:** Medium  
**GitHub Issue:** [Link needed]

**Required Implementation:**
```javascript
GET /api/payments/reconcile/:paymentIntentId
```
- Fetch latest status from Stripe API
- Sync local database with Stripe truth
- Return reconciliation report
- Support batch reconciliation

### 4.2 Admin Listing & Debugging
**Priority:** Medium  
**GitHub Issue:** [Link needed]

**Required Implementation:**
```javascript
GET /api/admin/payments
```
- Secure, rate-limited endpoint
- List recent payments with filters
- Support for support team debugging
- Include payment timeline and status history

### 4.3 Structured Logging & Metrics
**Priority:** Medium  
**GitHub Issue:** [Link needed]

**Required Implementation:**
- Consistent log formats across payment flow
- Emit metrics for:
  - Payment creation success/failure rates
  - Webhook processing latency
  - Reconciliation accuracy
  - Error frequencies by type

**Log Format Example:**
```json
{
  "timestamp": "2025-08-29T10:30:00Z",
  "level": "info",
  "event": "payment_created",
  "payment_intent_id": "pi_1234567890",
  "amount_minor": 120000,
  "currency": "gbp",
  "instruction_ref": "INS-2024-001",
  "duration_ms": 450
}
```

---

## 🎯 Phase 5: Security & Rate Limiting

### 5.1 API Protection
**Priority:** High  
**GitHub Issue:** [Link needed]

**Required Implementation:**
- Rate limiting on payment intent creation
- Basic auth protection for admin routes
- CSRF protection where applicable
- Input validation and sanitization

### 5.2 Webhook Security Hardening
**Priority:** High  
**GitHub Issue:** [Link needed]

**Required Implementation:**
- Always return 200 on successful webhook processing
- Return 400 on signature verification failure
- Use `crypto.timingSafeEqual` for signature comparison
- Rate limit webhook endpoint
- Implement replay attack protection

---

## 🎯 Phase 6: Testing & Validation

### 6.1 Integration Test Suite
**Priority:** High  
**GitHub Issue:** [Link needed]

**Required Tests:**
- Simulate `payment_intent.succeeded` events
- Test `payment_intent.requires_action` flow
- Validate `payment_intent.payment_failed` handling
- Assert correct database updates
- Use Stripe CLI or test events

### 6.2 3D Secure Validation
**Priority:** Medium  
**GitHub Issue:** [Link needed]

**Test Cards:**
- `4000 0025 0000 3155` - Successful 3DS authentication
- `4000 0000 0000 3063` - Failed 3DS authentication
- Validate complete authentication flows
- Test timeout scenarios

### 6.3 Unit Test Migration
**Priority:** Medium  
**GitHub Issue:** [Link needed]

**Required Actions:**
- Replace ePDQ tests with Stripe equivalents
- Test `stripe-service.createPaymentIntent`
- Test `verifyWebhookSignature`
- Test payment route responses
- Remove obsolete test files

---

## 🎯 Phase 7: Legacy Cleanup

### 7.1 Remove Unused Legacy Files
**Priority:** Medium  
**GitHub Issue:** [Link needed]

**Files to Delete:**
```
apps/pitch/client/src/structure/Payment.tsx
apps/pitch/client/src/structure/PaymentResult.tsx
apps/pitch/client/src/structure/PaymentResult-Stripe.tsx (if unused)
apps/pitch/backend/confirmPayment.test.js
apps/pitch/backend/logRedaction.test.js
```

**Files to Archive (outside repository):**
```
docs/barclays-to-stripe-migration.md
docs/payments-phased-out.md
ePDQ sections in README.md
```

### 7.2 Code Quality Improvements
**Priority:** Medium  
**GitHub Issue:** [Link needed]

**Required Actions:**
- Remove unused `/pitch/confirm-payment-intent` route
- Simplify PaymentForm state management
- Remove duplicate useEffect checks
- Handle React StrictMode double invocation
- Unify environment variable naming to `STRIPE_*`

---

## 🎯 Phase 8: Coordination with Cass

### 8.1 Stripe Dashboard Configuration
**Priority:** High  
**Coordinator:** Cass

**Required Actions:**
- Set up separate fees for card transactions
- Configure webhook endpoint: `/api/webhook/stripe` or `/api/stripe/webhook`
- Verify signing secret matches environment variable
- Enable specific events: `payment_intent.*`
- Configure payout schedules

### 8.2 Compliance & Pricing Research
**Priority:** Medium  
**Coordinator:** Cass

**Research Areas:**
- Transaction fees for legal services
- Payout schedules and settlement options
- Compliance obligations for legal payments
- Connect accounts for fee splitting (if needed)
- Documentation for mini-report

---

## 🎯 Phase 9: Documentation & Knowledge Transfer

### 9.1 Update Technical Documentation
**Priority:** Medium  
**GitHub Issue:** [Link needed]

**Documents to Update:**
- `README.md` - Remove ePDQ references, add Stripe setup
- `docs/architecture.md` - Reflect new payment flow
- `docs/development-guide.md` - Local Stripe testing setup
- API documentation for new endpoints

### 9.2 Operational Runbooks
**Priority:** Medium  
**GitHub Issue:** [Link needed]

**Required Documentation:**
- Payment failure investigation procedures
- Webhook debugging steps
- Reconciliation processes
- Emergency rollback procedures

---

## 📋 Implementation Priority Matrix

| Phase | Priority | Effort | Dependencies | Timeline |
|-------|----------|---------|--------------|----------|
| 1.1 Amount Consistency | High | Medium | None | Week 1 |
| 1.2 Success Business Logic | High | High | 1.1 | Week 1-2 |
| 3.1 Failure Handling | High | Medium | 1.1 | Week 2 |
| 5.1-5.2 Security | High | Medium | None | Week 2 |
| 6.1 Integration Tests | High | High | 1.1, 1.2 | Week 3 |
| 8.1 Dashboard Config | High | Low | Cass availability | Week 1 |
| 2.1 Webhook Optimization | Medium | Medium | 1.2 | Week 3 |
| 4.1 Reconciliation | Medium | Medium | 1.1 | Week 4 |
| 6.2-6.3 Testing | Medium | Medium | 6.1 | Week 4 |
| 7.1-7.2 Cleanup | Medium | Low | All phases | Week 5 |

---

## 🚨 Critical Path Items

1. **Amount Consistency** - Foundational for all other work
2. **Success Business Logic** - Core payment completion flow
3. **Security Hardening** - Production readiness
4. **Stripe Dashboard Setup** - External dependency (Cass)

---

## 📊 Success Metrics

- [ ] 100% of payments use minor units internally
- [ ] <2s average webhook processing time
- [ ] 99.9% webhook signature verification success
- [ ] Zero data inconsistencies in reconciliation
- [ ] Complete test coverage for payment flows
- [ ] All legacy ePDQ code removed
- [ ] Documentation updated and accurate

---

**Last Updated:** August 29, 2025  
**Next Review:** After Phase 1 completion  
**Owner:** Development Team  
**Coordinator:** Cass (Dashboard & Compliance)
