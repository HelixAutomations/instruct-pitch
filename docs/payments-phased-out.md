Payments phased-out (temporary)

Context
- The project is migrating away from the Barclays ePDQ solution to a Stripe SDK integration.
- During the migration we want to disable the existing payments flow so local dev and staging are not blocked by ePDQ or function keys.

What we changed (recommended, and what I've started)
- Add a client-side feature flag `VITE_PAYMENT_DISABLED` (set in `apps/tab-app/.env`) to hide payment UI and relax client validations.
- Add a small runtime helper at `apps/tab-app/src/app/config/payment.ts` which checks `import.meta.env.VITE_PAYMENT_DISABLED` or a runtime window flag `window.__PAYMENT_DISABLED__`.
- Use the flag in the UI to hide/disable payment fields and to avoid directing users to the old ePDQ endpoints.
- Backend already supports `DISABLE_PAYMENTS` / `PAYMENT_DISABLED` to block payment endpoints and return 503. Keep that server-side protection.

Developer notes
- To test locally with payments hidden:
  - copy `apps/tab-app/.env.example` to `apps/tab-app/.env` and ensure `VITE_PAYMENT_DISABLED=true` is present.
  - start the app and functions host as documented in `docs/local-development.md`.
  - the payment step in the client will be hidden; server endpoints still return 503 if `DISABLE_PAYMENTS` set in the backend env.

Files to review manually
- UI components that reference payment fields or payment status: search for `PaymentResult`, `get-shasign`, `confirm-payment`, or `Payment` labels in the UI. Example files:
  - `apps/tab-app/src/tabs/enquiries/pitch-builder/DealCaptureForm.tsx` (payment amount field and proof text)
  - `apps/tab-app/app/instructions/.../client/src/structure/Payment.tsx` (embedded legacy payment form in the pitch folder)
  - `apps/pitch/backend/server.js` (existing endpoints `/pitch/get-shasign` and `/pitch/confirm-payment`)

Next steps (safe and low risk)
1. Search & apply small UI toggles where payment UI appears. Prefer non-destructive hiding (wrap with `if (!isPaymentDisabled) ...`).
2. Add tests that confirm UI shows/hides based on `VITE_PAYMENT_DISABLED`.
3. Remove or replace ePDQ client/server code only once Stripe integration is ready (keep server-side DISABLE flags until deploy is fully validated).

If you'd like I can:
- Apply the UI hide toggles across the most-visible files now (DealCaptureForm, Instruction cards, Payment pages),
- or produce a small PR that replaces the client-side ePDQ call sites with feature-flagged stubs that show a migration notice.

Which do you want me to do next? Replace UI now, or create a PR with the changes grouped?
