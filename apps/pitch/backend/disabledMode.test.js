const assert = require('assert');
const http = require('http');
const Module = require('module');

// Patch express to capture server port
const realExpress = require('express');
function patchedExpress() {
  const app = realExpress();
  const originalListen = app.listen.bind(app);
  app.listen = function(port, cb) {
    const server = originalListen(port, cb);
    patchedExpress.server = server;
    patchedExpress.port = server.address().port;
    return server;
  };
  return app;
}
Object.assign(patchedExpress, realExpress);

// Stubs and spies
const spies = { linked: false, upserts: [], emails: { clientSuccess: 0, clientFailure: 0, feeEarner: 0, accounts: 0 } };
const stubs = {
  '@azure/identity': { DefaultAzureCredential: class {} },
  '@azure/keyvault-secrets': { SecretClient: class { async getSecret() { return { value: 'dummy' }; } } },
  './instructionDb': {
    getInstruction: async (ref) => ({ InstructionRef: ref, Email: 'client@example.com', PaymentMethod: 'card', PaymentResult: 'successful' }),
    upsertInstruction: async (_ref, payload) => { spies.upserts.push(payload); return { InstructionRef: _ref, ...payload }; },
    attachInstructionRefToDeal: async () => { spies.linked = true; },
    getLatestDeal: async () => ({ Amount: 123.45, ServiceDescription: 'ABC', AreaOfWork: 'Conveyancing' }),
    closeDeal: async () => {}
  },
  './utilities/tillerApi': { submitVerification: async () => ({ ok: true }) },
  './email': {
    sendClientSuccessEmail: async () => { spies.emails.clientSuccess++; },
    sendClientFailureEmail: async () => { spies.emails.clientFailure++; },
    sendFeeEarnerEmail: async () => { spies.emails.feeEarner++; },
    sendAccountsEmail: async () => { spies.emails.accounts++; },
  },
  './sqlClient': { getSqlPool: async () => ({ request: () => ({ input: () => ({ query: async () => ({ recordset: [] }) }) }) }) }
};

const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id === 'express') return patchedExpress;
  if (stubs[id]) return stubs[id];
  return originalRequire.apply(this, arguments);
};

process.env.KEY_VAULT_NAME = 'dummy';
process.env.DB_PASSWORD_SECRET = 'dummy';
process.env.PORT = 0;
process.env.DISABLE_PAYMENTS = 'true';

require('./server');

async function waitForPort(timeoutMs = 2000) {
  const start = Date.now();
  while (!patchedExpress.port) {
    if (Date.now() - start > timeoutMs) throw new Error('Server did not start');
    await new Promise(r => setTimeout(r, 25));
  }
  return patchedExpress.port;
}

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: '127.0.0.1',
      port: patchedExpress.port,
      path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(buf || '{}') }); }
        catch { resolve({ status: res.statusCode, body: {} }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  await waitForPort();
  // 1) Payment endpoints blocked
  const s1 = await post('/pitch/get-shasign', { ORDERID: 'x' });
  assert.strictEqual(s1.status, 503);
  const s2 = await post('/pitch/confirm-payment', { aliasId: 'a', orderId: 'b' });
  assert.strictEqual(s2.status, 503);

  // 2) POID transition links and snapshots + email suppression
  const up = await post('/api/instruction', { instructionRef: 'HLX-1-999', internalStatus: 'poid', stage: 'in_progress' });
  assert.strictEqual(up.status, 200);
  // Allow snapshot upsert to complete
  await new Promise(r => setTimeout(r, 50));
  assert.strictEqual(spies.linked, true);
  const snapshot = spies.upserts[spies.upserts.length - 1] || {};
  // Verify persisted payload contains normalized, allow-listed fields
  const keys = Object.keys(snapshot);
  assert(keys.includes('paymentMethod') || keys.includes('paymentmethod'));
  assert(keys.includes('paymentResult') || keys.includes('paymentresult'));
  assert(keys.includes('paymentAmount') || keys.includes('paymentamount'));
  assert(keys.includes('paymentProduct') || keys.includes('paymentproduct'));
  assert(keys.includes('workType') || keys.includes('worktype'));

  // 3) Emails: fee earner sent, client emails suppressed
  const em = await post('/api/instruction/send-emails', { instructionRef: 'HLX-1-999' });
  assert.strictEqual(em.status, 200);
  assert.strictEqual(spies.emails.feeEarner > 0, true);
  assert.strictEqual(spies.emails.clientSuccess, 0);
  assert.strictEqual(spies.emails.clientFailure, 0);
  patchedExpress.server.close();
  console.log('Disabled mode tests passed');
})().catch(err => {
  console.error(err);
  try { patchedExpress.server && patchedExpress.server.close(); } catch {}
  process.exit(1);
});
