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
const { getInstruction, upsertInstruction, markCompleted, getLatestDeal, getDealByPasscode, getDealByPasscodeIncludingLinked, getDealByProspectId, getOrCreateInstructionRefForPasscode, updatePaymentStatus, attachInstructionRefToDeal, closeDeal, getDocumentsForInstruction } = require('./instructionDb');
const { normalizeInstruction } = require('./utilities/normalize');
const DEBUG_LOG = !process.env.DEBUG_LOG || /^1|true$/i.test(process.env.DEBUG_LOG);

// ─── Feature flag: temporary payment-disabled mode ─────────────────────────────
// Supports either DISABLE_PAYMENTS or PAYMENT_DISABLED for ops compatibility.
const paymentsOff = /^1|true|yes$/i.test(String(
  process.env.DISABLE_PAYMENTS || process.env.PAYMENT_DISABLED || ''
));

function log(...args) {
  if (!DEBUG_LOG) return;
  console.log(new Date().toISOString(), ...args);
}

function mask(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clone = { ...obj };
  if (clone.PSWD) clone.PSWD = '[REDACTED]';
  return clone;
}

function injectPrefill(html, data) {
  if (!data || Object.keys(data).length === 0) return html;
  const safe = JSON.stringify(data).replace(/<\/script/g, '<\\/script');
  const script = `<script>window.helixPrefillData = ${safe};</script>`;
  return html.replace('</head>', `${script}\n</head>`);
}


