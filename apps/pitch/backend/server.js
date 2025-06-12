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
const { getInstruction, upsertInstruction, markCompleted, getLatestDeal, updatePaymentStatus } = require('./instructionDb');
const { normalizeInstruction } = require('./utilities/normalize');

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}


const app = express();
app.set('trust proxy', true);
app.use(express.json());
app.use((req, _res, next) => {
  log('>>', req.method, req.originalUrl);
  if (Object.keys(req.query || {}).length) log('Query:', req.query);
  if (req.body && Object.keys(req.body).length) log('Body:', req.body);
  next();
});
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
    log('Generating SHASIGN with params:', params);
    const toHash = Object.keys(params)
      .map(k => k.toUpperCase()) // 👈 this line is essential
      .sort()
      .map(k => `${k}=${params[k]}${cachedShaPhrase}`)
      .join('');
    log('SHA input string:', toHash);
    const shasign = crypto.createHash('sha256').update(toHash).digest('hex').toUpperCase();
    log('SHASIGN:', shasign);
    res.json({ shasign });
  } catch (err) {
    console.error('❌ /pitch/get-shasign error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── DirectLink confirm-payment ────────────────────────────────────────
app.post('/pitch/confirm-payment', async (req, res) => {
  const { aliasId, orderId, amount, product, threeDS = {}, acceptUrl, exceptionUrl, declineUrl, shaSign } = req.body;
  if (!aliasId || !orderId) {
    return res.status(400).json({ error: 'Missing aliasId or orderId' });
  }
  try {
    log('Starting confirm-payment for order', orderId);
    const instruction = await getInstruction(orderId).catch(() => ({}));
    const params = {
      PSPID:     'epdq1717240',
      USERID:    cachedEpdqUser,
      PSWD:      cachedEpdqPassword,
      ORDERID:   orderId,
      ALIAS:     aliasId,
      CURRENCY:  'GBP',
      OPERATION: 'SAL',
      ALIASUSAGE: 'One-off Helix payment',
      FLAG3D:    'Y',
      ALIASOPERATION: 'BYPSP',
    };
    if (amount != null) {
      params.AMOUNT = String(Math.round(Number(amount) * 100));
    }
    if (instruction) {
      const name = [instruction.FirstName, instruction.LastName].filter(Boolean).join(' ');
      if (name) params.CN = name;
      if (instruction.Email) params.EMAIL = instruction.Email;
    }
    if (acceptUrl)    params.ACCEPTURL    = acceptUrl;
    if (exceptionUrl) params.EXCEPTIONURL = exceptionUrl;
    if (declineUrl)   params.DECLINEURL   = declineUrl;
    params.LANGUAGE = 'en_GB';
    params.browserAcceptHeader = req.headers['accept'] || '*/*';
    params.browserUserAgent = req.headers['user-agent'] || '';
    params.REMOTE_ADDR =
      (req.headers['x-forwarded-for'] ?? '').split(',')[0] ||
      req.socket.remoteAddress;
    Object.assign(params, threeDS);
    log('Payment params before upper-case:', params);

    // ePDQ requires all parameter names to be upper-case when computing the
    // SHA signature. The 3DS fields arrive in camelCase from the client so we
    // normalise them here before signing and sending the request.
    const upper = Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k.toUpperCase(), v])
    );

    log('Upper-case params:', upper);

    const shaInput = Object.keys(upper)
      .sort()
      .map(k => `${k}=${upper[k]}${cachedShaPhrase}`)
      .join('');
    log('SHA input:', shaInput);
    const shasign = crypto
      .createHash('sha256')
      .update(shaInput)
      .digest('hex')
      .toUpperCase();

    log('Computed SHASIGN:', shasign);

    const payload = new URLSearchParams({ ...upper, SHASIGN: shasign }).toString();

    log('Payload sent to ePDQ:', payload);
    const result = await axios.post(
      'https://payments.epdq.co.uk/ncol/prod/orderdirect.asp',
      payload,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const rawBody = typeof result.data === 'string' ? result.data.trim() : '';
    log('Raw response from ePDQ:', rawBody);
    let parsed = {};
    if (rawBody.startsWith('<')) {
      console.warn('⚠️  XML response from ePDQ:', rawBody.slice(0, 80));
      const attr = rawBody.match(/<ncresponse([^>]*)>/i);
      if (attr) {
        const re = /(\w+)="([^"]*)"/g;
        let m;
        while ((m = re.exec(attr[1])) !== null) {
          parsed[m[1]] = m[2];
        }
      }
      const htmlMatch = rawBody.match(/<HTML_ANSWER>([\s\S]*?)<\/HTML_ANSWER>/i);
      if (htmlMatch) parsed.HTML_ANSWER = htmlMatch[1];
    } else {
      rawBody
        .split(/\r?\n|&/)
        .forEach(p => {
          if (!p) return;
          const idx = p.indexOf('=');
          if (idx === -1) {
            parsed[p] = '';
          } else {
            const key = p.slice(0, idx);
            const val = p.slice(idx + 1);
            parsed[key] = val;
          }
        });
    }
    const status = parsed.STATUS || '';
    const success = status === '5' || status === '9';

    log('Parsed response:', parsed);
    log('Payment success:', success);

    if (status === '46' && parsed.HTML_ANSWER) {
      return res.json({ challenge: parsed.HTML_ANSWER, details: parsed });
    }

    if (success) {
      await updatePaymentStatus(
        orderId,
        'card',
        success,
        amount != null ? Number(amount) : null,
        product || null,
        aliasId,
        orderId,
        shaSign || shasign
      );
    }

    res.json({ success, details: parsed });
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
    log('Fetched instruction', ref, data);
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
    log('Existing record:', existing);    
    if (existing.stage === 'completed' && stage !== 're-visit') {
      return res.json({ completed: true });
    }

    const normalized = normalizeInstruction(rest);
    log('Normalized incoming data:', normalized);
    let merged = { ...existing, ...normalized, stage: stage || existing.stage || 'in_progress' };

    if (merged.paymentMethod === 'bank') {
      merged.paymentResult = 'verifying';
      merged.internalStatus = 'paid';
      merged.paymentTimestamp = new Date().toISOString();
    }

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
    log('Upserting instruction with:', sanitized);
    const record = await upsertInstruction(instructionRef, sanitized);
    log('Upsert result:', record);
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
    log('Complete instruction existing record:', existing);
    if (existing && existing.stage === 'completed') {
      return res.json({ completed: true });
    }

    const record = await markCompleted(instructionRef);

    log('Mark completed result:', record);

    res.json(record);
  } catch (err) {
    console.error('❌ /api/instruction/send-emails error:', err);
    res.status(500).json({ error: 'Failed to send emails' });
  }
});
app.post('/api/instruction/send-emails', async (req, res) => {
  const { instructionRef } = req.body;
  if (!instructionRef) return res.status(400).json({ error: 'Missing instructionRef' });

  try {
    const record = await getInstruction(instructionRef);
    log('Send emails for record:', record);
    if (!record) return res.status(404).json({ error: 'Instruction not found' });

    try {
      const {
        sendClientSuccessEmail,
        sendClientFailureEmail,
        sendFeeEarnerEmail,
        sendAccountsEmail,
      } = require('./email');

      if (record.PaymentMethod === 'bank') {
        await sendAccountsEmail(record);
      }

      await sendFeeEarnerEmail(record);

      if (record.PaymentResult === 'successful' || record.PaymentMethod === 'bank') {
        await sendClientSuccessEmail(record);
      } else {
        await sendClientFailureEmail(record);
      }
    } catch (emailErr) {
      console.error('❌ Failed to send notification emails:', emailErr);
      return res.status(500).json({ error: 'Email failure' });
    }

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
    const { data } = await axios.get(
      `${fnUrl}?cid=${encodeURIComponent(cid)}&code=${fnCode}`,
      {
        timeout: 10_000,
      }
    );
    // Confirm successful fetch without logging the full payload
    console.log('Fetched instruction data');
    res.json(data);
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
