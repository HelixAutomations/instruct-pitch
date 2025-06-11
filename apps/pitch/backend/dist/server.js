"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const upload_1 = __importDefault(require("./upload"));
const identity_1 = require("@azure/identity");
const keyvault_secrets_1 = require("@azure/keyvault-secrets");
// Stronger typing for secrets
let cachedShaPhrase = '';
let cachedEpdqUser = '';
let cachedEpdqPassword = '';
let cachedFetchInstructionDataCode = '';
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/api', upload_1.default);
// Health probe
app.head('/pitch/', (_req, res) => res.sendStatus(200));
// Key Vault setup
const keyVaultName = process.env.KEY_VAULT_NAME;
if (!keyVaultName) {
    console.warn('⚠️  KEY_VAULT_NAME not set');
}
const keyVaultUri = `https://${keyVaultName}.vault.azure.net`;
const credential = new identity_1.DefaultAzureCredential();
const secretClient = new keyvault_secrets_1.SecretClient(keyVaultUri, credential);
if (process.env.NODE_ENV !== 'test') {
    (async () => {
        try {
            const [sha, user, pass, fetchCode] = await Promise.all([
                secretClient.getSecret('epdq-shaphrase'),
                secretClient.getSecret('epdq-userid'),
                secretClient.getSecret('epdq-password'),
                secretClient.getSecret('fetchInstructionData-code'),
            ]);
            cachedShaPhrase = sha.value || '';
            cachedEpdqUser = user.value || '';
            cachedEpdqPassword = pass.value || '';
            cachedFetchInstructionDataCode = fetchCode.value || '';
            console.log('✅ All secrets loaded from Key Vault');
        }
        catch (err) {
            console.error('❌ Failed to load secrets:', err);
            process.exit(1);
        }
    })();
}
// Helper for tests
function setSecrets(opts) {
    if (opts.shaPhrase)
        cachedShaPhrase = opts.shaPhrase;
    if (opts.epdqUser)
        cachedEpdqUser = opts.epdqUser;
    if (opts.epdqPassword)
        cachedEpdqPassword = opts.epdqPassword;
    if (opts.fetchInstructionDataCode)
        cachedFetchInstructionDataCode = opts.fetchInstructionDataCode;
}
// SHASIGN generation
app.post('/pitch/get-shasign', (req, res) => {
    try {
        if (!cachedShaPhrase)
            throw new Error('SHA phrase not loaded');
        const params = req.body;
        const toHash = Object.keys(params)
            .sort()
            .map(k => `${k}=${params[k]}${cachedShaPhrase}`)
            .join('');
        const shasign = crypto_1.default.createHash('sha256').update(toHash).digest('hex').toUpperCase();
        res.json({ shasign });
    }
    catch (err) {
        console.error('❌ /pitch/get-shasign error:', err);
        res.status(500).json({ error: err.message });
    }
});
// DirectLink confirm-payment
app.post('/pitch/confirm-payment', async (req, res) => {
    const { aliasId, orderId } = req.body;
    if (!aliasId || !orderId) {
        return res.status(400).json({ error: 'Missing aliasId or orderId' });
    }
    try {
        const params = {
            PSPID: 'epdq1717240',
            USERID: cachedEpdqUser,
            PSWD: cachedEpdqPassword,
            ORDERID: orderId,
            ALIAS: aliasId,
            AMOUNT:    String(amount),
            CURRENCY: 'GBP',
            OPERATION: 'SAL',
            ALIASUSAGE: 'One-off Helix payment',
        };
        const shaInput = Object.keys(params)
            .sort()
            .map(k => `${k}=${params[k]}${cachedShaPhrase}`)
            .join('');
        const shasign = crypto_1.default.createHash('sha256').update(shaInput).digest('hex').toUpperCase();
        const payload = new URLSearchParams({ ...params, SHASIGN: shasign }).toString();
        const result = await axios_1.default.post('https://mdepayments.epdq.co.uk/ncol/prod/orderdirect.asp', payload, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        res.json({ success: true, result: result.data });
    }
    catch (err) {
        console.error('❌ /pitch/confirm-payment error:', err);
        res.status(500).json({ error: err.message });
    }
});
// Internal fetchInstructionData (server-only)
app.get('/api/internal/fetch-instruction-data', async (req, res) => {
    const cid = req.query.cid;
    if (!cid)
        return res.status(400).json({ ok: false, error: 'Missing cid' });
    const fnUrl = 'https://legacy-fetch-v2.azurewebsites.net/api/fetchInstructionData';
    const fnCode = cachedFetchInstructionDataCode;
    if (!fnCode)
        return res.status(500).json({ ok: false, error: 'Server not ready' });
    try {
        const { data } = await axios_1.default.get(`${fnUrl}?cid=${encodeURIComponent(cid)}&code=${fnCode}`, {
            timeout: 10000,
        });
        console.log('✅ fetchInstructionData >>', data);
        res.json({ ok: true });
    }
    catch (err) {
        console.error('❌ fetchInstructionData error:', err);
        res.status(500).json({ ok: false });
    }
});
// Optional callbacks
app.get('/payment-success', (_req, res) => res.send('✅ Payment success callback'));
app.get('/payment-error', (_req, res) => res.send('❌ Payment error callback'));
// Redirect root to /pitch
app.get('/', (_req, res) => res.redirect('/pitch'));
// Static & SPA routing
const distPath = path_1.default.join(__dirname, 'client/dist');
app.use(express_1.default.static(distPath, { index: false }));
app.use('/pitch', express_1.default.static(distPath, { index: false }));
app.get('/payment/result', (_req, res) => {
    res.sendFile(path_1.default.join(distPath, 'index.html'));
});
// catch-all for /pitch SSR + prefill injection
const servePitch = async (req, res) => {
    try {
        let html = fs_1.default.readFileSync(path_1.default.join(distPath, 'index.html'), 'utf8');
        const pid = req.params.cid;
        if (pid && cachedFetchInstructionDataCode) {
            const fnUrl = 'https://legacy-fetch-v2.azurewebsites.net/api/fetchInstructionData';
            const fnCode = cachedFetchInstructionDataCode;
            const url = `${fnUrl}?cid=${encodeURIComponent(pid)}&code=${fnCode}`;
            const { data } = await axios_1.default.get(url, { timeout: 8000 });
            if (data && Object.keys(data).length > 0) {
                const script = `<script>window.helixPrefillData = ${JSON.stringify(data)};</script>`;
                html = html.replace('</head>', `${script}\n</head>`);
            }
        }
        res.send(html);
    }
    catch (err) {
        console.error('❌ SSR /pitch catch-all error:', err);
        res.status(500).send('Could not load page');
    }
};

app.get('/pitch', servePitch);
app.get('/pitch/:cid', servePitch);
app.get('/pitch/:cid/*', servePitch);

const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => console.log(`🚀 Backend listening on ${PORT}`));
}
module.exports = { app, setSecrets };
