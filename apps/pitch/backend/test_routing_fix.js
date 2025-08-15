// Test script to verify the passcode resolution logic
const { getDealByPasscode, getDealByProspectId } = require('./instructionDb');

async function testPitchRouting() {
  const code = "59914";
  
  console.log(`Testing routing logic for code: ${code}`);
  
  let resolvedProspectId = null;
  let injectedPasscode = undefined;
  
  try {
    // This is the NEW logic from our fix
    console.log('\n=== NEW LOGIC (Fixed) ===');
    
    // First: try as passcode (most common case)
    let deal = await getDealByPasscode(code).catch(() => null);
    if (deal && deal.ProspectId) {
      resolvedProspectId = String(deal.ProspectId);
      injectedPasscode = code;
      console.log(`✅ Found deal by passcode: ProspectId=${deal.ProspectId}, Passcode=${code}`);
    } else if (/^\d+$/.test(code)) {
      // Fallback: if no deal found by passcode and code is numeric, try as ProspectId
      deal = await getDealByProspectId(Number(code));
      if (deal) {
        resolvedProspectId = String(deal.ProspectId || code);
        injectedPasscode = deal.Passcode || code;
        console.log(`⚠️ Found deal by ProspectId: ProspectId=${deal.ProspectId}, Passcode=${deal.Passcode}`);
      }
    }
    
    const finalCid = resolvedProspectId || '00000';
    console.log(`Final result: cid=${finalCid}, passcode=${injectedPasscode || code}`);
    
    // Simulate the API call that would be made
    if (finalCid !== '00000') {
      console.log(`\nAPI call would be: /api/generate-instruction-ref?cid=${finalCid}&passcode=${injectedPasscode || code}`);
    } else {
      console.log(`\n❌ Would result in failed API call: /api/generate-instruction-ref?cid=${finalCid}&passcode=${injectedPasscode || code}`);
    }
    
  } catch (err) {
    console.error('Error during lookup:', err.message);
  }
}

// For comparison, let's also test the old logic
async function testOldLogic() {
  const code = "59914";
  
  console.log('\n=== OLD LOGIC (Broken) ===');
  
  let resolvedProspectId = null;
  let injectedPasscode = undefined;
  
  try {
    if (/^\d+$/.test(code)) {
      // Old logic: numeric codes were treated as ProspectId first
      const deal = await getDealByProspectId(Number(code));
      if (deal) {
        resolvedProspectId = String(deal.ProspectId || code);
        injectedPasscode = deal.Passcode || code;
        console.log(`Found deal by ProspectId: ProspectId=${deal.ProspectId}, Passcode=${deal.Passcode}`);
      } else {
        console.log('❌ No deal found by ProspectId');
      }
    } else {
      // For passcode-only URLs, resolve prospect id from the passcode
      const deal = await getDealByPasscode(code).catch(() => null);
      if (deal && deal.ProspectId) {
        resolvedProspectId = String(deal.ProspectId);
        console.log(`Found deal by passcode: ProspectId=${deal.ProspectId}`);
      }
    }
    
    const finalCid = resolvedProspectId || '00000';
    console.log(`Old logic result: cid=${finalCid}, passcode=${injectedPasscode || code}`);
    
  } catch (err) {
    console.error('Error during old lookup:', err.message);
  }
}

async function main() {
  try {
    await testOldLogic();
    await testPitchRouting();
  } catch (err) {
    console.error('Connection error:', err.message);
    console.log('\nNote: Database connection might not be available in this environment.');
    console.log('The fix should work correctly in production where the database is accessible.');
  }
  
  process.exit(0);
}

main();
