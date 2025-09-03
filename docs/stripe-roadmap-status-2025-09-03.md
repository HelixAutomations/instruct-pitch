# Stripe Integration Production Roadmap & Status (2025-09-03)

This document consolidates the original Stripe migration TODO list with the production hardening checklist. It records current implementation status based on the codebase (branch: `final-sprint`) as of 2025-09-03.

Legend: ✅ Done | 🟡 Partial / In Progress | ❌ Not Implemented | 💤 Deferred / External

---
## 1. Core Payment Data & Consistency
| Task | Status | Evidence | Next Action |
|------|--------|----------|-------------|
| ~~Return both `amount` (major) & `amountMinor` on status endpoint~~ | ✅ | `payment-routes.js` GET /status includes `amountMinor` | None |
| ~~Store canonical minor units internally~~ | ✅ | DB column `amount_minor`, write in `createPayment` | None (backfill skipped: dummy data) |
| ~~Return `amountMinor` on create intent response~~ | ✅ | Added to create intent + reuse response in `payment-routes.js` | None |
| ~~Avoid duplicate PaymentIntents (reuse)~~ | ✅ | Reuse logic in route & client cache | Consider server idempotency header per instructionRef |

### Step 2 Note: Backfilling `amount_minor`
Decision: Skipped. Current dataset is dummy/non‑production so any NULL `amount_minor` rows can be ignored until real data ingestion. All new rows populate `amount_minor` on insert, so no integrity risk.
If future production data includes NULLs, run a one-off backfill:
```
UPDATE payments SET amount_minor = ROUND(amount * 100, 0) WHERE amount_minor IS NULL;
```
Otherwise leave as-is.
## 2. Webhook & Event Processing
| Task | Status | Evidence | Next Action |
|------|--------|----------|-------------|
| Trim webhook event storage (id,type,created,timestamp) | ✅ | `payment-database.updatePaymentStatus` pushes trimmed object | None |
| ~~Business logic on success (`handleSuccessfulPayment`)~~ | ✅ | Implemented in `payment-routes.js` (instruction update, deal close, emails) | Email override → all mail to lz@helix-law.com |
| Idempotent webhook handling | 🟡 | Basic; no event replay guard aside from append | Track processed event IDs or enforce uniqueness index on event id table |
| Webhook always 200 on success / 400 on signature failure | ✅ | Implementation present | Add structured log + correlation id |
| Alias endpoint supported (/api/stripe/webhook) | ✅ | Second route defined | Keep consistent logging prefix |

## 3. Failure Handling & Reconciliation
| Task | Status | Evidence | Next Action |
|------|--------|----------|-------------|
| Map Stripe error codes to user-friendly messages | ❌ | Only raw `stripeError.message` surfaced in `PaymentForm.tsx` | Central error map in stripe-service & persist code |
| Persist error codes in DB | ❌ | No column (e.g. `last_error_code`) | Add nullable columns `last_error_code`, `last_error_message` |
| Reconciliation endpoint `/api/payments/reconcile/:paymentIntentId` | ❌ | Not present | Implement: fetch latest from Stripe & sync |
| Event replay CLI | ❌ | No script | Script: iterate stored events, call handler with safety guard |

## 4. Admin / Support Functions
| Task | Status | Evidence | Next Action |
|------|--------|----------|-------------|
| Admin listing (recent payments) | ❌ | No route | Add paginated secure route with auth + filters |
| Rate limiting admin + creation endpoints | ❌ | No `rateLimit` usage found | Introduce express-rate-limit or custom token bucket |
| Basic auth / API key for admin routes | ❌ | Not implemented | Use Key Vault stored admin token / Basic auth middleware |

## 5. Logging, Metrics & Observability
| Task | Status | Evidence | Next Action |
|------|--------|----------|-------------|
| Structured JSON logs | ❌ | Console string logs only | Introduce logger (pino / console wrapper) |
| Metrics: creation, success, failure, webhook latency | ❌ | None | Emit counters + latency (Date.now diff) -> App Insights |
| Correlation IDs across request -> webhook | ❌ | Not implemented | Generate `x-correlation-id` per paymentId |

