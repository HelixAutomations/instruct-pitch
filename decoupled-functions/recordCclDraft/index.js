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
    context.log('recordCclDraft function triggered');

    if (req.method !== 'POST') {
        context.res = { status: 405, body: 'Method not allowed' };
        return;
    }

    const body = req.body || {};
    const { matterId, draftJson } = body;
    if (!matterId || typeof draftJson !== 'object') {
        context.res = { status: 400, body: 'Invalid payload' };
        return;
    }

    try {
        await ensureDbPassword();
        const pool = await getSqlPool();
        await pool.request()
            .input('MatterId', sql.NVarChar(50), matterId)
            .input('DraftJson', sql.NVarChar(sql.MAX), JSON.stringify(draftJson))
            .query(`MERGE CclDrafts AS target
        USING (SELECT @MatterId AS MatterId) AS src
          ON target.MatterId = src.MatterId
        WHEN MATCHED THEN UPDATE SET DraftJson = @DraftJson, UpdatedAt = SYSDATETIME()
        WHEN NOT MATCHED THEN INSERT (MatterId, DraftJson, UpdatedAt)
          VALUES (@MatterId, @DraftJson, SYSDATETIME());`);
        context.res = { status: 200, body: { ok: true } };
    } catch (err) {
        context.log.error('recordCclDraft error:', err);
        context.res = { status: 500, body: { error: 'Failed to save draft', detail: err.message } };
    }
};
