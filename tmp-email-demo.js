process.env.EMAIL_REDIRECT_ALL='lz@helix-law.com';
process.env.EMAIL_LOG_ONLY='1';
const email = require('./apps/pitch/backend/email');
(async () => {
  const baseRecord = {
    InstructionRef: 'HLX-123-ABC',
    Title: 'Ms', FirstName: 'Jane', LastName: 'Doe',
    Email: 'client@example.com', Phone: '07111 222333',
    // Payment data now handled by separate Payments table/API
    HelixContact: 'JD'
  };
  console.log('\n== Client Success Email ==');
  await email.sendClientSuccessEmail(baseRecord);

  console.log('\n== Client Failure Email ==');
  await email.sendClientFailureEmail(baseRecord);

  console.log('\n== Fee Earner Email ==');
  await email.sendFeeEarnerEmail(baseRecord);

  console.log('\n== Accounts Pending Bank Transfer Email ==');
  // Bank transfers now use separate payment data

  console.log('\n== Bank Details Email ==');
  await email.sendBankDetailsEmail({ Email: 'client@example.com', InstructionRef: 'HLX-123-ABC', Amount: 750 });

  console.log('\n== Instructions Accessed Monitoring Email ==');
  await email.sendInstructionsAccessedEmail({
    DealId: 98765,
    ServiceDescription: 'Commercial Contract Review',
    Amount: 750,
    AreaOfWork: 'Commercial',
    PitchedBy: 'JD',
    ProspectId: 4567
  }, 'HLX-123-ABC');
})();
