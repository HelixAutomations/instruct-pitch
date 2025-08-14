// Production-like simulation for SSR injection and generate-instruction-ref
// Usage: node scripts/simulate_production_flow.js
const fs = require('fs');
const path = require('path');

function injectBeforeHead(html, snippet) {
  return html.replace('</head>', `${snippet}\n</head>`);
}

const distIndex = path.join(__dirname, '..', 'client', 'dist', 'index.html');
let baseHtml = '<!doctype html><html><head></head><body><div id="root"></div></body></html>';
if (fs.existsSync(distIndex)) {
  try { baseHtml = fs.readFileSync(distIndex, 'utf8'); } catch (e) { /* ignore */ }
}

const scenarios = [
  {
    name: 'Resolved prospect id (deal exists)',
    code: '87402',
    resolvedProspectId: '12345',
    prefill: { First_Name: 'Alice', Last_Name: 'Smith', Email: 'alice@example.com' }
  },
  {
    name: 'No matching deal (new flow)',
    code: '87402',
    resolvedProspectId: null,
    prefill: null
  }
];

console.log('Simulating production-like SSR injection and /api/generate-instruction-ref behavior');

scenarios.forEach(s => {
  console.log('\n--- Scenario:', s.name, '---');
  let html = baseHtml;

  if (s.prefill && Object.keys(s.prefill).length) {
    const safe = JSON.stringify(s.prefill).replace(/<\/script/gi, '<\\/script');
    html = injectBeforeHead(html, `<script>window.helixPrefillData = ${safe};</script>`);
  }

  if (s.resolvedProspectId) {
    const safeResolved = JSON.stringify(s.resolvedProspectId);
    html = injectBeforeHead(html, `<script>window.helixResolvedProspectId = ${safeResolved};</script>`);
  }

  const safeOriginal = JSON.stringify(s.code);
  const safeCid = JSON.stringify(s.resolvedProspectId || '00000');
  html = injectBeforeHead(html, `<script>window.helixOriginalPasscode = ${safeOriginal}; window.helixCid = ${safeCid};</script>`);

  // Print the injected head snippet (trim to reasonable length)
  const headSnippetMatch = html.match(/<head>[\s\S]*<\/head>/i);
  const headSnippet = headSnippetMatch ? headSnippetMatch[0] : '(head not found)';
  console.log('\nInjected head snippet:\n');
  console.log(headSnippet.split('\n').slice(0, 20).join('\n'));

  // What the client will call
  const cidForClient = s.resolvedProspectId || '00000';
  const apiCall = `/api/generate-instruction-ref?cid=${encodeURIComponent(cidForClient)}&passcode=${encodeURIComponent(s.code)}`;
  console.log('\nClient will attempt to call:', apiCall);

  // Simulate API behavior: if resolvedProspectId present -> success; otherwise 404
  if (s.resolvedProspectId) {
    const ref = `HLX-${s.resolvedProspectId}-${Math.floor(1000 + Math.random() * 9000)}`;
    console.log('\nSimulated API response: 200 { instructionRef:', ref, '}');
    console.log('Client should navigate to: /' + s.resolvedProspectId);
  } else {
    console.log('\nSimulated API response: 404 { error: "Invalid combination" }');
    console.log('Client should treat this as new flow (no auto-navigation).');
  }
});

console.log('\nSimulation complete.');
