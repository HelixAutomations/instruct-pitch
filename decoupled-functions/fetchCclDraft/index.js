const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');
const sql = require('mssql');
const { getSqlPool } = require('../sqlClient');

const keyVaultName = process.env.KEY_VAULT_NAME;
if (!keyVaultName && !process.env.KEY_VAULT_URL) {
    throw new Error('Key Vault not specified! Set KEY_VAULT_NAME or KEY_VAULT_URL');
}
const vaultUrl = process.env.KEY_VAULT_URL || `https://${keyVaultName}.vault.azure.net/`;
const credential = new DefaultAzureCredential();
const secretClient = new SecretClient(vaultUrl, credential);
let passwordPromise;

async function ensureDbPassword() {
    if (process.env.DB_PASSWORD) return process.env.DB_PASSWORD;
    if (!passwordPromise) {
        const secretName = process.env.DB_PASSWORD_SECRET || 'instructionsadmin-password';
        passwordPromise = secretClient.getSecret(secretName).then(s => {
            process.env.DB_PASSWORD = s.value;
            return s.value;
        });
    }
    return passwordPromise;
}

module.exports = async function (context, req) {
    context.log('fetchCclDraft function triggered');

    if (req.method !== 'GET') {
        context.res = { status: 405, body: 'Method not allowed' };
        return;
    }

    const matterId = req.query.matterId;
    if (!matterId) {
        context.res = { status: 400, body: 'Missing matterId' };
        return;
    }

    try {
        await ensureDbPassword();
        const pool = await getSqlPool();
        const result = await pool.request()
            .input('MatterId', sql.NVarChar(50), matterId)
            .query('SELECT DraftJson FROM CclDrafts WHERE MatterId = @MatterId');
        const row = result.recordset[0];
        context.res = { status: 200, body: row ? { draftJson: JSON.parse(row.DraftJson) } : {} };
    } catch (err) {
        context.log.error('fetchCclDraft error:', err);
        context.res = { status: 500, body: { error: 'Failed to fetch draft', detail: err.message } };
    }
};
