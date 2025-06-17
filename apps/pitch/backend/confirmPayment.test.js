const assert = require('assert');
const http = require('http');
let nock;
try { nock = require('nock'); } catch (err) { console.error('nock not installed'); process.exit(1); }

const Module = require('module');
const path = require('path');

// Patch express to capture the server instance
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

// Stubs for external modules
const stubs = {
  '@azure/identity': { DefaultAzureCredential: class {} },
  '@azure/keyvault-secrets': {
    SecretClient: class { async getSecret() { return { value: 'dummy' }; } }
  },
  './instructionDb': {
    getInstruction: async () => stubs.getInstructionResponse,
    updatePaymentStatus: async () => { stubs.updateCalled = true; },
    attachInstructionRefToDeal: async () => { stubs.linked = true; },
    closeDeal: async () => { stubs.closed = true; }
  },
  getInstructionResponse: { Email: 'test@example.com' }
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

require('./server');
Module.prototype.require = originalRequire;

const port = patchedExpress.port;
const server = patchedExpress.server;

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(buf) }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

const crypto = require('crypto');

(async () => {
  let sentBody;
  nock('https://payments.epdq.co.uk')
    .post('/ncol/prod/orderdirect.asp', body => {
      sentBody = body.toString();
      return true;
    })
    .reply(200, 'STATUS=9');
  const ok = await post('/pitch/confirm-payment', { aliasId: 'a', orderId: 'b' });
  assert.strictEqual(ok.status, 200);
  assert.strictEqual(ok.body.success, true);
  assert.strictEqual(stubs.linked, true);
  assert.strictEqual(stubs.closed, undefined);

  // Verify ALIASOPERATION included in payload and SHA computation
  const params = Object.fromEntries(new URLSearchParams(sentBody));
  assert.strictEqual(params.ALIASOPERATION, 'BYPSP');
  const { SHASIGN, ...rest } = params;
  const shaInput = Object.keys(rest)
    .sort()
    .map(k => `${k}=${rest[k]}dummy`)
    .join('');
  const expectedSha = crypto
    .createHash('sha256')
    .update(shaInput)
    .digest('hex')
    .toUpperCase();
  assert.strictEqual(params.SHASIGN, expectedSha);

  nock('https://payments.epdq.co.uk')
    .post('/ncol/prod/orderdirect.asp')
    .reply(200, '<?xml version="1.0"?><ncresponse STATUS="46" HTML_ANSWER="SGVsbG8=" />');
  const challenge = await post('/pitch/confirm-payment', { aliasId: 'c', orderId: 'd' });
  assert.strictEqual(challenge.status, 200);
  assert.strictEqual(challenge.body.challenge, 'SGVsbG8=');

  nock('https://payments.epdq.co.uk')
    .post('/ncol/prod/orderdirect.asp')
    .reply(
      200,
      '<?xml version="1.0"?><ncresponse NCERROR="50001113" STATUS="0" />'
    );
  stubs.getInstructionResponse = { Email: 'test@example.com', PaymentResult: 'successful' };
  const dup = await post('/pitch/confirm-payment', { aliasId: 'e', orderId: 'f' });
  assert.strictEqual(dup.status, 200);
  assert.strictEqual(dup.body.success, true);
  assert.strictEqual(dup.body.alreadyProcessed, true);
  server.close();
  console.log('All tests passed');
})();
