require('dotenv').config();
// console.log('AZURE_STORAGE_ACCOUNT:', process.env.AZURE_STORAGE_ACCOUNT);
// console.log('UPLOAD_CONTAINER:', process.env.UPLOAD_CONTAINER);
const express = require('express');
const axios = require('axios');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { generateInstructionRef } = require('./dist/generateInstructionRef');
const uploadRouter = require('./upload');
const sql = require('mssql');
const { getSqlPool } = require('./sqlClient');
const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');
const { getInstruction, upsertInstruction, markCompleted, getLatestDeal } = require('./instructionDb');
const { normalizeInstruction } = require('./utilities/normalize');

const app = express();
app.use(express.json());
app.use('/api', uploadRouter);

// ─── Block direct access to server files ───────────────────────────────
app.all('/server.js', (_req, res) => {
  res.status(404).send('Not found');
});
app.all('/favicon.ico', (_req, res) => {
  res.status(404).send('Not found');
});


// ─── Health probe support ───────────────────────────────────────────────
app.head('/pitch/', (_req, res) => res.sendStatus(200));
app.get('/api/generate-instruction-ref', (req, res) => {
  const cid = req.query.cid;
  if (!cid) return res.status(400).json({ error: 'Missing cid' });
  const ref = generateInstructionRef(String(cid));
  res.json({ instructionRef: ref });
});

// ─── Key Vault setup ──────────────────────────────────────────────────
const keyVaultName = process.env.KEY_VAULT_NAME;
if (!keyVaultName) {
  console.warn('⚠️  KEY_VAULT_NAME not set');
}
const keyVaultUri  = `https://${keyVaultName}.vault.azure.net`;
const credential   = new DefaultAzureCredential();
const secretClient = new SecretClient(keyVaultUri, credential);

let cachedShaPhrase, cachedEpdqUser, cachedEpdqPassword, cachedFetchInstructionDataCode, cachedDbPassword;
(async () => {
  try {
    const [sha, user, pass, fetchCode, dbPass] = await Promise.all([
      secretClient.getSecret('epdq-shaphrase'),
      secretClient.getSecret('epdq-userid'),
      secretClient.getSecret('epdq-password'),
      secretClient.getSecret('fetchInstructionData-code'),
      secretClient.getSecret(process.env.DB_PASSWORD_SECRET),
    ]);
    cachedShaPhrase               = sha.value;
    cachedEpdqUser                = user.value;
    cachedEpdqPassword            = pass.value;
    cachedFetchInstructionDataCode = fetchCode.value;
    cachedDbPassword              = dbPass.value;
    process.env.DB_PASSWORD = cachedDbPassword;
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
    const pool = await getSqlPool();
    await pool.request()
      .input('InstructionRef', sql.NVarChar, orderId)
      .query("UPDATE Instructions SET PaymentResult = 'Confirmed', PaymentTimestamp = SYSDATETIME() WHERE InstructionRef = @InstructionRef");

    res.json({ success: true, result: result.data });
  } catch (err) {
    console.error('❌ /pitch/confirm-payment error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Instruction data upsert ──────────────────────────────────────────
app.get('/api/instruction', async (req, res) => {
  const ref = req.query.instructionRef;
  if (!ref) return res.status(400).json({ error: 'Missing instructionRef' });
  try {
    const data = await getInstruction(ref);
    res.json(data || null);
  } catch (err) {
    console.error('❌ /api/instruction GET error:', err);
    res.status(500).json({ error: 'Failed to fetch instruction' });
  }
});

app.post('/api/instruction', async (req, res) => {
  const { instructionRef, stage, ...rest } = req.body;
  if (!instructionRef) {
    return res.status(400).json({ error: 'Missing instructionRef' });
  }

  try {
    const existing = (await getInstruction(instructionRef)) || {};
    if (existing.stage === 'completed') {
      return res.json({ completed: true });
    }

    const normalized = normalizeInstruction(rest);
    let merged = { ...existing, ...normalized, stage: stage || existing.stage || 'in_progress' };

    if (!existing.InstructionRef) {
      const match = /HLX-(\d+)-/.exec(instructionRef);
      if (match) {
        const deal = await getLatestDeal(Number(match[1]));
        if (deal) {
          merged.paymentAmount = merged.paymentAmount ?? deal.Amount;
          merged.paymentProduct = merged.paymentProduct ?? deal.ServiceDescription;
          merged.workType = merged.workType ?? deal.AreaOfWork;
        }
      }
      merged.internalStatus = merged.internalStatus || 'pitch';
    }

    const sanitized = { ...normalizeInstruction(merged), stage: merged.stage };
    const record = await upsertInstruction(instructionRef, sanitized);
    res.json(record);
  } catch (err) {
    console.error('❌ /api/instruction POST error:', err);
    res.status(500).json({ error: 'Failed to save instruction' });
  }
});

app.post('/api/instruction/complete', async (req, res) => {
  const { instructionRef } = req.body;
  if (!instructionRef) return res.status(400).json({ error: 'Missing instructionRef' });

  try {
    const existing = await getInstruction(instructionRef);
    if (existing && existing.stage === 'completed') {
      return res.json({ completed: true });
    }

    const record = await markCompleted(instructionRef);
    res.json(record);
  } catch (err) {
    console.error('❌ /api/instruction/complete error:', err);
    res.status(500).json({ error: 'Failed to update instruction' });
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
    // Confirm successful fetch without logging the full payload
    console.log('Fetched instruction data');
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
app.get(['/pitch', '/pitch/:cid', '/pitch/:cid/*'], async (req, res) => {
  try {
    let html = fs.readFileSync(path.join(distPath, 'index.html'), 'utf8');
    const cid = req.params.cid;
    if (cid && cachedFetchInstructionDataCode) {
      const fnUrl  = 'https://legacy-fetch-v2.azurewebsites.net/api/fetchInstructionData';
      const fnCode = cachedFetchInstructionDataCode;
      const url    = `${fnUrl}?cid=${encodeURIComponent(cid)}&code=${fnCode}`;
      const { data } = await axios.get(url, { timeout: 8_000 });
        if (data && Object.keys(data).length > 0) {
          // escape closing script tags so embedded JSON cannot break the page
          const safeData = JSON.stringify(data).replace(/<\/script/g, '<\\/script');
          const script   = `<script>window.helixPrefillData = ${safeData};</script>`;
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
app.listen(PORT, () => console.log(`🚀 Backend listening on ${PORT}`));
