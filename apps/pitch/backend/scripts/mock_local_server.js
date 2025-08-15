/**
 * Mock local server for apps/pitch during development and testing.
 *
 * Purpose:
 * - Serve the built client at /pitch and inject mock prefill/passcode data
 *   (window.helixPrefillData, window.helixOriginalPasscode, window.helixCid)
 * - Provide a simple /api/generate-instruction-ref endpoint using in-memory mock data
 *
 * Recent edits (2025-08-14):
 * - Fixed distDir path to point at the real client dist directory.
 * - Added explicit handling for /pitch/assets/* to ensure JS/CSS are served
 *   directly (avoids returning index.html for asset requests).
 * - Added request logging and startup diagnostics to help debug 404s and path issues.
 *
 * How to run:
 *   cd apps/pitch/backend/scripts
 *   node mock_local_server.js
 *
 * Notes:
 * - The mock server expects the client build at apps/pitch/client/dist.
 * - The Vite dev server (localhost:5173) does not inject passcode; use this mock
 *   server (port 4000) to test server-side injection flows.
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// Log incoming requests for debugging (helps diagnose why static assets may 404)
app.use((req, res, next) => {
  try {
    console.log('[mock] ', new Date().toISOString(), req.method, req.path);
  } catch (e) { }
  next();
});

// In-memory mock deals (imitates Deals table). Status not 'CLOSED' are valid.
const mockDeals = [
  { ProspectId: '12345', Passcode: '87402', Status: 'OPEN', Amount: 1200, ServiceDescription: 'Advice' },
  { ProspectId: '54321', Passcode: '99999', Status: 'CLOSED', Amount: 800, ServiceDescription: 'Litigation' },
  // Added mapping for passcode 59914 → ProspectId 27367 (zero amount to exercise documents step logic)
  { ProspectId: '27367', Passcode: '59914', Status: 'OPEN', Amount: 0, ServiceDescription: 'Consultation' }
];

// Mock instructions (for HLX-... prefill)
// Include PaymentAmount/Product so the client treats this as a deal and
// reveals the Pay and Upload steps in the UI during local testing.
const mockInstructions = {
  'HLX-12345-87402': {
    FirstName: 'Alice',
    LastName: 'Smith',
    Email: 'alice@example.com',
    Phone: '0123456789',
    PaymentAmount: 1200,
    PaymentProduct: 'Advice',
    WorkType: 'Advice'
  }
};

// scripts is at apps/pitch/backend/scripts; client dist is at apps/pitch/client/dist
const distDir = path.join(__dirname, '..', '..', 'client', 'dist');
const distIndex = path.join(distDir, 'index.html');
let baseHtml = '<!doctype html><html><head></head><body><div id="root"></div></body></html>';
if (fs.existsSync(distIndex)) {
  try { baseHtml = fs.readFileSync(distIndex, 'utf8'); } catch (e) { }
}

// Serve static assets from the built client so /pitch/assets/* and
// /pitch/favicon.svg are available when testing the mock server.
if (fs.existsSync(distDir)) {
  app.use('/pitch/assets', express.static(path.join(distDir, 'assets')));
  // serve favicon at the expected path
  const faviconPath = path.join(distDir, 'favicon.svg');
  if (fs.existsSync(faviconPath)) {
    app.get('/pitch/favicon.svg', (req, res) => res.sendFile(faviconPath));
  }
}

// Startup diagnostics: log dist directory and whether expected asset file exists
try {
  console.log('[mock] distDir =', distDir, 'exists=', fs.existsSync(distDir));
  const checkFile = path.join(distDir, 'assets', 'index-KaFbzlFk.js');
  console.log('[mock] check asset index-KaFbzlFk.js exists=', fs.existsSync(checkFile), '->', checkFile);
} catch (e) { console.log('[mock] diag err', e && e.message); }

// Explicitly serve assets to ensure these requests never fall through to the
// /pitch catch-all route (which would return index.html). This avoids JS/CSS
// requests being answered with the HTML page.
app.get('/pitch/assets/*', (req, res, next) => {
  try {
    const rel = req.path.replace('/pitch/assets/', '');
    const assetPath = path.join(distDir, 'assets', rel);
    if (fs.existsSync(assetPath)) return res.sendFile(assetPath);
  } catch (e) {
    // fall through to next which will eventually 404
  }
  next();
});

function injectPrefill(html, data) {
  if (!data || Object.keys(data).length === 0) return html;
  const safe = JSON.stringify(data).replace(/<\/script/g, '<\\/script');
  const script = `<script>window.helixPrefillData = ${safe};</script>`;
  return html.replace('</head>', `${script}\n</head>`);
}

function injectErrorReporter(html) {
  // lightweight in-page error reporter that posts errors back to the mock server
  const reporter = `
  <script>
    (function(){
      function send(payload){
        try{navigator.sendBeacon && navigator.sendBeacon('/__client_error', JSON.stringify(payload));
        }catch(e){
          try{fetch('/__client_error',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});}catch(e){}
        }
      }
      window.addEventListener('error', function(ev){
        send({type:'error', message:ev.message, filename:ev.filename, lineno:ev.lineno, colno:ev.colno, error: (ev.error && ev.error.stack) ? ev.error.stack : null, userAgent:navigator.userAgent});
      });
      window.addEventListener('unhandledrejection', function(ev){
        send({type:'unhandledrejection', reason: (ev && ev.reason && ev.reason.stack) ? ev.reason.stack : (ev && ev.reason) || String(ev), userAgent:navigator.userAgent});
      });
      // also expose a manual hook
      window.__reportClientError = function(o){ send(Object.assign({type:'manual'}, o || {})); };
    })();
  </script>`;
  return html.replace('</head>', `${reporter}\n</head>`);
}

app.get(['/pitch', '/pitch/:code', '/pitch/:code/*'], (req, res, next) => {
  const code = req.params.code;
  let html = baseHtml;
  let resolvedProspectId = null;
  let originalPasscode = code; // value to inject as helixOriginalPasscode

  // If this request is for static assets or favicon, let the static middleware handle it.
  if (req.path.startsWith('/pitch/assets') || req.path === '/pitch/favicon.svg') {
    // Attempt to serve the asset directly from dist if it exists as a fallback.
    try {
      if (req.path.startsWith('/pitch/assets/')) {
        const rel = req.path.replace('/pitch/assets/', '');
        const assetPath = path.join(distDir, 'assets', rel);
        if (fs.existsSync(assetPath)) return res.sendFile(assetPath);
      }
      if (req.path === '/pitch/favicon.svg') {
        const faviconPath = path.join(distDir, 'favicon.svg');
        if (fs.existsSync(faviconPath)) return res.sendFile(faviconPath);
      }
    } catch (e) {
      // ignore and fall through to route handling
    }
    return next();
  }

  if (code) {
    if (/^HLX-\d+-\d+$/i.test(code)) {
      const record = mockInstructions[code];
      if (record) {
        const prefill = {
          First_Name: record.FirstName || '',
          Last_Name: record.LastName || '',
          Email: record.Email || '',
          Phone_Number: record.Phone || ''
        };
        html = injectPrefill(html, prefill);
      }
    } else {
      // First, treat the code as a ProspectId (client id) and resolve its deal
      const byProspect = mockDeals.find(d => d.ProspectId === String(code) && String(d.Status).toUpperCase() !== 'CLOSED');
      if (byProspect) {
        // We found a deal by ProspectId — set cid and inject its passcode
        resolvedProspectId = String(byProspect.ProspectId);
        originalPasscode = byProspect.Passcode;
        const simulated = { First_Name: 'Prefilled', Last_Name: 'FromDeal', Email: 'deal@example.com' };
        html = injectPrefill(html, simulated);
      } else {
        // Otherwise, resolve prospect id by passcode excluding CLOSED deals
        const deal = mockDeals.find(d => d.Passcode === code && String(d.Status).toUpperCase() !== 'CLOSED');
        if (deal && deal.ProspectId) resolvedProspectId = String(deal.ProspectId);
        // simulate fetchInstructionData prefill when resolvedProspectId
        if (resolvedProspectId) {
          const simulated = { First_Name: 'Prefilled', Last_Name: 'FromDeal', Email: 'deal@example.com' };
          html = injectPrefill(html, simulated);
        }
      }
    }
  }

  const safeOriginal = JSON.stringify(originalPasscode);
  const safeCid = JSON.stringify(resolvedProspectId || '00000');
  // Ensure the in-page error reporter is injected so client-side errors
  // and a small server-side beacon can be received at /__client_error.
  html = injectErrorReporter(html);
  // Inject helix vars and immediately call the reporter to signal the
  // mock server that the HTML was delivered to a browser.
  const injectScript = `<script>window.helixOriginalPasscode = ${safeOriginal}; window.helixCid = ${safeCid}; try{ if(typeof window.__reportClientError==='function') window.__reportClientError({message:'page-served-by-mock', path: location.pathname}); }catch(e){};</script>`;
  html = html.replace('</head>', `${injectScript}\n</head>`);
  res.send(html);
});

app.get('/api/generate-instruction-ref', (req, res) => {
  const cid = req.query.cid;
  const passcode = req.query.passcode;
  if (!cid || !passcode) return res.status(400).json({ error: 'Missing cid or passcode' });

  const deal = mockDeals.find(d => String(d.ProspectId) === String(cid) && d.Passcode === passcode && String(d.Status).toUpperCase() !== 'CLOSED');
  if (!deal) return res.status(404).json({ error: 'Invalid combination' });
  const ref = `HLX-${cid}-${passcode}`;
  res.json({ instructionRef: ref });
});

// Minimal mock of SHASIGN generation so the client can compute signatures
// during local testing. Uses a fixed phrase so tests are deterministic.
app.post('/pitch/get-shasign', (req, res) => {
  try {
    const params = req.body || {};
    // Simple deterministic mock: uppercase keys, sort, concat k=v+PHRASE
    const PHRASE = 'MOCK_SHA_PHRASE';
    const toHash = Object.keys(params)
      .map(k => k.toUpperCase())
      .sort()
      .map(k => `${k}=${params[k]}${PHRASE}`)
      .join('');
    const crypto = require('crypto');
    const shasign = crypto.createHash('sha256').update(toHash).digest('hex').toUpperCase();
    return res.json({ shasign });
  } catch (err) {
    console.error('[mock] /pitch/get-shasign error', err && err.message);
    return res.status(500).json({ error: 'mock error' });
  }
});

// Simple in-memory instruction store to satisfy client GET/POST calls
const mockDocuments = {};

app.get('/api/instruction', (req, res) => {
  const ref = req.query.instructionRef;
  if (!ref) return res.status(400).json({ error: 'Missing instructionRef' });
  const record = mockInstructions[ref] || null;
  if (!record) return res.status(404).json({ error: 'Instruction not found' });
  return res.json(record);
});

app.post('/api/instruction', (req, res) => {
  const body = req.body || {};
  const ref = body.instructionRef || body.InstructionRef;
  if (!ref) return res.status(400).json({ error: 'Missing instructionRef' });
  // Merge and store for subsequent GETs
  mockInstructions[ref] = { ...(mockInstructions[ref] || {}), ...body };
  return res.json(mockInstructions[ref]);
});

// ---------------------------------------------------------------------------
// Added mock implementation of /api/getDealByPasscodeIncludingLinked to
// support passcode-only URLs (e.g. /pitch/59914) in dev when using the mock
// server instead of the full backend. Mirrors the real endpoint shape enough
// for the client logic in App.tsx.
app.get('/api/getDealByPasscodeIncludingLinked', (req, res) => {
  const { passcode } = req.query;
  if (!passcode) return res.status(400).json({ error: 'Passcode is required' });
  const deal = mockDeals.find(d => String(d.Passcode) === String(passcode) && String(d.Status).toUpperCase() !== 'CLOSED');
  if (!deal) return res.status(404).json({ error: 'Deal not found' });
  // Provide minimal fields the frontend expects; spread to allow future additions.
  return res.json({ ...deal });
});

// Mock of internal fetch-instruction-data used by HomePage prefill hook.
// The real backend calls an Azure Function with a code; here we simply
// return deterministic sample data keyed by cid.
app.get('/api/internal/fetch-instruction-data', (req, res) => {
  const { cid } = req.query;
  if (!cid) return res.status(400).json({ ok: false, error: 'Missing cid' });
  // Attempt to resolve using mockDeals so the names vary per test client.
  const deal = mockDeals.find(d => String(d.ProspectId) === String(cid));
  const seed = deal ? deal.ProspectId : '00000';
  const sample = {
    First_Name: deal ? 'Client' : 'Sample',
    Last_Name: deal ? `#${seed}` : 'User',
    Email: `client${seed}@example.com`,
    Phone_Number: '07123456789',
    Point_of_Contact: 'Helix Team'
  };
  return res.json(sample);
});

// Documents endpoints for local testing
app.get('/api/instruction/:ref/documents', (req, res) => {
  const ref = req.params.ref;
  const docs = mockDocuments[ref] || [];
  return res.json(docs);
});

// Allow adding a mock document (useful for testing the Documents step)
app.post('/api/instruction/:ref/documents', (req, res) => {
  const ref = req.params.ref;
  const { fileName, blobUrl } = req.body || {};
  if (!fileName || !blobUrl) return res.status(400).json({ error: 'Missing fileName or blobUrl' });
  mockDocuments[ref] = mockDocuments[ref] || [];
  mockDocuments[ref].push({ FileName: fileName, BlobUrl: blobUrl });
  return res.json({ ok: true, documents: mockDocuments[ref] });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Mock server listening on ${PORT}`));

// In-memory client error store (populated by the injected reporter)
const clientErrors = [];

// Accept text bodies (sendBeacon often uses text/plain) and JSON
app.post('/__client_error', express.text({ type: '*/*' }), (req, res) => {
  try {
    let body = {};
    if (req.body) {
      try {
        body = JSON.parse(req.body);
      } catch (e) {
        body = { raw: String(req.body) };
      }
    }
    body.timestamp = new Date().toISOString();
    clientErrors.push(body);
  } catch (e) { console.error('[mock] error storing client error', e && e.message); }
  res.json({ ok: true });
});

app.get('/__client_errors', (req, res) => {
  res.json(clientErrors);
});
