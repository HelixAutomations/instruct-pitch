// One-off script: send two emails FROM support while keeping routing otherwise the same
// - Internal notice: "✅ New Instruction Complete: Legal Consultation (N/A) - HLX-TEST-67890"
//   TO fee earner, CC automations, FROM support
// - Client confirmation: "Instruction Confirmed – Payment Received"
//   TO client (gmail), BCC automations, FROM support

require('dotenv').config();

const path = require('path');
const {
  sendMail,
  buildClientSuccessBody,
  buildFeeEarnerBody,
} = require('../email');
const { getSolicitorInfo } = require('../instructionDb');

async function main() {
  // Inputs per request
  const InstructionRef = 'HLX-TEST-67890';
  const PaymentProduct = 'Legal Consultation';
  const clientEmail = 'lukaszzemanek11@gmail.com';

  // Resolve env-based addresses
  const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@helix-law.com';
  const AUTOMATIONS_EMAIL = process.env.AUTOMATIONS_EMAIL || 'automations@helix-law.com';

  // Build a minimal record. HelixContact 'LZ' maintains prior routing for fee earner.
  const record = {
    InstructionRef,
    PaymentProduct,
    FirstName: 'Client',
    Email: clientEmail,
    HelixContact: 'LZ',
  };

  // 1) Internal notice to automations only (subject explicitly provided), FROM support
  try {
    const docs = []; // optional; leaving empty for one-off send
    const feeBody = await buildFeeEarnerBody(record, docs);
    const subject1 = `✅ New Instruction Complete: ${PaymentProduct} (N/A) - ${InstructionRef}`;

    console.log(`Sending internal notice FROM ${SUPPORT_EMAIL} TO ${AUTOMATIONS_EMAIL}`);
    await sendMail(
      AUTOMATIONS_EMAIL, // to automations only
      subject1,
      feeBody,
      SUPPORT_EMAIL, // from override
      [], // no bcc
      [] // no cc
    );
    console.log('✅ Sent internal notice (to automations only)');
  } catch (err) {
    console.error('❌ Failed to send internal notice:', err?.message || err);
  }

  // 2) Client confirmation FROM support (override), BCC automations
  try {
    const clientBody = await buildClientSuccessBody(record);
    const subject2 = 'Instruction Confirmed – Payment Received';

    console.log(`Sending client confirmation FROM ${SUPPORT_EMAIL} TO ${clientEmail} BCC ${AUTOMATIONS_EMAIL}`);
    await sendMail(
      clientEmail, // to
      subject2,
      clientBody,
      SUPPORT_EMAIL, // from override
      [AUTOMATIONS_EMAIL], // bcc
      [] // cc
    );
    console.log('✅ Sent client confirmation (support as sender)');
  } catch (err) {
    console.error('❌ Failed to send client confirmation:', err?.message || err);
  }
}

main().catch((e) => {
  console.error('❌ Script error:', e?.message || e);
  process.exitCode = 1;
});
