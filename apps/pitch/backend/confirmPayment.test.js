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
    getInstruction: async () => ({ Email: 'test@example.com' }),
    updatePaymentStatus: async () => { stubs.updateCalled = true; }
  }
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

(async () => {
  nock('https://payments.epdq.co.uk')
    .post('/ncol/prod/orderdirect.asp')
    .reply(200, 'STATUS=9');
  const ok = await post('/pitch/confirm-payment', { aliasId: 'a', orderId: 'b' });
  assert.strictEqual(ok.status, 200);
  assert.strictEqual(ok.body.success, true);

  nock('https://payments.epdq.co.uk')
    .post('/ncol/prod/orderdirect.asp')
    .reply(200, 'STATUS=2');
  const fail = await post('/pitch/confirm-payment', { aliasId: 'x', orderId: 'y' });
  assert.strictEqual(fail.status, 200);
  assert.strictEqual(fail.body.success, false);

  server.close();
  console.log('All tests passed');
})();
