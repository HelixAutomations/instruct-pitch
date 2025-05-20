require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const crypto = require('crypto');
const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');
const fs = require('fs');

const app = express();
app.use(express.json());

// Health probe support
app.head('/pitch/', (req, res) => {
  res.status(200).send();
});

// Setup Key Vault
const keyVaultName = 'helixlaw-instructions';
const keyVaultUri = `https://${keyVaultName}.vault.azure.net`;
const credential = new DefaultAzureCredential();
const secretClient = new SecretClient(keyVaultUri, credential);

// Cache secrets in memory
let cachedShaPhrase = null;
let cachedEpdqUser = null;
let cachedEpdqPassword = null;
let cachedFetchInstructionDataCode = null;

// Load all secrets on startup
(async () => {
  try {
    const [
      sha,
      user,
      pass,
      fetchInstructionDataCode,
    ] = await Promise.all([
      secretClient.getSecret('epdq-shaphrase'),
      secretClient.getSecret('epdq-userid'),
      secretClient.getSecret('epdq-password'),
      secretClient.getSecret('fetchInstructionData-code'),
    ]);
    cachedShaPhrase = sha.value ?? '';
    cachedEpdqUser = user.value ?? '';
    cachedEpdqPassword = pass.value ?? '';
    cachedFetchInstructionDataCode = fetchInstructionDataCode.value ?? '';
    console.log('✅ All secrets loaded from Key Vault');
  } catch (err) {
    console.error('❌ Failed to load secrets from Key Vault:', err.message);
    process.exit(1);
  }
})();

// SHASIGN generation
app.post('/pitch/get-shasign', (req, res) => {
  console.log('✅ Server received request for /pitch/get-shasign');
  try {
    if (!cachedShaPhrase) throw new Error('SHA phrase not loaded');
    const params = req.body;
    if (!params || typeof params !== 'object') {
      throw new Error('Request body must be a valid JSON object');
    }
    const sorted = Object.keys(params)
      .sort()
      .reduce((acc, key) => acc + `${key}=${params[key]}${cachedShaPhrase}`, '');

    const shasign = crypto.createHash('sha256').update(sorted).digest('hex').toUpperCase();
    res.json({ shasign });
  } catch (err) {
    console.error('❌ Failed to compute SHASIGN:', err.message);
    res.status(500).json({ error: 'Failed to compute SHASIGN', detail: err.message });
  }
});

