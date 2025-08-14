const { generateInstructionRef } = require('../dist/generateInstructionRef');

const tests = [
  { cid: '12345', passcode: '87402' },
  { cid: '00000', passcode: '87402' },
];

tests.forEach(t => {
  const ref = generateInstructionRef(String(t.cid), String(t.passcode));
  console.log(`cid=${t.cid} passcode=${t.passcode} => ${ref}`);
});
