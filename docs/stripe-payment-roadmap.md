# Stripe Sandbox Payment Roadmap & Checklist

This document tracks the remaining work to get reliable sandbox (and later live) Stripe payments running end‑to‑end. Update the Status column as you complete items. Tasks are ordered by risk/impact.

---
## Legend
Status values you can use: `TODO`, `IN-PROGRESS`, `BLOCKED`, `DONE`, `N/A`

---
## High‑Priority Checklist (Phase 1)
| # | Task | Details / Acceptance | Status |
| - | ---- | -------------------- | ------ |
| 1 | Webhook path alignment | Stripe dashboard endpoint must hit an implemented route. Either change dashboard URL to `/api/webhook/stripe` OR add alias `/api/stripe/webhook` (both 200). | IN-PROGRESS |
| 2 | Raw body handling for webhook | Ensure body for `/api/webhook/stripe` bypasses `express.json()` so signature verification uses the raw Buffer. 400 on tampered signature; 200 on valid test event. | DONE |
| 3 | Elements mode correction | Remove `mode: 'setup'` or change to `payment` in `StripeContext.tsx`. Payment flow still succeeds. | DONE |
| 4 | Amount unit standardisation | Decide: store & expose amounts in *major units* (GBP pounds) or *minor units* (pence). Implement consistent conversion in create intent, DB write, responses, UI formatting. | DONE (canonical minor, DB dual) |
| 5 | Commit env var naming change | Using standard `STRIPE_*` vars with fallback to legacy `INSTRUCTIONS_SANDBOX_*` (migration complete). | DONE |
| 6 | Stripe API version sync | API version in code = webhook endpoint version (`2025-07-30`). All integration tests pass. | DONE |
| 7 | Idempotency on PaymentIntent create | Use `Idempotency-Key: <paymentId>` when creating PaymentIntents. Duplicate POST returns same intent id. | DONE |
| 8 | Status response consistency | `GET /status/:id` returns amounts in chosen standard unit; display matches creation input. | TODO |
| 9 | 3DS (requires_action) UX | If status `requires_action`, show clear guidance to user (and optional retry button). | DONE |
| 10 | Webhook event payload audit | Persist trimmed JSON (or selected fields) for succeeded / failed events for reconciliation. | TODO |

## Medium Priority (Phase 2)
| # | Task | Details / Acceptance | Status |
| - | ---- | -------------------- | ------ |
| 11 | Business logic on success | On `payment_intent.succeeded` + internal completed: update related instruction status + optional email placeholder logged. | TODO |
| 12 | Failure handling policy | Map Stripe failures to user-facing messages; ensure DB marks internal failed; log root error code. | TODO |
| 13 | Reconciliation endpoint | `/api/payments/reconcile/:paymentIntentId` refetches Stripe object & syncs DB. 404 if not found. | TODO |
| 14 | Admin listing route | Paginated listing (recent N payments) for ops debugging. Excludes secrets. | TODO |
| 15 | Rate limiting / basic auth | Protect create intent + admin routes. (e.g., simple API key header or IP allowlist in sandbox). | TODO |
| 16 | Structured logging | Use consistent prefix & JSON line for payment lifecycle events. | TODO |

## Low Priority (Phase 3)
| # | Task | Details / Acceptance | Status |
| - | ---- | -------------------- | ------ |
| 17 | Retry / backoff strategy | Gracefully handle transient Stripe/DB errors with limited retries & logging. | TODO |
| 18 | Metrics / telemetry hooks | Emit counters: intents created, succeeded, failed, webhook latency (ms). | TODO |
| 19 | Event replay script | CLI script to replay stored webhook events for debugging. | TODO |
| 20 | Cleanup preview payment path | Optional: remove dev preview logic or gate behind explicit feature flag. | TODO |
| 21 | Documentation hardening | Add a sequence diagram + failure matrix to this doc or `architecture.md`. | TODO |

---
## Implementation Guidance (Key Items)

### 1 & 2 Webhook Path + Raw Body
Option A (simplest): Change Stripe endpoint URL to `https://<app>/api/webhook/stripe` and keep existing route. In `server.js`, place a conditional raw body middleware **before** `express.json()` for that path:
```js
app.use('/api/webhook/stripe', express.raw({ type: 'application/json' }));
app.use(express.json());
```
Or, if `express.json()` must stay first, short‑circuit and re‑read raw bytes (higher risk). Prefer early raw middleware.

Add alias route in `payment-routes.js`:
```js
router.post('/stripe/webhook', rawBodyMiddleware, handler);
```

### 3 Elements Mode
In `StripeContext.tsx` remove `mode: 'setup'` or set `mode: 'payment'`. Verify test card 4242 completes.

### 4 Amount Units
Recommendation: use **minor units (integer)** internally (Stripe native). Steps:
1. Store `amount_minor` (e.g. 5000 for £50). Remove decimal column or keep both with a computed conversion.
2. Convert display: `amount_minor / 100` for formatting.
3. When creating PaymentIntent: send `amount_minor` directly.
4. When returning JSON: include both `amount` (major) and `amountMinor` for clarity.

### 5 Env Var Naming
If standardising on `INSTRUCTIONS_SANDBOX_*`, expose a mapping layer so future production can switch to `INSTRUCTIONS_LIVE_*` by environment. Alternatively revert to `STRIPE_*` for portability. Whichever is chosen, update runbook & App Settings.

### 7 Idempotency
```js
await this.stripe.paymentIntents.create(payload, { idempotencyKey: paymentId });
```
Log when a reused idempotency key returns an existing intent.

### 8 Status Consistency
Return JSON example:
```json
{
  "paymentId": "abc",
  "paymentStatus": "succeeded",
  "internalStatus": "completed",
  "amount": 50.00,
  "amountMinor": 5000,
  "currency": "GBP"
}
```

### 10 Event Payload Audit
Store minimal subset (id, type, amount, status, created, captured_at, error_code) in `webhook_events` array. Avoid full card details (never store PAN/CVC).

### 11 Business Logic
Hook in `handleSuccessfulPayment` (already present) to update instruction status and queue an email send (stub). Ensure failures there do not NACK the webhook.

---
## Verification Steps (Phase 1)
1. Send Stripe test event from dashboard (`payment_intent.succeeded`) → 200 response, DB row updated.
2. Create live sandbox payment (4242 card) → frontend status transitions to completed.
3. Trigger `requires_action` (card: 4000 0027 6000 3184) → frontend displays needs-auth message.
4. Tamper signature → 400 returned.
5. Repeat POST create intent with same instructionRef quickly → same PaymentIntent (idempotent) or gracefully new with no duplicates.

---
## Future Enhancements
- Webhook latency metric (event created vs processed).
- Dead-letter capture for repeated webhook failures.
- Fraud signals / radar outcome logging.
- Partial refunds + webhook handling.

---
## Change Log
| Date | Change | Author |
|------|--------|--------|
| 2025-08-20 | Initial roadmap and checklist added | (assistant) |

---
Update statuses as tasks are completed. Ping if you want automated test scaffolding next.
