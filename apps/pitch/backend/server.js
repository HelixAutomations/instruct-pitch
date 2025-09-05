try {
  require('dotenv').config();
} catch (err) {
  console.warn('⚠️  dotenv not found; skipping config');
}
// console.log('AZURE_STORAGE_ACCOUNT:', process.env.AZURE_STORAGE_ACCOUNT);
// console.log('UPLOAD_CONTAINER:', process.env.UPLOAD_CONTAINER);
let startupError = null;
let express;
try {
  express = require('express');
} catch (err) {
  startupError = `Critical dependency missing: express - ${err.message}`;
  console.error(startupError);
  // Minimal express stub so iisnode returns a helpful message instead of 500.1001
  express = function () {
    const handler = (req, res) => {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'text/plain');
      res.end(startupError);
    };
    const noop = () => handler;
    handler.use = handler.get = handler.post = handler.all = handler.head = noop;
    handler.set = () => { };
    handler.listen = (port, cb) => {
      require('http').createServer(handler).listen(port, cb);
    };
    return handler;
  };
}
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
let getInstruction, upsertInstruction, markCompleted, getLatestDeal, getDealByPasscode, getDealByPasscodeIncludingLinked, getDealByProspectId, getOrCreateInstructionRefForPasscode, attachInstructionRefToDeal, closeDeal, getDocumentsForInstruction;
let normalizeInstruction;
// Payment-related modules (declared here so later async init can see them)
let stripeService, paymentDatabase, paymentRoutes;
let cachedStripeSecretKey; // retrieved from Key Vault or local secrets file

