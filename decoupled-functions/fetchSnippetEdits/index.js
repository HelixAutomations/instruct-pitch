// Use the same v3 programming model as other functions
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
    context.log('fetchSnippetEdits function invoked');

    if (req.method !== 'POST') {
        context.res = { status: 405, body: 'Method not allowed' };
        return;
    }

    const body = req.body || {};
    if (body.action !== 'getSnippetEdits') {
        context.res = { status: 400, body: 'Invalid action' };
        return;
    }

    try {
        await ensureDbPassword();
        const pool = await getSqlPool();

        const result = await pool.request().query(`
      SELECT
        e.EditId AS id,
        b.Title AS blockTitle,
        e.ProposedContent AS proposedText,
        e.ProposedLabel AS proposedLabel,
        e.ProposedSortOrder AS proposedSortOrder,
        e.ProposedBlockId AS proposedBlockId,
        e.IsNew AS isNew,
        e.ProposedBy AS submittedBy,
        e.ReviewNotes AS reviewNotes,
        e.Status AS status
      FROM SnippetEdits e
      JOIN SimplifiedBlockSnippets s ON e.SnippetId = s.SnippetId
      JOIN SimplifiedBlocks b ON s.BlockId = b.BlockId
      WHERE e.Status = 'pending'
      ORDER BY e.EditId
    `);

        const edits = result.recordset || [];
        context.res = {
            status: 200,
            body: JSON.stringify(edits),
            headers: { 'Content-Type': 'application/json' }
        };
    } catch (err) {
        context.log.error('fetchSnippetEdits error', err);
        context.res = { status: 500, body: 'Failed to fetch snippet edits' };
    }
};