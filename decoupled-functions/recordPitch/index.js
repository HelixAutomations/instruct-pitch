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
  context.log('recordPitchSections function triggered');

  if (req.method !== 'POST') {
    context.res = { status: 405, body: 'Method not allowed' };
    return;
  }

  const body = req.body || {};
  const { enquiryId, sections = [], user } = body;
  if (!enquiryId || !Array.isArray(sections)) {
    context.res = { status: 400, body: 'Invalid payload' };
    return;
  }

  try {
    await ensureDbPassword();
    const pool = await getSqlPool();
    const schema = process.env.DB_SCHEMA || 'pitchbuilder';

    for (const section of sections) {
      await pool
        .request()
        .input('enquiryId', sql.Int, enquiryId)
        .input('block', sql.NVarChar(100), section.block || '')
        .input('optionLabel', sql.NVarChar(100), section.option || '')
        .input('content', sql.NVarChar(sql.MAX), section.content || '')
        .input('createdBy', sql.NVarChar(50), user || null)
        .query(`INSERT INTO ${schema}.PitchSections (EnquiryId, Block, OptionLabel, Content, CreatedBy)
                VALUES (@enquiryId, @block, @optionLabel, @content, @createdBy)`);
    }

    context.res = { status: 200, body: { ok: true } };
  } catch (err) {
    context.log.error('recordPitchSections error:', err);
    context.res = {
      status: 500,
      body: { error: 'Failed to record pitch sections', detail: err.message }
    };
  }
};
