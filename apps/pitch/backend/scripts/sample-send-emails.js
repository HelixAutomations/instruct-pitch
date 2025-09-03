#!/usr/bin/env node
// Triggers all instruction-related email templates for local/manual testing.
// Respects EMAIL_REDIRECT_ALL / EMAIL_LOG_ONLY / EMAIL_FORCE_SEND.
// Usage (PowerShell):
//   $env:EMAIL_REDIRECT_ALL='lz@helix-law.com'; Remove-Item Env:EMAIL_LOG_ONLY -ErrorAction SilentlyContinue; $env:EMAIL_FORCE_SEND='1'; node apps/pitch/backend/scripts/sample-send-emails.js

(async () => {
  const email = require('../email');
  const base = {
    InstructionRef: 'HLX-123-ABC',
    Title: 'Ms',
    FirstName: 'Jane',
    LastName: 'Doe',
    Email: 'client@example.com',
    Phone: '07111 222333',
    PaymentAmount: 750,
    PaymentProduct: 'Commercial Contract Review',
    PaymentMethod: 'card',
    PaymentResult: 'successful',
    HelixContact: 'JD'
  };
  try {
    await email.sendClientSuccessEmail(base);
    await email.sendClientFailureEmail({ ...base, PaymentResult: 'failed' });
    await email.sendFeeEarnerEmail(base);
    await email.sendAccountsEmail({ ...base, PaymentMethod: 'bank', PaymentResult: 'verifying' });
    await email.sendBankDetailsEmail({ Email: base.Email, InstructionRef: base.InstructionRef, Amount: base.PaymentAmount });
    await email.sendInstructionsAccessedEmail({
      DealId: 98765,
      ServiceDescription: base.PaymentProduct,
      Amount: base.PaymentAmount,
      AreaOfWork: 'Commercial',
      PitchedBy: base.HelixContact,
      ProspectId: 4567
    }, base.InstructionRef);
    console.log('✔ Sample emails triggered (check redirect inbox).');
  } catch (e) {
    console.error('✖ Failed to send sample emails:', e.message);
    process.exitCode = 1;
  }
})();