## 6. Resilience & Retry
| Task | Status | Evidence | Next Action |
|------|--------|----------|-------------|
| Exponential backoff polling client | ❌ | Fixed 2s interval in `paymentService.pollPaymentStatus` | Implement backoff (2,4,6… capped) |
| Retry transient Stripe errors (network) | ❌ | Direct call only | Wrap Stripe calls with retry on retryable codes |
| DB transient retry | ❌ | None | Add minimal retry (deadlock / ECONNRESET) |

## 7. Frontend Payment UX
| Task | Status | Evidence | Next Action |
|------|--------|----------|-------------|
| StrictMode duplicate guard | ✅ | `paymentIntentCreatedRef` + sessionStorage flags | Simplify duplicate conditional (currently duplicated lines) |
| Reduce redundant conditions in PaymentForm | ❌ | Duplicate checks (amount/instructionRef/clientSecret) | Refactor guard block |
| Polling final state & 3DS handling | ✅ | Polling stops on final / requires_action | Add backoff + UI hint to resume after auth |
| Modern form adoption (legacy removed) | 🟡 | Legacy Payment.tsx removed; multiple experimental forms remain | Decommission unused variants / doc canonical component |

## 8. Legacy Cleanup
| Task | Status | Evidence | Next Action |
|------|--------|----------|-------------|
| Remove legacy ePDQ tests | ❌ | `confirmPayment.test.js`, `logRedaction.test.js` remain | Delete or migrate to Stripe tests |
| Remove unused old payment route `/pitch/create-payment-intent` | ❌ | Present in `server.js` | Remove or proxy to new API + deprecate |
| Archive obsolete docs (ePDQ, migration) | ❌ | Files still exist & README references migration | Move to `/docs/archive/` & update README |
| Update README to Stripe-first | ❌ | Still states “currently being migrated” | Rewrite section & link to integration doc |

## 9. Security Hardening
| Task | Status | Evidence | Next Action |
|------|--------|----------|-------------|
| Use STRIPE_* env names (fallback for legacy) | 🟡 | Fallback logic in `stripe-service.js` | Remove legacy after cutover; update README |
| timingSafeEqual for manual signature compare | N/A | Stripe SDK handles internally | (Optional) Document reliance on SDK validation |
| Rate limit webhook endpoint | ❌ | None | Add low threshold + burst allowance |
| Mask sensitive values in logs | 🟡 | No PAN logged but verbose; some raw objects logged | Introduce scrubber middleware |
| Enforce currency whitelist | ❌ | Only default; no whitelist | Validate `currency` ∈ ['gbp'] |
| Idempotency key usage | ✅ | Stripe call uses `{ idempotencyKey: paymentId }` | Consider instructionRef based semantic key |

## 10. Testing
| Task | Status | Evidence | Next Action |
|------|--------|----------|-------------|
| Integration test script | ✅ | `test-stripe-integration.js` | Expand with failure & requires_action mocks |
| Unit tests stripe-service methods | ❌ | None | Add tests: createPaymentIntent (mock Stripe), mapPaymentStatus |
| Webhook event simulations (succeeded/failed/requires_action) | ❌ | Not present | Add test harness feeding constructEvent output |
| 3DS success/fail test automation | ❌ | Manual only | Document card numbers & simulate via test mode events |

## 11. Documentation
| Task | Status | Evidence | Next Action |
|------|--------|----------|-------------|
| Stripe integration doc (core) | ✅ | `docs/stripe-integration.md` | Add sections: reconciliation, admin, logging plan |
| Architecture update for Stripe | 🟡 | Not fully replaced ePDQ refs | Remove transitional phrasing |
| Production runbook | ❌ | Not present | Create `/docs/runbooks/payments-production.md` |

