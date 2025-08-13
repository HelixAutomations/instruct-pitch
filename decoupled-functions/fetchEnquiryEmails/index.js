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
  context.log('fetchEnquiryEmails function triggered');

  if (req.method !== 'GET') {
    context.res = { status: 405, body: 'Method not allowed' };
    return;
  }

  const enquiryId = req.query.enquiryId ? parseInt(req.query.enquiryId, 10) : null;

  try {
    await ensureDbPassword();
    const pool = await getSqlPool();

    let result;
    if (enquiryId != null) {
      result = await pool
        .request()
        .input('enquiryId', sql.Int, enquiryId)
        .query(
          'SELECT TOP 50 * FROM EnquiryEmails WHERE EnquiryId=@enquiryId ORDER BY EmailId DESC'
        );
    } else {
      result = await pool
        .request()
        .query('SELECT TOP 50 * FROM EnquiryEmails ORDER BY EmailId DESC');
    }

    const emails = result.recordset || [];

    context.res = {
      status: 200,
      body: { emails }
    };
  } catch (err) {
    context.log.error('fetchEnquiryEmails error:', err);
    context.res = {
      status: 500,
      body: { error: 'Failed to fetch enquiry emails', detail: err.message }
    };
  }
};