// DirectLink confirm-payment
app.post('/pitch/confirm-payment', async (req, res) => {
  const { aliasId, orderId } = req.body;
  console.log('➡️ Received confirm-payment request:', { aliasId, orderId });

  if (!aliasId || !orderId) {
    console.error('❌ Missing aliasId or orderId');
    return res.status(400).json({ error: 'Missing aliasId or orderId' });
  }

  try {
    const params = {
      PSPID: 'epdq1717240',
      USERID: cachedEpdqUser,
      PSWD: cachedEpdqPassword,
      ORDERID: orderId,
      ALIAS: aliasId,
      AMOUNT: '1000',
      CURRENCY: 'GBP',
      OPERATION: 'SAL',
      ALIASUSAGE: 'One-off Helix payment'
    };

    const sortedKeys = Object.keys(params).sort();
    const shaInput = sortedKeys.map(k => `${k}=${params[k]}${cachedShaPhrase}`).join('');
    const shasign = crypto.createHash('sha256').update(shaInput).digest('hex').toUpperCase();
    const postData = new URLSearchParams({ ...params, SHASIGN: shasign });

    console.log('📦 Sending DirectLink request with:', {
      endpoint: 'https://mdepayments.epdq.co.uk/ncol/test/orderdirect.asp',
      payload: postData.toString()
    });

    const result = await axios.post(
      'https://mdepayments.epdq.co.uk/ncol/test/orderdirect.asp',
      postData.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    console.log('✅ DirectLink response:', result.data);
    res.json({ success: true, result: result.data });
  } catch (err) {
    console.error('❌ DirectLink call failed:', err.message);
    res.status(500).json({ error: 'Payment request failed', detail: err.message });
  }
});

// Internal API route: fetchInstructionData (Server-side only)
app.get('/api/internal/fetch-instruction-data', async (req, res) => {
  const cid = req.query.cid;
  if (!cid) {
    return res.status(400).json({ ok: false, error: 'Missing cid' });
  }

  // Use secret for Azure Function code
  const functionUrl = 'https://legacy-fetch-v2.azurewebsites.net/api/fetchInstructionData';
  const functionCode = cachedFetchInstructionDataCode; // <-- from your vault!
  if (!functionCode) {
    console.error('[server] ❌ fetchInstructionData-code not loaded');
    return res.status(500).json({ ok: false, error: 'Server not ready' });
  }
  const url = `${functionUrl}?cid=${encodeURIComponent(cid)}&code=${functionCode}`;

  try {
    console.log(`[server] Calling Azure Function with cid=${cid}`);
    const response = await axios.get(url, { timeout: 10000 }); // the correct URL with code!
    console.log(`[server] ✅ Got instruction data:`, response.data);

    // Do NOT send data to client
    res.json({ ok: true }); // Always JSON
  } catch (e) {
    console.error('[server] ❌ Azure Function call failed:', e.message);
    res.status(500).json({ ok: false }); // Always JSON
  }
});

// Optional callbacks
app.get('/payment-success', (req, res) => {
  res.send('✅ Payment success callback');
});
app.get('/payment-error', (req, res) => {
  res.send('❌ Payment error callback');
});

// Redirect root to /pitch
app.get('/', (req, res) => {
  res.redirect('/pitch');
});

// ────────────────────────────────────────────────────────────────────────────────
//  Static assets (JS, CSS, images) — NO automatic index.html fallback
// ────────────────────────────────────────────────────────────────────────────────
app.use(
  '/pitch',
  express.static(path.join(__dirname, 'client/dist'), { index: false })
);

// ────────────────────────────────────────────────────────────────────────────────
//  React page with optional SSR pre-fill
//  Matches anything under /pitch that
//    • starts with "/pitch"
//    • DOES NOT contain a dot after that (so it ignores *.js, *.css, etc.)
// ────────────────────────────────────────────────────────────────────────────────
app.get(/^\/pitch(?!\/.*\.).*$/, async (req, res) => {
  console.log('[HANDLER CALLED] Query:', req.query);

  const pid = req.query.pid;
  let prefillData = null;

  if (pid && cachedFetchInstructionDataCode) {
    try {
      const url =
        `https://legacy-fetch-v2.azurewebsites.net/api/fetchInstructionData` +
        `?cid=${encodeURIComponent(pid)}&code=${cachedFetchInstructionDataCode}`;
      console.log('[server] About to fetch from Azure Function:', url);

      const { data } = await axios.get(url, { timeout: 8_000 });
      prefillData = data;
      console.log('[server] ✅ Prefill data loaded:', prefillData);
    } catch (err) {
      console.error('[server] ❌ ERROR fetching from Azure Function:', err);
    }
  } else if (pid) {
    console.warn('[server] ⚠️ fetchInstructionDataCode not loaded or empty');
  }

  // Always return *your* index.html (never the express.static fallback)
  let html;
  try {
    html = fs.readFileSync(
      path.join(__dirname, 'client/dist', 'index.html'),
      'utf8'
    );
  } catch (err) {
    console.error('[server] ❌ Failed to read index.html:', err);
    return res.status(500).send('Could not load client.');
  }

  if (prefillData && (prefillData.First_Name || prefillData.Last_Name)) {
    const script = `<script>window.helixPrefillData = ${JSON.stringify(
      prefillData
    )};</script>`;
    html = html.replace('</head>', `${script}\n</head>`);
    console.log('[server] 📝 Injected window.helixPrefillData into HTML!');
  }

  res.send(html);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend server is running on port ${PORT}`);
});