## 12. Production Hardening (From Added Checklist)
| Item | Status | Notes |
|------|--------|-------|
| Environment separation (test vs live) | 🟡 | Fallback env vars; no explicit mode flag | Add `STRIPE_MODE` + safeguards |
| Key Vault secret usage | 🟡 | Env driven; code expects secrets already loaded | Document retrieval path / managed identity |
| Rate limiting critical endpoints | ❌ | See earlier | Implement global + per-route policies |
| Structured security headers | ❌ | Not reviewed in backend snippet | Add helmet / custom headers |
| Monitoring metrics (success rate) | ❌ | Not implemented | Use App Insights SDK |
| Alerting (webhook gap) | ❌ | Not implemented | KQL query / alert rule |
| Blue/green or slot strategy | 💤 | Out of scope in repo | Track in deployment plan |
| Post-deploy verification checklist | 🟡 | Implicit in doc | Extract into runbook |

## 13. External / Coordination (Cass)
| Task | Status | Notes |
|------|--------|-------|
| Fee structure validation | 💤 | Business follow-up | Await outcome to adjust metadata |
| Webhook dashboard config | 🟡 | Code supports two paths; verify live config | Confirm events restricted to `payment_intent.*` |
| Pricing & payout compliance answers | 💤 | External | Capture answers in compliance summary |

---
## 14. Summary by Status
**Completed (representative):** minor-unit storage, status endpoint dual amounts, trimmed webhook event storage, idempotent PaymentIntent creation, business success logic (instruction update, deal closure, redirected emails), basic polling, integration test scaffold.

**Partial:** env var unification, webhook idempotency (needs processed-event safeguard), docs (integration present but migration language persists), environment separation (no explicit LIVE guard), logging hygiene.

**Missing / High Impact Gaps:** reconciliation endpoint, admin listing + rate limiting, structured logging & metrics, retry/backoff strategy, error code persistence, test coverage for failure & 3DS, legacy file removal, README updates.

---
## 15. Immediate Priority Recommendations (Order)
1. Implement reconciliation (+ error code persistence)
2. Add admin list + security (auth + rate limit) & remove legacy route
3. Introduce structured logging + metrics (App Insights)
4. Add retry/backoff (client + server) & error mapping
5. Remove legacy tests/docs & update README (Stripe-first)
6. Implement reconciliation endpoint + replay CLI
7. Add automated webhook/event tests & 3DS simulation harness
8. Harden security: rate limit webhook, currency whitelist, log scrubbing

---
## 16. Proposed Minimal Next Code Changes
Small, low-risk improvements to close quick gaps:
1. Include `amountMinor` in create intent response
2. Add currency whitelist (simple array)
3. Refactor duplicate guard logic in `PaymentForm`
4. Create `logger.js` wrapper (later replace with pino/App Insights)

---
## 17. Future Enhancements (Deferred)
| Enhancement | Rationale |
|-------------|-----------|
| Dedicated payments service module boundary | Separation of concerns & easier testing |
| Event sourcing table for webhook events | Queryability & replay granularity |
| UI status streaming via SSE/WebSocket | Reduce polling overhead |
| Automated nightly synthetic payment (test mode) | Early detection of regressions |

---
## 18. Evidence Notes
Referenced files inspected: `apps/pitch/backend/payment-routes.js`, `payment-database.js`, `stripe-service.js`, `server.js`, client `PaymentForm.tsx`, `paymentService.ts`, integration test, `email.js` (email override banner). Legacy ePDQ tests confirmed present. No rate limit middleware detected.

### Temporary Email Override
All outbound emails (success/failure/fee earner/accounts/bank details) are currently forced to `lz@helix-law.com`. Subject line is prefixed with `[INTENDED:<original>]` and a banner is injected. Remove by unsetting `EMAIL_REDIRECT_ALL` (or setting to empty) when ready for real recipients.

---
## 19. Next Steps Execution Template
When picking a task, update this document or create a dated changelog entry:
```
Task: <name>
Change: <summary>
Files: <list>
Risk: Low|Medium|High
Rollback: <strategy>
```

---
Prepared: 2025-09-03
