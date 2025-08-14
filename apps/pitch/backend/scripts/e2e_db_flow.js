/*
  E2E DB flow script (safe):
  - Requires env: DB_USER, DB_PASSWORD, DB_SERVER, DB_NAME
  - Optional env: TEST_PASSCODE (defaults to '87402'), TEST_PROSPECTID
  - Usage (PowerShell):
      $env:DB_USER='user'; $env:DB_PASSWORD='secret'; $env:DB_SERVER='db.server'; $env:DB_NAME='db'; $env:TEST_PASSCODE='87402'; node .\scripts\e2e_db_flow.js
*/

(async () => {
  try {
    const required = ['DB_USER','DB_PASSWORD','DB_SERVER','DB_NAME'];
    const missing = required.filter(k => !process.env[k]);
    if (missing.length) {
      console.error('Missing DB env vars:', missing.join(', '));
      console.error('Set them and re-run. This script will not run without DB credentials.');
      process.exit(2);
    }

    const passcode = process.env.TEST_PASSCODE || '87402';
    const prospectId = process.env.TEST_PROSPECTID ? Number(process.env.TEST_PROSPECTID) : null;

    console.log('Connecting to DB... (not printing credentials)');
    const { getDealByPasscode, attachInstructionRefToDeal, upsertInstruction } = require('../instructionDb');
    const { generateInstructionRef } = require('../dist/generateInstructionRef');

    // 1) lookup deal by passcode
    console.log(`Looking up deal by passcode='${passcode}'${prospectId ? ` and prospectId=${prospectId}` : ''}...`);
    const deal = await getDealByPasscode(passcode, prospectId);
    if (!deal) {
      console.error('❌ No matching open deal found for that passcode. Aborting.');
      process.exit(3);
    }
    console.log('Found deal:', { DealId: deal.DealId, ProspectId: deal.ProspectId, Amount: deal.Amount, ServiceDescription: deal.ServiceDescription });

    const cid = String(deal.ProspectId || prospectId || '00000');
    const instructionRef = generateInstructionRef(cid, passcode);
    console.log('Generated instructionRef:', instructionRef);

    // 2) upsert an instruction (minimal payload)
    const payload = {
      FirstName: 'E2E',
      LastName: 'Tester',
      Email: 'e2e@example.com',
      Phone: '0000000000'
    };
    console.log('Upserting instruction (minimal payload)...');
    const record = await upsertInstruction(instructionRef, payload);
    console.log('Upsert returned instructionRef:', record && (record.InstructionRef || record.instructionRef));

    // 3) attach instructionRef to deal
    console.log('Attaching instructionRef to deal...');
    await attachInstructionRefToDeal(instructionRef);

    console.log('Verifying deal now has the instructionRef (re-query)...');
    const verify = await getDealByPasscode(passcode, deal.ProspectId);
    if (verify && (verify.InstructionRef || verify.instructionRef || '').includes(instructionRef)) {
      console.log('✅ SUCCESS: InstructionRef attached to DealId', verify.DealId);
      process.exit(0);
    } else {
      console.error('❌ Verification failed: Deal not updated with InstructionRef');
      process.exit(4);
    }
  } catch (err) {
    console.error('E2E script error:', err && (err.message || err));
    process.exit(10);
  }
})();
