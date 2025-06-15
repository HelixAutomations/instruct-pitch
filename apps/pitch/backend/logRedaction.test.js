const assert = require('assert');
const Module = require('module');

// Minimal express replacement to capture handlers
function patchedExpress() {
    const routes = {};
    const app = {
        routes,
        set() { },
        use() { },
        all(path, fn) { routes[`ALL ${path}`] = fn; },
        head(path, fn) { routes[`HEAD ${path}`] = fn; },
        get(path, fn) { routes[`GET ${path}`] = fn; },
        post(path, fn) { routes[`POST ${path}`] = fn; },
        listen(port, cb) {
            patchedExpress.port = port || 0;
            const server = { close() { }, address: () => ({ port }) };
            patchedExpress.server = server;
            patchedExpress.lastApp = app;
            cb && cb();
            return server;
        }
    };
    return app;
}
patchedExpress.json = () => (_req, _res, next) => next();
patchedExpress.static = () => (_req, _res, next) => next();

const stubs = {
    '@azure/identity': { DefaultAzureCredential: class { } },
    '@azure/keyvault-secrets': {
        SecretClient: class { async getSecret(name) { return { value: name + 'Val' }; } }
    },
    axios: { post: async () => ({ data: 'STATUS=9' }), get: async () => ({ data: {} }) },
    './instructionDb': {
        getInstruction: async () => ({}),
        updatePaymentStatus: async () => { },
        closeDeal: async () => { }
    },
    './upload': (_req, _res, next) => next(),
    dotenv: { config: () => { } },
    mssql: {},
    './sqlClient': { getSqlPool: async () => ({}) }
};

const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
    if (id === 'express') return patchedExpress;
    if (stubs[id]) return stubs[id];
    return originalRequire.apply(this, arguments);
};

process.env.KEY_VAULT_NAME = 'dummy';
process.env.DB_PASSWORD_SECRET = 'dummy';
process.env.PORT = 0;
process.env.DEBUG_LOG = '1';

const logs = [];
const originalLog = console.log;
console.log = (...args) => { logs.push(args.join(' ')); };

require('./server');
Module.prototype.require = originalRequire;
const app = patchedExpress.lastApp;
const handler = app.routes['POST /pitch/confirm-payment'];

function fakeReq(body) {
    return { body, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
}

function fakeRes() {
    return {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(data) { this.data = data; }
    };
}

(async () => {
    const req = fakeReq({ aliasId: 'a', orderId: 'b' });
    const res = fakeRes();
    await handler(req, res);
    console.log = originalLog;
    assert(!logs.some(l => l.includes('epdq-passwordVal')));
    assert(!logs.some(l => l.includes('epdq-shaphraseVal')));
    assert(logs.some(l => l.includes('[REDACTED]')));
    console.log('All tests passed');
})();