try {
  uploadRouter = require('./upload');
  sql = require('mssql');
  ({ getSqlPool } = require('./sqlClient'));
  ({ DefaultAzureCredential } = require('@azure/identity'));
  ({ SecretClient } = require('@azure/keyvault-secrets'));
  ({ getInstruction, upsertInstruction, markCompleted, getLatestDeal, getDealByPasscode, getDealByPasscodeIncludingLinked, getDealByProspectId, getOrCreateInstructionRefForPasscode, attachInstructionRefToDeal, closeDeal, getDocumentsForInstruction } = require('./instructionDb'));
  ({ normalizeInstruction } = require('./utilities/normalize'));
  
  // Payment-related modules
  stripeService = require('./stripe-service');
  paymentDatabase = require('./payment-database');
  paymentRoutes = require('./payment-routes');
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
// Log the evaluated payment disable flag early for diagnostics (no secrets)
console.log('[payments] paymentsOff flag =', paymentsOff, 'via env vars DISABLE_PAYMENTS/PAYMENT_DISABLED');

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
// Custom JSON parser so we can preserve the raw body for Stripe webhooks
app.use(express.json({
  verify: (req, _res, buf) => {
    try {
      const url = req.originalUrl || '';
      if (url.includes('/webhook/stripe')) {
        req.rawBody = buf; // store raw body buffer for Stripe signature verification
        if (process.env.DEBUG_LOG) {
          console.log('🧪 Captured raw webhook body len=%d for %s', buf.length, url);
        }
      }
    } catch (e) {
      console.warn('⚠️  Raw body capture error:', e.message);
    }
  }
}));

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
if (uploadRouter) {
  app.use('/api', uploadRouter);
} else {
  console.warn('⚠️  upload router not initialized; /api routes disabled');
  app.use('/api', (_req, res) => {
    res.status(503).json({ error: 'Upload service unavailable', message: startupError });
  });
}

// ─── Payment Routes and Stripe Initialization ────────────────────────────
// Payment system initialization will happen after Key Vault secrets are loaded

// Lightweight health endpoint (does not require Stripe to be initialized yet)
app.get('/api/payments/health', (req, res) => {
  try {
    res.json({
      ok: true,
      paymentsOff,
      stripeInitialized: !!(stripeService && stripeService.initialized),
      routesMounted: !!(app._router && app._router.stack && app._router.stack.some(l => l?.route?.path && String(l.route.path).includes('/api/payments'))),
      now: new Date().toISOString(),
      strategy: 'key-vault-only'
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

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
// IIS rewrites all requests to `server.js` before Express sees them. When
// the rewrite happens, the original URL is preserved in `req.originalUrl`.
// Only return 404 when the original request was actually for `/server.js`
// to prevent short‑circuiting legitimate rewrites (which would make every
// request appear as `/server.js`).
app.all('/server.js', (req, res, next) => {
  if (req.originalUrl === '/server.js') {
    return res.status(404).send('Not found');
  }
  next();
});

// Explicitly block favicon requests which can trigger unnecessary log noise.
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
    console.log('🔍 getDealByPasscodeIncludingLinked called with passcode:', passcode);
    
    if (!passcode) {
      console.log('❌ No passcode provided');
      return res.status(400).json({ error: 'Passcode is required' });
    }
    
    const deal = await getDealByPasscodeIncludingLinked(String(passcode));
    console.log('🎯 Deal lookup result:', deal ? `Found deal ${deal.DealId} with Amount: ${deal.Amount}` : 'No deal found');
    
    if (deal) {
      console.log('✅ Returning deal to frontend:', { DealId: deal.DealId, ProspectId: deal.ProspectId, Amount: deal.Amount });
      res.json(deal);
    } else {
      console.log('❌ Deal not found for passcode:', passcode);
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
const keyVaultName = process.env.KEY_VAULT_NAME && process.env.KEY_VAULT_NAME.trim() || 'helixlaw-instructions';
if (!process.env.KEY_VAULT_NAME) {
  console.warn('⚠️  KEY_VAULT_NAME not set in env — defaulting to', keyVaultName);
}
const keyVaultUri  = `https://${keyVaultName}.vault.azure.net`;
const credential   = new DefaultAzureCredential();
const secretClient = new SecretClient(keyVaultUri, credential);

let cachedFetchInstructionDataCode, cachedDbPassword;

(async () => {
  try {
    if (!keyVaultName || !process.env.DB_PASSWORD_SECRET) {
      console.warn('⚠️ KEY_VAULT_NAME or DB_PASSWORD_SECRET not set — skipping Key Vault fetch for DB password');
    }

    // Attempt to load the legacy prefill function code. Historically this secret
    // has had two different names, so check both and log which one (if any) was
    // found. This makes it clear in the log stream whether prefill was enabled
    // or intentionally skipped.
    const fetchSecretNames = [
      'fetchInstructionData-code',
      'fetchInstructionDataLegacy-code',
    ];
    for (const name of fetchSecretNames) {
      try {
        const secret = await secretClient.getSecret(name);
        if (secret && secret.value) {
          cachedFetchInstructionDataCode = secret.value;
          console.log(`✅ Loaded ${name} from Key Vault`);
          break;
        }
      } catch (e) {
        console.warn(`⚠️  Missing Key Vault secret ${name}:`, e.message);
      }
    }

    if (!cachedFetchInstructionDataCode) {
      console.warn('⚠️  No fetchInstructionData code available – legacy prefill disabled');
    }

    // Load the database password if available
    if (process.env.DB_PASSWORD_SECRET) {
      try {
        const dbPass = await secretClient.getSecret(process.env.DB_PASSWORD_SECRET);
        cachedDbPassword = dbPass && dbPass.value;
        if (cachedDbPassword) process.env.DB_PASSWORD = cachedDbPassword;
      } catch (dbErr) {
        console.warn('⚠️  Unable to load DB password from Key Vault:', dbErr.message);
      }
    }

    // Always attempt to load Stripe restricted payments key from Key Vault
    // Secret name: stripe-restricted-payments-key
    try {
      const stripeSecret = await secretClient.getSecret('stripe-restricted-payments-key');
      if (stripeSecret && stripeSecret.value) {
        cachedStripeSecretKey = stripeSecret.value;
        console.log('✅ Loaded stripe-restricted-payments-key from Key Vault');
      } else {
        console.warn('⚠️ stripe-restricted-payments-key secret empty');
      }
    } catch (stripeErr) {
      console.warn('⚠️  Unable to load stripe-restricted-payments-key from Key Vault:', stripeErr.message);
    }

  console.log('✅ Key Vault secret retrieval complete');

    // ─── Initialize Payment System After Secrets Are Loaded ─────────────────
    // Now that DB password is available, initialize payment system
    try {
      if (stripeService && paymentDatabase && paymentRoutes) {
  // No fallback: stripe key must come from Key Vault. If absent, initialization throws.

        // Initialize Stripe service with retrieved secret key (required)
        await stripeService.initialize(cachedStripeSecretKey);
        
        // Initialize payment database tables (now that DB password is set)
        await paymentDatabase.initializeTables();
        
        // Mount payment routes
        app.use('/api/payments', paymentRoutes);
        app.use('/api', paymentRoutes); // For webhook endpoint
        
        console.log('✅ Payment system initialized successfully');
      }
    } catch (paymentError) {
      console.error('❌ Failed to initialize payment system:', paymentError);
      // Mount error handler for payment routes
      app.use('/api/payments', (_req, res) => {
        res.status(503).json({ 
          error: 'Payment service unavailable', 
          message: paymentError.message 
        });
      });
    }
  } catch (err) {
    console.error('❌ Failed to load secrets from Key Vault — starting server without them:', err && err.message);
    // Do not crash the process; start the server and allow runtime paths to handle missing secrets.
  }
})().finally(() => {
  // Start listening only after async initialization is complete
  startListening();
});

// ─── Admin notification when client accesses instructions app ────────
app.post('/api/notify-instructions-accessed', async (req, res) => {
  try {
    const { dealData, instructionRef } = req.body;
    
    if (!dealData) {
      return res.status(400).json({ error: 'Deal data is required' });
    }

    // Email notifications for instructions accessed have been removed
    log(`✅ Instructions accessed notification endpoint called for deal ${dealData.DealId} (emails disabled)`);
    res.json({ success: true, message: 'Notification endpoint called (emails disabled)' });
    
  } catch (err) {
    console.error('❌ Failed to process instructions accessed notification:', err);
    res.status(500).json({ error: 'Failed to process notification' });
  }
});

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

// ─── Test endpoint to verify server restart ──────────────────────────
app.get('/api/test-fix', (req, res) => {
  res.json({ message: 'Server is running updated code', timestamp: new Date().toISOString() });
});

// ─── Test endpoint to check deal lookup ──────────────────────────────
app.get('/api/test-deal/:prospectId', async (req, res) => {
  try {
    const prospectId = Number(req.params.prospectId);
    const deal = await getDealByProspectId(prospectId);
    res.json({ prospectId, deal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Test endpoint to check deal lookup by passcode ──────────────────
app.get('/api/test-passcode/:passcode', async (req, res) => {
  try {
    const passcode = req.params.passcode;
    const deal = await getDealByPasscodeIncludingLinked(passcode);
    res.json({ passcode, deal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Instruction data upsert ──────────────────────────────────────────
app.get('/api/instruction', async (req, res) => {
  const ref = req.query.instructionRef;
  if (!ref) return res.status(400).json({ error: 'Missing instructionRef' });
  try {
    let data = await getInstruction(ref);
    log('Fetched instruction', ref);
    
    // Remove payment fields from instruction response (now handled by separate payments API)
    if (data) {
      const {
        PaymentMethod,
        PaymentResult, 
        PaymentAmount,
        PaymentProduct,
        PaymentTimestamp,
        AliasId,
        OrderId,
        SHASign,
        ...cleanData
      } = data;
      data = cleanData;
    }
    
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
      const match = /HLX-(\d+)-(.+)$/.exec(instructionRef);
      if (match) {
        // Prefill only non-payment fields from deal
        try {
          const prospectId = Number(match[1]);
          const passcode = match[2];
          const deal = await getDealByPasscodeIncludingLinked(passcode, prospectId);
          if (deal) {
            // Only prefill business data, not payment data
            merged.workType = merged.workType ?? deal.AreaOfWork;
            merged.solicitorId = merged.solicitorId ?? deal.PitchedBy;
            // Payment data handled by separate payments API
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

        // Snapshot business fields and set reporting flags (no payment data)
        try {
          const patch = { paymentDisabled: true, poidDate: new Date().toISOString() };
          const match = /HLX-(\d+)-/.exec(instructionRef);
          if (match) {
            try {
              const deal = await getLatestDeal(Number(match[1]));
              if (deal) {
                // Only snapshot business data, payment data handled separately
                if (patch.workType == null) patch.workType = deal.AreaOfWork;
                // Note: payment amounts now handled by payments API
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

app.get('/api/instruction/summary/:ref', async (req, res) => {
  const ref = req.params.ref;
  try {
    const data = await getInstruction(ref);
    if (!data) {
      return res.status(404).json({ error: 'Instruction not found' });
    }
    
    // Return a summary with key fields needed for the success page
    const summary = {
      instructionRef: ref,
      clientType: data.clientType,
      companyName: data.companyName,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      stage: data.stage,
      internalStatus: data.internalStatus,
      WorkType: data.WorkType,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
      // Payment fields removed - now handled by separate payments API
    };
    
    console.log('✅ Instruction summary fetched for:', ref);
    res.json(summary);
  } catch (err) {
    console.error('❌ fetch instruction summary error:', err);
    res.status(500).json({ error: 'Failed to fetch instruction summary' });
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
      } = require('./email');

      // Accounts email (Pending Bank Transfer) has been removed

      await sendFeeEarnerEmail(record);

      // Send appropriate client email based on payment status
      // Use InternalStatus since payment fields are now separate
      console.log('📧 Email decision for', instructionRef, ':', {
        InternalStatus: record.InternalStatus
      });
      
      if (record.InternalStatus === 'paid') {
        console.log('📧 Sending client SUCCESS email');
        await sendClientSuccessEmail(record);
      } else {
        // Send failure email for any other case (including undefined/null payment status)
        console.log('📧 Sending client FAILURE email');
        await sendClientFailureEmail(record);
        
        // Also send debug notification to dev team for potential stuck client
        const { sendDebugStuckClientEmail } = require('./email');
        try {
          await sendDebugStuckClientEmail(record, 'Client reached completion but payment status unclear - may be stuck waiting for payment confirmation');
          console.log('🔍 Debug notification sent for potentially stuck client:', instructionRef);
        } catch (debugErr) {
          console.error('❌ Failed to send debug stuck client notification:', debugErr);
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
  if (!fnCode) {
    return res.status(503).json({ 
      ok: false, 
      error: 'Service temporarily unavailable', 
      detail: 'Server still initializing - please retry in a moment',
      retryAfter: 5
    });
  }

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
        // Handle clientId-passcode format (e.g., "27367-20200")
        const [clientId, passcode] = code.split('-');
        
        // Try to verify this is a valid combination by looking up the deal
        try {
          const deal = await getDealByPasscodeIncludingLinked(passcode);
          if (deal && String(deal.ProspectId) === clientId) {
            resolvedProspectId = clientId;
            injectedPasscode = passcode;
            log('✅ Validated clientId-passcode format:', { clientId, passcode });
          } else {
            log('⚠️ Invalid clientId-passcode combination:', { clientId, passcode });
          }
        } catch (lookupErr) {
          log('⚠️ Failed to validate clientId-passcode:', lookupErr.message);
        }
        
        // If we found a match, fetch prefill data
        if (resolvedProspectId && cachedFetchInstructionDataCode) {
          try {
            log('📞 Calling legacy fetchInstructionData', { cid: resolvedProspectId });
            const fnUrl = 'https://legacy-fetch-v2.azurewebsites.net/api/fetchInstructionData';
            const fnCode = cachedFetchInstructionDataCode;
            const url = `${fnUrl}?cid=${encodeURIComponent(resolvedProspectId)}&code=${fnCode}`;
            const { data } = await axios.get(url, { timeout: 8_000 });
            if (data && Object.keys(data).length > 0) {
              html = injectPrefill(html, data);
            }
          } catch (err) {
            console.warn('⚠️ Legacy fetch failed:', err.message);
          }
        } else {
          log('ℹ️ Skipping legacy fetchInstructionData – no cid or secret');
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

        // Fetch additional data from legacy function if numeric code and secret available
        try {
          const fetchCid = resolvedProspectId || cid;
          log('📞 Calling legacy fetchInstructionData', { cid: fetchCid });
          const fnUrl = 'https://legacy-fetch-v2.azurewebsites.net/api/fetchInstructionData';
          const fnCode = cachedFetchInstructionDataCode;
          const url = `${fnUrl}?cid=${encodeURIComponent(fetchCid)}&code=${fnCode}`;
          const { data } = await axios.get(url, { timeout: 8_000 });
          if (data && Object.keys(data).length > 0) {
            html = injectPrefill(html, data);
          }
        } catch (legacyFetchErr) {
          console.warn('⚠️ Legacy fetch failed (continuing without prefill):', legacyFetchErr.message);
        }

        // Inject resolution metadata for the client to consume. Client should
        // NOT treat this as the routing cid but may use resolvedProspectId when
        // generating an instructionRef.
    const safeResolved = JSON.stringify(resolvedProspectId);
    html = html.replace('</head>', `<script>window.helixResolvedProspectId = ${safeResolved};</script></head>`);
      } else {
        log('ℹ️ Skipping legacy fetchInstructionData – secret missing');
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

// ─── Listening (guard against double-listen & bad PORT) ──────────────────────
// In Azure App Service with iisnode, PORT may be a named pipe or already managed.
// If a custom App Setting 'PORT=80' was added it can cause binding errors (UNKNOWN :::80).
// Remove any manual PORT setting in App Settings; let the platform supply it.
const RAW_PORT = process.env.PORT;
function resolvePort() {
  if (!RAW_PORT) return 3000; // local fallback only
  // If RAW_PORT looks numeric and is 80 under iisnode, prefer letting Node bind anyway;
  // but log a warning so it can be corrected in configuration.
  if (/^\d+$/.test(RAW_PORT)) {
    const n = Number(RAW_PORT);
    if (n === 80) {
      console.warn(
        '⚠️  PORT=80 detected. If running under iisnode this may fail. Falling back to 3000. Remove custom PORT setting to avoid this warning.'
      );
      return 3000;
    }
    return n;
  }
  return RAW_PORT; // pipe name
}

function startListening() {
  if (global.__HLX_LISTENING__) {
    console.log('ℹ️  Listen already established, skipping duplicate call');
    return;
  }
  const portVal = resolvePort();
  try {
    app.listen(portVal, () => {
      global.__HLX_LISTENING__ = true;
      console.log('🚀 Backend listening on', portVal, '(raw PORT env =', RAW_PORT || 'undefined', ')');
    });
  } catch (err) {
    console.error('❌ Failed to start listener on', portVal, 'error:', err.message);
    if (portVal === 80) {
      console.error('Hint: Remove PORT=80 from App Settings or let platform provide a named pipe.');
    }
  }
}

// Server listening is now handled in the async initialization block above