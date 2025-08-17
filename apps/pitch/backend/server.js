try {
  require('dotenv').config();
} catch (err) {
  console.warn('⚠️  dotenv not found; skipping config');
}
// console.log('AZURE_STORAGE_ACCOUNT:', process.env.AZURE_STORAGE_ACCOUNT);
// console.log('UPLOAD_CONTAINER:', process.env.UPLOAD_CONTAINER);
const express = require('express');
const axios = require('axios');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
// Startup diagnostics: print key paths and check required build artifacts so
// iisnode logs contain a clear reason for startup failure instead of a vague
// 500.1001. This helps detect missing compiled/backend files after packaging.
try {
  console.log('Server startup:', { __dirname, cwd: process.cwd() });
} catch (e) {
  // noop
}

const requiredArtifacts = [
  path.join(__dirname, 'dist', 'generateInstructionRef.js'),
  path.join(__dirname, 'upload.js'),
  path.join(__dirname, 'sqlClient.js'),
  path.join(__dirname, 'instructionDb.js'),
];
requiredArtifacts.forEach((p) => {
  try {
    console.log(`${p} exists:`, fs.existsSync(p));
  } catch (e) {
    console.warn('Error checking file', p, e && e.message);
  }
});

// If critical artifact is missing, set a startup error so requests can return
// a friendly 503 explaining the deployment problem rather than crashing the
// process (which produces an opaque iisnode 500.1001). We still log loudly
// so deployment diagnostics appear in logs.
let startupError = null;
let generateInstructionRef = null;

if (!fs.existsSync(path.join(__dirname, 'dist', 'generateInstructionRef.js'))) {
  startupError = 'Critical startup file missing: dist/generateInstructionRef.js - deployment likely incomplete.';
  console.error(startupError);
} else {
  try {
    ({ generateInstructionRef } = require('./dist/generateInstructionRef'));
  } catch (err) {
    startupError = `Failed to load generateInstructionRef: ${err.message}`;
    console.error(startupError);
  }
}

let uploadRouter, sql, getSqlPool, DefaultAzureCredential, SecretClient;
let getInstruction, upsertInstruction, markCompleted, getLatestDeal, getDealByPasscode, getDealByPasscodeIncludingLinked, getDealByProspectId, getOrCreateInstructionRefForPasscode, updatePaymentStatus, attachInstructionRefToDeal, closeDeal, getDocumentsForInstruction;
let normalizeInstruction;

try {
  uploadRouter = require('./upload');
  sql = require('mssql');
  ({ getSqlPool } = require('./sqlClient'));
  ({ DefaultAzureCredential } = require('@azure/identity'));
  ({ SecretClient } = require('@azure/keyvault-secrets'));
  ({ getInstruction, upsertInstruction, markCompleted, getLatestDeal, getDealByPasscode, getDealByPasscodeIncludingLinked, getDealByProspectId, getOrCreateInstructionRefForPasscode, updatePaymentStatus, attachInstructionRefToDeal, closeDeal, getDocumentsForInstruction } = require('./instructionDb'));
  ({ normalizeInstruction } = require('./utilities/normalize'));
} catch (err) {
  if (!startupError) {
    startupError = `Failed to load required modules: ${err.message}`;
    console.error(startupError);
  }
}
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

// Add a simple test route at the very beginning to test if routes work at all
app.get('/simple-test', (req, res) => {
  res.json({ message: 'Simple test route working!', method: req.method, url: req.originalUrl });
});

// If startupError is set, short-circuit dynamic routes with a friendly 503
if (startupError) {
  app.use((req, res, next) => {
    // Block all dynamic routes but allow static assets to be served if present
    if (!req.path.startsWith('/client') && !req.path.startsWith('/assets')) {
      return res.status(503).send(`<h1>Service temporarily unavailable</h1><p>${startupError}</p>`);
    }
    next();
  });
}

// EARLY DIAGNOSTIC MIDDLEWARE (inserted very early)
app.use((req, res, next) => {
  try {
    console.log('🔎 REQ EARLY', req.method, req.originalUrl);
  } catch (_) {}
  next();
});

