require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');

const app = express();
app.use(express.json());

// ─── Health probe support ───────────────────────────────────────────────
app.head('/pitch/', (_req, res) => res.sendStatus(200));

// ─── Key Vault setup ──────────────────────────────────────────────────
const keyVaultName = 'helixlaw-instructions';
const keyVaultUri  = `https://${keyVaultName}.vault.azure.net`;
const credential   = new DefaultAzureCredential();
const secretClient = new SecretClient(keyVaultUri, credential);

let cachedShaPhrase, cachedEpdqUser, cachedEpdqPassword, cachedFetchInstructionDataCode;
(async () => {
  try {
    const [sha, user, pass, fetchCode] = await Promise.all([
      secretClient.getSecret('epdq-shaphrase'),
      secretClient.getSecret('epdq-userid'),
      secretClient.getSecret('epdq-password'),
      secretClient.getSecret('fetchInstructionData-code'),
    ]);
    cachedShaPhrase               = sha.value;
    cachedEpdqUser                = user.value;
    cachedEpdqPassword            = pass.value;
    cachedFetchInstructionDataCode = fetchCode.value;
    console.log('✅ All secrets loaded from Key Vault');
  } catch (err) {
    console.error('❌ Failed to load secrets:', err);
    process.exit(1);
  }
})();

// ─── SHASIGN generation ────────────────────────────────────────────────
app.post('/pitch/get-shasign', (req, res) => {
  try {
    if (!cachedShaPhrase) throw new Error('SHA phrase not loaded');
    const params = req.body;
    const toHash = Object.keys(params)
      .sort()
      .map(k => `${k}=${params[k]}${cachedShaPhrase}`)
      .join('');
    const shasign = crypto.createHash('sha256').update(toHash).digest('hex').toUpperCase();
    res.json({ shasign });
  } catch (err) {
    console.error('❌ /pitch/get-shasign error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── DirectLink confirm-payment ────────────────────────────────────────
app.post('/pitch/confirm-payment', async (req, res) => {
  const { aliasId, orderId } = req.body;
  if (!aliasId || !orderId) {
    return res.status(400).json({ error: 'Missing aliasId or orderId' });
  }
  try {
    const params = {
      PSPID:     'epdq1717240',
      USERID:    cachedEpdqUser,
      PSWD:      cachedEpdqPassword,
      ORDERID:   orderId,
      ALIAS:     aliasId,
      AMOUNT:    '1000',
      CURRENCY:  'GBP',
      OPERATION: 'SAL',
      ALIASUSAGE: 'One-off Helix payment',
    };
    const shaInput = Object.keys(params)
      .sort()
      .map(k => `${k}=${params[k]}${cachedShaPhrase}`)
      .join('');
    const shasign = crypto.createHash('sha256').update(shaInput).digest('hex').toUpperCase();
    const payload = new URLSearchParams({ ...params, SHASIGN: shasign }).toString();
    const result = await axios.post(
      'https://mdepayments.epdq.co.uk/ncol/test/orderdirect.asp',
      payload,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    res.json({ success: true, result: result.data });
  } catch (err) {
    console.error('❌ /pitch/confirm-payment error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Internal fetchInstructionData (server-only) ───────────────────────
app.get('/api/internal/fetch-instruction-data', async (req, res) => {
  const cid = req.query.cid;
  if (!cid) return res.status(400).json({ ok: false, error: 'Missing cid' });

  const fnUrl  = 'https://legacy-fetch-v2.azurewebsites.net/api/fetchInstructionData';
  const fnCode = cachedFetchInstructionDataCode;
  if (!fnCode) return res.status(500).json({ ok: false, error: 'Server not ready' });

  try {
    const { data } = await axios.get(`${fnUrl}?cid=${encodeURIComponent(cid)}&code=${fnCode}`, {
      timeout: 10_000,
    });
    console.log('✅ fetchInstructionData >>', data);
    res.json({ ok: true });
  } catch (err) {
    console.error('❌ fetchInstructionData error:', err);
    res.status(500).json({ ok: false });
  }
});

// ─── Optional callbacks ───────────────────────────────────────────────
app.get('/payment-success', (_req, res) => res.send('✅ Payment success callback'));
app.get('/payment-error',   (_req, res) => res.send('❌ Payment error callback'));

// ─── Redirect root to /pitch ──────────────────────────────────────────
app.get('/', (_req, res) => res.redirect('/pitch'));

// ─── Static & SPA routing ───────────────────────────────────────────────
const distPath = path.join(__dirname, 'client/dist');

// 1) serve all static files
app.use(express.static(distPath, { index: false }));
// 2) also under /pitch
app.use('/pitch', express.static(distPath, { index: false }));

// 3) payment-result route must serve index.html so React Router handles it
app.get('/payment/result', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// 4) catch-all for /pitch SSR + prefill injection
app.get(/^\/pitch(?!\/.*\.).*$/, async (req, res) => {
  try {
    let html = fs.readFileSync(path.join(distPath, 'index.html'), 'utf8');
    const pid = req.query.pid;
    if (pid && cachedFetchInstructionDataCode) {
      const fnUrl  = 'https://legacy-fetch-v2.azurewebsites.net/api/fetchInstructionData';
      const fnCode = cachedFetchInstructionDataCode;
      const url    = `${fnUrl}?cid=${encodeURIComponent(pid)}&code=${fnCode}`;
      const { data } = await axios.get(url, { timeout: 8_000 });
      if (data && Object.keys(data).length > 0) {
        const script = `<script>window.helixPrefillData = ${JSON.stringify(data)};</script>`;
        html = html.replace('</head>', `${script}\n</head>`);
      }
    }
    res.send(html);
  } catch (err) {
    console.error('❌ SSR /pitch catch-all error:', err);
    res.status(500).send('Could not load page');
  }
});

// ─── Start the server ───────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend server running on port ${PORT}`);
});
