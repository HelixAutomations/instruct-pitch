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
  context.log('fetchInstructionData function triggered');

  if (req.method !== 'GET') {
    context.res = { status: 405, body: 'Method not allowed' };
    return;
  }

  const initials = req.query.initials;
  if (!initials) {
    context.res = { status: 400, body: 'Missing initials query parameter' };
    return;
  }

  try {
    await ensureDbPassword();
    const pool = await getSqlPool();

    context.log(`Fetching team details for initials: ${initials}`);
    const teamResult = await pool.request()
      .input('initials', sql.NVarChar, initials)
      .query(`
        SELECT
          [Full Name],
          [Last],
          [First],
          [Nickname],
          [Initials],
          [Email],
          [Entra ID],
          [Clio ID],
          [Rate],
          [Role],
          [AOW],
          [status]
        FROM team
        WHERE [Initials]=@initials`);
    const member = teamResult.recordset[0] || null;

    context.log(member ? `Found team member ${member['Full Name']}` : 'No matching team member');

    context.res = {
      status: 200,
      body: {
        message: member ? `Team details retrieved for ${initials}` : `No team member found for ${initials}`
      }
    };
  } catch (err) {
    context.log.error('fetchInstructionData error:', err);
    context.res = { status: 500, body: { error: 'Failed to fetch data', detail: err.message } };
  }
};