// Global error handlers (do NOT exit while diagnosing 500.1001)
process.on('uncaughtException', (err) => {
  console.error('💥 UNCAUGHT EXCEPTION (suppressed exit for diagnostics):', err && err.stack || err);
  // Intentionally not exiting so we can inspect via log stream
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 UNHANDLED REJECTION at:', promise, 'reason:', reason);
  console.error('Stack:', reason?.stack);
});

app.use((req, _res, next) => {
  log('>>', req.method, req.originalUrl);
  if (Object.keys(req.query || {}).length)
    log('Query keys:', Object.keys(req.query));
  if (req.body && Object.keys(req.body).length)
    log('Body keys:', Object.keys(req.body));
  next();
});

// Add error handling middleware to catch route errors
app.use((err, req, res, next) => {
  try {
    console.error('💥 EXPRESS ERROR HANDLER:', err);
    console.error('Request:', req.method, req.originalUrl);
    console.error('Stack:', err && err.stack);
  } catch (_) {}
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Internal server error', message: err && err.message });
});
app.use('/api', uploadRouter);

// ─── Test route for debugging ──────────────────────────────────────────
app.get('/test', (req, res) => {
  res.json({ message: 'Test route working', timestamp: new Date().toISOString() });
});

// Lightweight diagnostics route (no secrets)
app.get('/diag', (req, res) => {
  res.json({
    ok: true,
    time: new Date().toISOString(),
    node: process.version,
    startupError: !!startupError,
    cwd: process.cwd(),
    files: {
      appJs: fs.existsSync(path.join(__dirname, 'app.js')),
      serverJs: fs.existsSync(path.join(__dirname, 'server.js')),
      distGenerate: fs.existsSync(path.join(__dirname, 'dist', 'generateInstructionRef.js'))
    }
  });
});

// ─── Block direct access to server files ───────────────────────────────
app.all('/server.js', (_req, res) => {
  res.status(404).send('Not found');
});
app.all('/favicon.ico', (_req, res) => {
  res.status(404).send('Not found');
});


// ─── Health probe support ───────────────────────────────────────────────
app.head('/pitch/', (_req, res) => res.sendStatus(200));
app.get('/health', (_req, res) => {
  log('💚 Health check OK');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
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
    if (!generateInstructionRef) {
      return res.status(500).json({ error: 'Instruction reference generator not available - server startup incomplete' });
    }
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
// Prefer explicit environment variable, but fall back to the known
// production vault name so the app can run inside a restricted VNet
// where app settings may not be propagated during initial debugging.
const keyVaultName = process.env.KEY_VAULT_NAME && process.env.KEY_VAULT_NAME.trim();
if (!process.env.KEY_VAULT_NAME) {
  console.warn('⚠️  KEY_VAULT_NAME not set in env — defaulting to', keyVaultName);
}
const keyVaultUri  = `https://${keyVaultName}.vault.azure.net`;
const credential   = new DefaultAzureCredential();
const secretClient = new SecretClient(keyVaultUri, credential);

let cachedFetchInstructionDataCode, cachedDbPassword;

function startServer() {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    if (process.env.IISNODE_VERSION) {
      console.log(`🚀 Backend listening on ${PORT} (IISNode)`);
    } else {
      console.log(`🚀 Backend listening on ${PORT}`);
    }
  });
}

(async () => {
  try {
    if (!keyVaultName || !process.env.DB_PASSWORD_SECRET) {
      console.warn('⚠️ KEY_VAULT_NAME or DB_PASSWORD_SECRET not set — skipping Key Vault fetch and starting server');
      // Leave cached values undefined; server may rely on existing env vars.
      startServer();
      return;
    }

    const [fetchCode, dbPass] = await Promise.all([
      secretClient.getSecret('fetchInstructionData-code'),
      secretClient.getSecret(process.env.DB_PASSWORD_SECRET),
    ]);
    cachedFetchInstructionDataCode = fetchCode?.value;
    cachedDbPassword              = dbPass?.value;
    if (cachedDbPassword) process.env.DB_PASSWORD = cachedDbPassword;
    console.log('✅ All secrets loaded from Key Vault');
    startServer();
  } catch (err) {
    console.error('❌ Failed to load secrets from Key Vault — starting server without them:', err && err.message);
    // Do not crash the process; start the server and allow runtime paths to handle missing secrets.
    startServer();
  }
})();

