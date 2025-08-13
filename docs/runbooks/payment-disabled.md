Payment-disabled mode runbook
================================

Purpose
-------
Temporarily disable card payments while keeping identity verification (POID) and document uploads operational.

How to enable
-------------
- Set either of these backend env vars to true (case-insensitive):
  - DISABLE_PAYMENTS=true
  - PAYMENT_DISABLED=true
- Restart the backend application.

Server behavior when disabled
-----------------------------
- Blocks payment endpoints with HTTP 503:
  - POST /pitch/get-shasign
  - POST /pitch/confirm-payment
- Links Instruction to Deal at POID (internalStatus becomes 'poid'):
  - attachInstructionRefToDeal(instructionRef)
  - Snapshot from deal: paymentAmount, paymentProduct, workType
  - Reporting flags: paymentDisabled=true, paymentMethod=null, paymentResult=null, poidDate timestamp
- Emails:
  - Fee earner email is sent
  - All client emails are suppressed (success/failure/confirmation)
  - Accounts email still sent if PaymentMethod='bank'

Client behavior (optional)
--------------------------
- If the client app is configured with VITE_PAYMENT_DISABLED=true, the Pay step can be hidden from the UI. The server already protects endpoints.

Logs and observability
----------------------
- Blocking logs:
  - "🛑 /pitch/get-shasign blocked: payments disabled"
  - "🛑 /pitch/confirm-payment blocked: payments disabled"
- POID linking and snapshots:
  - "🔐 POID transition detected for <InstructionRef>"
  - "🔗 Linked instruction to deal at POID (payments disabled)"
  - "📌 Snapshot persisted at POID (payments disabled): [keys]"
- Warnings that do not fail flow:
  - "⚠️ Failed deal prefill on first save: ..."
  - "⚠️ Failed to fetch deal for snapshot: ..."
- Errors (actionable):
  - "❌ Failed to link instruction to deal at POID: ..."
  - "❌ Failed to persist POID snapshot (payments disabled): ..."

Manual test checklist
---------------------
1. With DISABLE_PAYMENTS=true, call POST /pitch/get-shasign → expect 503
2. With DISABLE_PAYMENTS=true, call POST /pitch/confirm-payment → expect 503
3. Create/update an instruction until internalStatus transitions to 'poid' → expect logs:
   - POID transition, Linked to deal, Snapshot persisted
4. Trigger /api/instruction/send-emails → fee earner sent; client emails suppressed (log)
5. Complete instruction via /api/instruction/complete → deal is closed

Rollback
--------
- Unset DISABLE_PAYMENTS/PAYMENT_DISABLED and restart backend
- Payment endpoints resume normal function; email suppression no longer applies

Edge cases
----------
- Missing DB fields: upsert uses normalized payload; unknown fields are ignored safely
- Deal lookup failures at snapshot: logged as warnings; flow continues
- Re-visits: server returns the same instruction; no duplicate instructions are created
