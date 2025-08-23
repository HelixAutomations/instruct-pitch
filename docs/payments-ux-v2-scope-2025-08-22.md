# Payments UX V2 Implementation Scope (2025-08-22)

## Context
Helix Law client portal requires a premium, trust-first 3‑step experience (ID → Documents → Payment) for high-value legal service transactions processed via Stripe PaymentIntents (3DS capable) on Azure (Express backend + React frontend). Current V2 draft introduces fragmented styling, inconsistent amount handling, duplicated trust details, and missing accessibility guarantees.

## Objectives
1. Deliver a cohesive, litigation-grade payment (step 3) and preceding steps (ID, Documents) wrapped in consistent layout + trust surface.
2. Enforce security & compliance signals (SRA ID 565557, legal entity, support, policies) without retail artifacts.
3. Provide pre-flight session establishment (800–1500ms) before exposing the card form.
4. Ensure Stripe Payment Element is visually first‑party (color, type, spacing) and accessible (WCAG 2.1 AA).
5. Centralize monetary formatting (minor units) and trust configuration to eliminate drift.
6. Instrument telemetry for critical lifecycle events (preflight start/end, element ready, submit, 3DS start/end, result) for analysis.
7. Gate new UX behind feature flag `PAYMENTS_UX_V2` (graceful fallback to legacy).

## Non-Negotiables Mapping
| Requirement | Implementation Anchor |
|-------------|-----------------------|
| Trust surface (entity, SRA, contacts, policies) | `PaymentLayout`, `TrustStrip`, centralized `trustConfig.ts` |
| Pre-flight delay 800–1500ms | `PreflightPane` (configurable duration + a11y live region) |
| Stripe Payment Element (no redirect) | `PaymentForm` using `stripe.confirmPayment` with `automatic_payment_methods` |
| No retail UI (tips/discounts/shipping) | Excluded from `PriceSummaryCard` props; lint rule / prop typing |
| Accessibility AA | Semantic roles, focus management, aria-live, contrast tokens |
| Feature flag | `featureFlags.ts` + guarded route/component mount |
| Server authoritative amounts | `/api/payments/create-intent` validation & canonical amount_minor storage |
| Telemetry events | `paymentTelemetry` wrapper + unified event schema |

## In Scope
- Refactor & stabilize payment V2 components listed in plan.
- Introduce ID & Document step shell components (placeholder logic but production-ready layout rails).
- Stripe integration hardening (intent reuse, error mapping, requires_action flow visibility, processing state fallback/polling skeleton).
- Unified design token layer (minimal palette, spacing, typography, elevations) consumed via CSS Modules / utility classes.
- Cypress E2E coverage for happy path, 3DS challenge (test card), declined card, network fault.
- README + copy deck snippet (env vars, user-facing messages, support wording).

## Out of Scope (Phase Later / Separate PR)
- Full KYC / ID verification backend logic.
- Actual document ingestion service or virus scanning pipeline.
- Multi-currency expansion beyond GBP.
- Receipt PDF generation / emailing (placeholder hook only).
- Advanced analytics dashboard ingestion.

## Success Metrics (Post-Launch Observability)
- < 1% formatting discrepancies (amount displayed vs Stripe intent amount).
- ≥ 98% successful focus traversal (Cypress axe / keyboard tests).
- Telemetry event loss < 0.5% (client buffer flush before unload).
- 3DS completion rate tracked & surfaced (> baseline legacy rate).

## Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Amount unit confusion | Single `money.ts` utilities + TypeScript branded type for minor units |
| Drift in trust details | Central constants + storybook/visual test snapshot |
| A11y regressions via inline styles | Migrate to tokens + axe CI check |
| Race conditions preflight → intent creation | Serialized promise with abort guard |
| User abandons during processing | Poll & allow safe retry w/ idempotent key (instructionRef) |

## Telemetry Event Schema (Draft)
```
{
  event: 'preflight_start' | 'preflight_end' | 'element_ready' | 'payment_submit' | '3ds_start' | '3ds_complete' | 'payment_result',
  instructionRef: string,
  paymentIntentId?: string,
  amount_minor?: number,
  status?: 'succeeded' | 'processing' | 'requires_action' | 'failed',
  duration_ms?: number,
  error_code?: string,
  user_agent: string,
  ts: number
}
```

## Copy Deck (Baseline Strings)
- Pre-flight: "Setting up a secure session…"
- Helper: "We never store your card details. 3‑D Secure may be required."
- Pay button: "Pay £{amount}" (amount = major units formatted)
- Success: "Payment received. Thank you."
- Failure (decline): "Your bank declined this payment. Try another card or contact support."

## Acceptance Criteria (Condensed)
1. Preflight always precedes Payment Element; no skipped path.
2. Amount consistent across summary card, button, result screen.
3. 3DS challenge state surfaces inline without feeling redirected.
4. Trust strip visible on all three steps (mobile & desktop) with proper contrast.
5. Feature flag off → legacy flow unaffected, no bundle errors.
6. All components keyboard navigable; color contrast ≥ 4.5:1 for text.

## Deliverables Summary (to follow in PR)
- Components: Layout, trust, price summary, preflight, ID step, Docs step, payment form, result.
- Backend route: `/api/payments/create-intent` with schema validation & idempotent key.
- Utilities: `money.ts`, `trustConfig.ts`, `telemetry.ts` improvements.
- Tests: Cypress specs (4 core scenarios) + unit tests for money utils.
- Docs: README snippet + copy deck + migration notes.

---
Prepared 2025-08-22.