// Export the Express app when hosted in IISNode
if (process.env.IISNODE_VERSION) {
  module.exports = app;
}

// ─── Payment Integration - Prepared for Stripe ────────────────────────
// TODO: Add Stripe payment endpoints here
// - POST /pitch/create-payment-intent
// - POST /pitch/confirm-payment-intent
// - POST /pitch/webhook/stripe

// ─── Stripe Payment Preparation ────────────────────────────────────────
app.post('/pitch/create-payment-intent', async (req, res) => {
  try {
    if (paymentsOff) {
      log('🛑 Payment creation blocked: payments disabled');
      return res.status(503).json({ error: 'Payments are temporarily disabled' });
    }
    // TODO: Implement Stripe PaymentIntent creation
    res.status(501).json({ error: 'Stripe integration not yet implemented' });
  } catch (err) {
    console.error('❌ Payment intent creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Stripe Payment Confirmation - TODO ────────────────────────────────
app.post('/pitch/confirm-payment-intent', async (req, res) => {
  try {
    if (paymentsOff) {
      log('🛑 Payment confirmation blocked: payments disabled');
      return res.status(503).json({ error: 'Payments are temporarily disabled' });
    }
    // TODO: Implement Stripe PaymentIntent confirmation
    res.status(501).json({ error: 'Stripe integration not yet implemented' });
  } catch (err) {
    console.error('❌ Payment confirmation error:', err);
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

  // If we have a potential passcode in the cid parameter, try to look up the actual client ID
  if (cid && /^\d+$/.test(cid)) {
    try {
      // First try treating cid as a passcode
      let deal = await getDealByPasscodeIncludingLinked(String(cid));
      if (deal && deal.ProspectId) {
        console.log(`🔍 Passcode lookup: ${cid} → Client ID ${deal.ProspectId}`);
        cid = String(deal.ProspectId);
      } else {
        // If no deal found by passcode, treat cid as ProspectId (no change needed)
        console.log(`🔍 Using ${cid} as Client ID directly`);
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
// Handle both local dev and production paths
let distPath = path.join(__dirname, '../client/dist');
// In production (Azure), files are in wwwroot, so client/dist is in same dir as server.js
if (!fs.existsSync(distPath)) {
  distPath = path.join(__dirname, 'client/dist');
}

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
    log('📄 SSR request for:', req.originalUrl, 'params:', req.params);
    let html = fs.readFileSync(path.join(distPath, 'index.html'), 'utf8');
    const code = req.params.code;
    // resolvedProspectId will be populated if getDealByPasscode finds a ProspectId.
    let resolvedProspectId = null;
    let injectedPasscode = undefined;
    if (code) {
      log('🔍 Processing code:', code);
      if (/^HLX-\d+-\d+$/i.test(code)) {
        log('📋 Instruction code detected');
        const record = await getInstruction(code).catch((err) => {
          log('⚠️ getInstruction failed:', err.message);
          return null;
        });
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
          // call generate-instruction-ref with a valid cid. First try treating
          // the code as a passcode, then fall back to treating it as a ProspectId.
          
          // First: try as passcode (most common case) - use IncludingLinked to find
          // deals even if they already have an InstructionRef
          let deal = await getDealByPasscodeIncludingLinked(code).catch(() => null);
          if (deal && deal.ProspectId) {
            resolvedProspectId = String(deal.ProspectId);
            injectedPasscode = code;
          } else if (/^\d+$/.test(code)) {
            // Fallback: if no deal found by passcode and code is numeric, try as ProspectId
            deal = await getDealByProspectId(Number(code));
            if (deal) {
              resolvedProspectId = String(deal.ProspectId || code);
              injectedPasscode = deal.Passcode || code;
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
    console.error('❌ Request details:', {
      url: req.originalUrl,
      params: req.params,
      query: req.query
    });
    console.error('❌ Stack trace:', err.stack);
    res.status(500).send(`<h1>Server Error</h1><p>Could not load page: ${err.message}</p>`);
  }
});
// Note: client routing will still see the original URL (/pitch/<code>).
// We intentionally do not map passcode -> cid. The client can read
// `window.helixResolvedProspectId` to determine if the server found an
// associated ProspectId for prefill/validation purposes.