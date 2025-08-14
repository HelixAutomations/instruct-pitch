const assert = require('assert');
const http = require('http');
let nock;
try { nock = require('nock'); } catch (err) { console.error('nock not installed'); process.exit(1); }

const Module = require('module');
const path = require('path');

// Global handlers to capture and print any unhandled errors with stacks
process.on('unhandledRejection', (err) => {
  console.error('UnhandledRejection:', err && err.stack ? err.stack : err);
});
process.on('uncaughtException', (err) => {
  console.error('UncaughtException:', err && err.stack ? err.stack : err);
  process.exit(1);
});

// Instrument net.connect to log attempts to connect to port 80 (helps find ECONNREFUSED)
try {
  const net = require('net');
  const originalConnect = net.connect;
  net.connect = function(...args) {
    try {
      let opts = {};
      if (typeof args[0] === 'object') opts = args[0];
      else if (typeof args[0] === 'number') opts = { port: args[0], host: args[1] };
      if (opts && (opts.port === 80 || String(opts.port) === '80' || (args[0] && args[0] === 80))) {
        console.error('net.connect called for port 80 with args:', JSON.stringify(opts), '\nStack:', new Error().stack);
      }
    } catch (e) { /* ignore instrumentation errors */ }
    return originalConnect.apply(this, args);
  };
} catch (e) { /* net may not be available in this environment */ }

// Clear proxy env vars so axios doesn't try to use a proxy (common on CI/dev machines)
process.env.HTTP_PROXY = '';
process.env.http_proxy = '';
process.env.HTTPS_PROXY = '';
process.env.https_proxy = '';
process.env.NO_PROXY = '';

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
    closeDeal: async () => { stubs.closed = true; },
    // Tests may trigger insertIDVerification via submitVerification; noop it here
    insertIDVerification: async () => ({})
  },
  // Prevent the real Tiller API calls during tests
  './utilities/tillerApi': {
    submitVerification: async () => ({ ok: true })
  },
  getInstructionResponse: { Email: 'test@example.com' }
};

const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id === 'express') return patchedExpress;
  if (stubs[id]) return stubs[id];
  if (id === 'axios') {
    // Provide an axios shim that logs outbound URLs during tests and
    // throws a descriptive error if attempting to connect to localhost:80
    return {
      post: async function(url, body, opts) {
        if (typeof url === 'string' && (url.startsWith('http://localhost') || url.includes(':80'))) {
          console.error('Test axios.post to', url, '— stack:', new Error().stack);
        }
        // Fallback to a simple resolved object so tests that rely on nock still work
        return { data: '' };
      },
      get: async function(url, opts) {
        if (typeof url === 'string' && (url.startsWith('http://localhost') || url.includes(':80'))) {
          console.error('Test axios.get to', url, '— stack:', new Error().stack);
        }
        return { data: '' };
      }
    };
  }
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