const app = express();
app.set('trust proxy', true);
app.use(express.json());
app.use((req, _res, next) => {
  log('>>', req.method, req.originalUrl);
  if (Object.keys(req.query || {}).length)
    log('Query keys:', Object.keys(req.query));
  if (req.body && Object.keys(req.body).length)
    log('Body keys:', Object.keys(req.body));
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
app.get('/api/generate-instruction-ref', async (req, res) => {
  const cid = req.query.cid;
  const passcode = req.query.passcode;
  if (!cid || !passcode) {
    return res.status(400).json({ error: 'Missing cid or passcode' });
  }
  try {
    // Use an inclusive lookup so the API works even if a Deal already
    // has an InstructionRef attached (read-only check). If an
    // InstructionRef already exists for the deal, return it rather
    // than generating a new one so we never double-generate/overwrite.
    const deal = await getDealByPasscodeIncludingLinked(String(passcode), Number(cid));
    if (!deal) return res.status(404).json({ error: 'Invalid combination' });
    // Some DB fields may be named with different casing depending on driver
    const existing = deal.InstructionRef || deal.instructionRef || null;
    if (existing) return res.json({ instructionRef: existing });

    // Persist the HLX ref if possible (creates only if missing)
    try {
      const persisted = await getOrCreateInstructionRefForPasscode(String(passcode), Number(cid));
      if (persisted) return res.json({ instructionRef: persisted });
    } catch (err) {
      console.warn('Could not persist instructionRef:', err && err.message);
    }

    // Fall back to generating the ref without persisting (should be rare)
    const ref = generateInstructionRef(String(cid), String(passcode));
    res.json({ instructionRef: ref });
  } catch (err) {
    console.error('❌ generate-instruction-ref error:', err);
    res.status(500).json({ error: 'Failed to generate reference' });
  }

});

// API endpoint for passcode lookup
app.get('/api/getDealByPasscodeIncludingLinked', async (req, res) => {
  try {
    const { passcode } = req.query;
    if (!passcode) {
      return res.status(400).json({ error: 'Passcode is required' });
    }
    
    const deal = await getDealByPasscodeIncludingLinked(String(passcode));
    if (deal) {
      res.json(deal);
    } else {
      res.status(404).json({ error: 'Deal not found' });
    }
  } catch (err) {
    console.error('❌ passcode lookup error:', err);
    res.status(500).json({ error: 'Lookup failed' });
  }
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
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 Backend listening on ${PORT}`));
  } catch (err) {
    console.error('❌ Failed to load secrets:', err);
    process.exit(1);
  }
})();

// ─── SHASIGN generation ────────────────────────────────────────────────
app.post('/pitch/get-shasign', (req, res) => {
  try {
    if (paymentsOff) {
      log('🛑 /pitch/get-shasign blocked: payments disabled');
      return res.status(503).json({ error: 'Payments are temporarily disabled' });
    }
    if (!cachedShaPhrase) throw new Error('SHA phrase not loaded');
    const params = req.body;
    log('Generating SHASIGN with params:', mask(params));
    const toHash = Object.keys(params)
      .map(k => k.toUpperCase()) // 👈 this line is essential
      .sort()
      .map(k => `${k}=${params[k]}${cachedShaPhrase}`)
      .join('');
    log('SHA input string length:', toHash.length);
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
  if (paymentsOff) {
    log('🛑 /pitch/confirm-payment blocked: payments disabled');
    return res.status(503).json({ error: 'Payments are temporarily disabled' });
  }
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
    log('Payment params before upper-case:', mask(params));

    // ePDQ requires all parameter names to be upper-case when computing the
    // SHA signature. The 3DS fields arrive in camelCase from the client so we
    // normalise them here before signing and sending the request.
    const upper = Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k.toUpperCase(), v])
    );

    log('Upper-case params:', mask(upper));

    const shaInput = Object.keys(upper)
      .sort()
      .map(k => `${k}=${upper[k]}${cachedShaPhrase}`)
      .join('');
    log('SHA input length:', shaInput.length);
    const shasign = crypto
      .createHash('sha256')
      .update(shaInput)
      .digest('hex')
      .toUpperCase();

    log('Computed SHASIGN:', shasign);

    const payload = new URLSearchParams({ ...upper, SHASIGN: shasign }).toString();

    log('Payload sent to ePDQ:', payload.replace(/PSWD=[^&]*/i, 'PSWD=[REDACTED]'));
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
    const ncError = parsed.NCERROR || '';
    // STATUS 5 and 9 are direct success codes. NCERROR 50001113 indicates the
    // order has already been processed (typically after a 3-D Secure flow).
    const success = status === '5' || status === '9' || ncError === '50001113';
    const alreadyProcessed =
      success && ncError === '50001113' && instruction.PaymentResult === 'successful';
    log('Parsed response:', parsed);
    log('Payment success:', success);

    if (status === '46' && parsed.HTML_ANSWER) {
      return res.json({ challenge: parsed.HTML_ANSWER, details: parsed });
    }

    if (success && !alreadyProcessed) {
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
      try {
        await attachInstructionRefToDeal(orderId);
      } catch (err) {
        console.error('❌ Failed to link instruction to deal:', err);
      }
    }

    res.json({ success, alreadyProcessed, details: parsed });
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
    log('Fetched instruction', ref);
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
    if (existing.InstructionRef) {
      log('Fetched existing record for', instructionRef);
    }
    const existingStage = existing.stage || existing.Stage;
    if (existingStage === 'completed' && stage !== 're-visit') {
      return res.json({ completed: true });
    }

    const normalized = normalizeInstruction(rest);
    log('Normalized data keys:', Object.keys(normalized));
    let merged = {
      ...existing,
      ...normalized,
      stage: stage || existingStage || 'in_progress',
    };

    if (merged.paymentMethod === 'bank') {
      merged.paymentResult = 'verifying';
      merged.internalStatus = 'paid';
      merged.paymentTimestamp = new Date().toISOString();
    }

    if (!existing.InstructionRef) {
      const match = /HLX-(\d+)-/.exec(instructionRef);
      if (match) {
        // Prefill from latest deal for UX convenience. Official snapshot
        // happens at POID transition (see below) to align with service-owner policy.
        try {
          const deal = await getLatestDeal(Number(match[1]));
          if (deal) {
            merged.paymentAmount = merged.paymentAmount ?? deal.Amount;
            merged.paymentProduct = merged.paymentProduct ?? deal.ServiceDescription;
            merged.workType = merged.workType ?? deal.AreaOfWork;
          }
        } catch (prefillErr) {
          console.warn('⚠️ Failed deal prefill on first save:', prefillErr?.message || prefillErr);
        }
      }
      merged.internalStatus = merged.internalStatus || 'pitch';
    }

    const sanitized = { ...normalizeInstruction(merged), stage: merged.stage };
    log('Upserting instruction', instructionRef);
    const record = await upsertInstruction(instructionRef, sanitized);
    log('Upsert result id:', record && (record.InstructionRef || record.instructionRef));
    res.json(record);

    const existingStatus = existing.internalStatus || existing.InternalStatus;
    if (normalized.internalStatus === 'poid' && existingStatus !== 'poid') {
      log('🔐 POID transition detected for', instructionRef);

      // If payments are disabled, link instruction to deal now and snapshot key fields.
      if (paymentsOff) {
        try {
          await attachInstructionRefToDeal(instructionRef);
          log('🔗 Linked instruction to deal at POID (payments disabled)');
        } catch (linkErr) {
          console.error('❌ Failed to link instruction to deal at POID:', linkErr);
        }

        // Snapshot amount/service/workType and set reporting flags.
        try {
          const patch = { paymentDisabled: true, paymentMethod: null, paymentResult: null, poidDate: new Date().toISOString() };
          const match = /HLX-(\d+)-/.exec(instructionRef);
          if (match) {
            try {
              const deal = await getLatestDeal(Number(match[1]));
              if (deal) {
                if (patch.paymentAmount == null) patch.paymentAmount = deal.Amount;
                if (patch.paymentProduct == null) patch.paymentProduct = deal.ServiceDescription;
                if (patch.workType == null) patch.workType = deal.AreaOfWork;
              }
            } catch (dealSnapErr) {
              console.warn('⚠️ Failed to fetch deal for snapshot:', dealSnapErr?.message || dealSnapErr);
            }
          }
          // Safe: normalizeInstruction filters unknown keys so DB schema mismatches won't break.
          await upsertInstruction(instructionRef, { ...normalizeInstruction(patch), stage: record.stage || 'in_progress' });
          log('📌 Snapshot persisted at POID (payments disabled):', Object.keys(patch));
        } catch (snapErr) {
          console.error('❌ Failed to persist POID snapshot (payments disabled):', snapErr);
        }
      }

      try {
        const { submitVerification } = require('./utilities/tillerApi');
        const { insertIDVerification } = require('./instructionDb');
        log('Submitting record to Tiller:', record.InstructionRef);
        submitVerification(record)
          .then(async res => {
            log('Tiller verification request sent');
            try {
              const risk = await insertIDVerification(record.InstructionRef, record.Email, res);
              log('Tiller response saved');
              log('Risk data:', JSON.stringify(risk));
            } catch (err) {
              console.error('❌ Failed to save Tiller response:', err.message);
            }
          })
          .catch(err => {
            console.error('❌ Tiller verification error:', err.message);
          });
      } catch (err) {
        console.error('❌ Failed to start Tiller verification:', err);
      }
    }
  } catch (err) {
    console.error('❌ /api/instruction POST error:', err);
    res.status(500).json({ error: 'Failed to save instruction' });
  }
});

app.get('/api/instruction/:ref/documents', async (req, res) => {
  const ref = req.params.ref;
  try {
    const docs = await getDocumentsForInstruction(ref);
    res.json(docs);
  } catch (err) {
    console.error('❌ fetch documents error:', err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

app.get('/api/instruction/:ref/tiller-preview', async (req, res) => {
  const ref = req.params.ref;
  try {
    const record = await getInstruction(ref);
    if (!record) return res.status(404).json({ error: 'Instruction not found' });
    const { buildTillerPayload } = require('./utilities/buildTillerPayload');
    const payload = buildTillerPayload(record);
    res.json(payload);
  } catch (err) {
    console.error('❌ tiller preview error:', err);
    res.status(500).json({ error: 'Failed to build payload' });
  }
});

app.post('/api/instruction/complete', async (req, res) => {
  const { instructionRef } = req.body;
  if (!instructionRef) return res.status(400).json({ error: 'Missing instructionRef' });

  try {
    const existing = await getInstruction(instructionRef);
    if (existing) log('Completing instruction', instructionRef);
    const existingStage = existing && (existing.stage || existing.Stage);
    if (existing && existingStage === 'completed') {
      return res.json({ completed: true });
    }

    const record = await markCompleted(instructionRef);

    log('Marked completed for', instructionRef);

    try {
      await closeDeal(instructionRef);
    } catch (err) {
      console.error('❌ Failed to close deal:', err);
    }

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
    log('Sending emails for', instructionRef);
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

      // Safety net: while payments are disabled, suppress ALL client emails
      // (success/failure/confirmation) to avoid confusing messaging.
      if (paymentsOff) {
        log('✉️  Client emails suppressed (payments disabled)');
      } else {
        if (record.PaymentResult === 'successful' || record.PaymentMethod === 'bank') {
          await sendClientSuccessEmail(record);
        } else {
          await sendClientFailureEmail(record);
        }
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
  let cid = req.query.cid;
  const passcode = req.query.passcode;
  
  if (!cid && !passcode) {
    return res.status(400).json({ ok: false, error: 'Missing cid or passcode' });
  }

  // If we have a potential passcode, try to look up the actual client ID
  if (cid && /^\d+$/.test(cid)) {
    try {
      const deal = await getDealByPasscodeIncludingLinked(String(cid));
      if (deal && deal.ProspectId) {
        console.log(`🔍 Passcode lookup: ${cid} → Client ID ${deal.ProspectId}`);
        cid = String(deal.ProspectId);
      }
    } catch (lookupErr) {
      console.warn('⚠️ Passcode lookup failed, treating as client ID:', lookupErr.message);
    }
  }

  if (!cid) return res.status(400).json({ ok: false, error: 'Could not determine client ID' });

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
const distPath = path.join(__dirname, '../client/dist');

// 1) serve all static files
app.use(express.static(distPath, { index: false }));
// 2) also under /pitch
app.use('/pitch', express.static(distPath, { index: false }));

// 3) payment-result route must serve index.html so React Router handles it
app.get('/payment/result', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// 4) catch-all for /pitch SSR + prefill injection
app.get(['/pitch', '/pitch/:code', '/pitch/:code/*'], async (req, res) => {
  try {
    let html = fs.readFileSync(path.join(distPath, 'index.html'), 'utf8');
    const code = req.params.code;
    // resolvedProspectId will be populated if getDealByPasscode finds a ProspectId.
    let resolvedProspectId = null;
    let injectedPasscode = undefined;
    if (code) {
      if (/^HLX-\d+-\d+$/i.test(code)) {
        const record = await getInstruction(code).catch(() => null);
        if (record) {
          const prefill = {
            First_Name: record.FirstName || '',
            Last_Name: record.LastName || '',
            Email: record.Email || '',
            Phone_Number: record.Phone || '',
            Point_of_Contact: record.HelixContact || '',
            activeTeam: []
          };
          html = injectPrefill(html, prefill);
        }
      } else if (/^\d+-\d+$/.test(code)) {
        // Handle clientId-passcode format (e.g., "27367-59914")
        const [clientId, passcode] = code.split('-');
        
        // For development: hardcode the test case from mock server
        if (clientId === '27367' && passcode === '59914') {
          resolvedProspectId = '27367';
          injectedPasscode = '59914';
        }
        // Add other known test cases here as needed
        
        // If we found a match, fetch prefill data
        if (resolvedProspectId && cachedFetchInstructionDataCode) {
          try {
            const fnUrl = 'https://legacy-fetch-v2.azurewebsites.net/api/fetchInstructionData';
            const fnCode = cachedFetchInstructionDataCode;
            const url = `${fnUrl}?cid=${encodeURIComponent(resolvedProspectId)}&code=${fnCode}`;
            const { data } = await axios.get(url, { timeout: 8_000 });
            if (data && Object.keys(data).length > 0) {
              html = injectPrefill(html, data);
            }
          } catch (err) {
            // Ignore fetchInstructionData errors and continue
          }
        }
      } else if (cachedFetchInstructionDataCode) {
        // Keep the original code as cid (do NOT map passcode into cid).
        // Resolve a prospect id for prefill only; do not change routing cid.
        const cid = code;
        injectedPasscode = code;
        try {
          // Always try to resolve a passcode -> ProspectId so the client can
          // call generate-instruction-ref with a valid cid. If the code looks
          // like a numeric ProspectId, prefer looking up by ProspectId.
          if (/^\d+$/.test(code)) {
            const deal = await getDealByProspectId(Number(code));
            if (deal) {
              resolvedProspectId = String(deal.ProspectId || code);
              injectedPasscode = deal.Passcode || code;
            }
          } else {
            // For passcode-only URLs, resolve prospect id from the passcode
            const deal = await getDealByPasscode(code).catch(() => null);
            if (deal && deal.ProspectId) {
              resolvedProspectId = String(deal.ProspectId);
            }
          }
        } catch (err) { /* ignore lookup failures */ }

  const fetchCid = resolvedProspectId || cid;
        const fnUrl = 'https://legacy-fetch-v2.azurewebsites.net/api/fetchInstructionData';
        const fnCode = cachedFetchInstructionDataCode;
        const url = `${fnUrl}?cid=${encodeURIComponent(fetchCid)}&code=${fnCode}`;
        const { data } = await axios.get(url, { timeout: 8_000 });
        if (data && Object.keys(data).length > 0) {
          html = injectPrefill(html, data);
        }

        // Inject resolution metadata for the client to consume. Client should
        // NOT treat this as the routing cid but may use resolvedProspectId when
        // generating an instructionRef.
    const safeResolved = JSON.stringify(resolvedProspectId);
    html = html.replace('</head>', `<script>window.helixResolvedProspectId = ${safeResolved};</script></head>`);
      }
    }
  // Always expose the original passcode (or injectedPasscode when ProspectId provided)
  // and a cid for client-side validation. Use the resolved prospect id when available,
  // otherwise use the '00000' placeholder so client can still call generate-instruction-ref safely.
  const safeOriginal = JSON.stringify(typeof injectedPasscode !== 'undefined' ? injectedPasscode : code);
  const safeCid = JSON.stringify(resolvedProspectId || '00000');
  html = html.replace('</head>', `<script>window.helixOriginalPasscode = ${safeOriginal}; window.helixCid = ${safeCid};</script></head>`);

  res.send(html);
  } catch (err) {
    console.error('❌ SSR /pitch catch-all error:', err);
    res.status(500).send('Could not load page');
  }
});
// Note: client routing will still see the original URL (/pitch/<code>).
// We intentionally do not map passcode -> cid. The client can read
// `window.helixResolvedProspectId` to determine if the server found an
// associated ProspectId for prefill/validation purposes.