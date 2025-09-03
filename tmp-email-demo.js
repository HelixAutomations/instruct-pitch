process.env.EMAIL_REDIRECT_ALL='lz@helix-law.com';
process.env.EMAIL_LOG_ONLY='1';
const email = require('./apps/pitch/backend/email');
(async () => {
  const baseRecord = {
    InstructionRef: 'HLX-123-ABC',
    Title: 'Ms', FirstName: 'Jane', LastName: 'Doe',
    Email: 'client@example.com', Phone: '07111 222333',
    PaymentAmount: 750, PaymentProduct: 'Commercial Contract Review',
    PaymentMethod: 'card', PaymentResult: 'successful', HelixContact: 'JD'
  };
  console.log('\n== Client Success Email ==');
  await email.sendClientSuccessEmail(baseRecord);

  console.log('\n== Client Failure Email ==');
  await email.sendClientFailureEmail({...baseRecord, PaymentResult:'failed'});

  console.log('\n== Fee Earner Email ==');
  await email.sendFeeEarnerEmail(baseRecord);

  console.log('\n== Accounts Pending Bank Transfer Email ==');
  await email.sendAccountsEmail({...baseRecord, PaymentMethod:'bank', PaymentResult:'verifying'});

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
