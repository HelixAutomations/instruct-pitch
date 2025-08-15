const { getDealByProspectId, getDealByPasscode, getDealByPasscodeIncludingLinked } = require('./instructionDb');

async function test() {
  try {
    console.log('Testing getDealByProspectId(59914):');
    const dealByProspectId = await getDealByProspectId(59914);
    console.log('Result:', dealByProspectId);
    
    console.log('\nTesting getDealByPasscode("59914"):');
    const dealByPasscode = await getDealByPasscode('59914');
    console.log('Result:', dealByPasscode);
    
    console.log('\nTesting getDealByPasscodeIncludingLinked("59914"):');
    const dealByPasscodeIncluding = await getDealByPasscodeIncludingLinked('59914');
    console.log('Result:', dealByPasscodeIncluding);
    
    console.log('\nTesting getDealByProspectId(27367):');
    const dealByCorrectProspectId = await getDealByProspectId(27367);
    console.log('Result:', dealByCorrectProspectId);
    
  } catch (err) {
    console.error('Error:', err.message);
  }
  
  process.exit(0);
}

test();
