const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '..', 'apps', 'pitch', 'backend', 'client', 'dist');
const indexPath = path.join(distPath, 'index.html');

function loadHtml() {
  try {
    return fs.readFileSync(indexPath, 'utf8');
  } catch (err) {
    return '<html><head><!-- HEAD --></head><body><div id="root"></div></body></html>';
  }
}

function injectPrefill(html, data) {
  if (!data || Object.keys(data).length === 0) return html;
  const safe = JSON.stringify(data).replace(/<\/script/g, '<\\/script');
  const script = `<script>window.helixPrefillData = ${safe};</script>`;
  return html.replace('</head>', `${script}\n</head>`);
}

function injectGlobals(html, originalPasscode, cid) {
  const safeOriginal = JSON.stringify(originalPasscode);
  const safeCid = JSON.stringify(cid);
  return html.replace('</head>', `<script>window.helixOriginalPasscode = ${safeOriginal}; window.helixCid = ${safeCid};</script></head>`);
}

function simulate(code, resolvedProspectId, prefillData) {
  console.log('--- SIMULATION for /pitch/' + code + ' ---');
  let html = loadHtml();

  // Prefill step: server uses resolvedProspectId if available, otherwise code
  const fetchCid = resolvedProspectId || code;
  if (prefillData) html = injectPrefill(html, prefillData);

  // Always inject original passcode and cid (resolvedProspectId or '00000')
  const cidToInject = resolvedProspectId || '00000';
  html = injectGlobals(html, code, cidToInject);

  // Show the snippet that would be injected
  const headSnippet = html.split('</head>')[0].slice(-500);
  console.log('Injected head snippet (truncated):\n', headSnippet);

  // Show the client-side call that the React app will make
  console.log('\nClient will call: GET /api/generate-instruction-ref?cid=' + cidToInject + '&passcode=' + encodeURIComponent(code));

  // Show expected server-side verification behaviour: getDealByPasscode(passcode, Number(cid))
  console.log('\nServer will verify by calling getDealByPasscode(passcode, cid)');
  console.log('  - If cid is "00000" the verification will almost certainly fail (no match)');
  console.log('  - If cid matches a ProspectId and a non-closed deal exists, it will return instructionRef');

  console.log('\n--- END ---\n');
}

// Scenario A: deal resolved (ProspectId found)
simulate('87402', '12345', { First_Name: 'Alice', Last_Name: 'Smith', Email: 'alice@example.com' });

// Scenario B: no deal found
simulate('87402', null, null);
