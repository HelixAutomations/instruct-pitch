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

  const prospectId = req.query.prospectId || req.query.cid;
  if (!prospectId) {
    context.res = { status: 400, body: 'Missing prospectId/cid query parameter' };
    return;
  }

  try {
    await ensureDbPassword();
    const pool = await getSqlPool();

    const dealsResult = await pool.request()
      .input('pid', sql.Int, Number(prospectId))
      .query('SELECT * FROM Deals WHERE ProspectId=@pid');
    const deals = dealsResult.recordset;

    const jointClients = [];
    const instructions = [];
    const documents = [];
    const riskAssessments = [];
    const electronicIDChecks = [];

    for (const deal of deals) {
      if (deal.DealId != null) {
        const jc = await pool.request()
          .input('dealId', sql.Int, deal.DealId)
          .query('SELECT * FROM DealJointClients WHERE DealId=@dealId');
        jointClients.push(...jc.recordset);
      }
      if (deal.InstructionRef) {
        const ref = deal.InstructionRef;
        const instr = await pool.request()
          .input('ref', sql.NVarChar, ref)
          .query('SELECT * FROM Instructions WHERE InstructionRef=@ref');
        instructions.push(...instr.recordset);

        const doc = await pool.request()
          .input('ref', sql.NVarChar, ref)
          .query('SELECT * FROM Documents WHERE InstructionRef=@ref');
        documents.push(...doc.recordset);

        const risk = await pool.request()
          .input('ref', sql.NVarChar, ref)
          .query('SELECT * FROM RiskAssessment WHERE MatterId=@ref');
        riskAssessments.push(...risk.recordset);

        const eid = await pool.request()
          .input('ref', sql.NVarChar, ref)
          .query('SELECT * FROM ElectronicIDCheck WHERE MatterId=@ref');
        electronicIDChecks.push(...eid.recordset);
      }
    }

    context.res = {
      status: 200,
      body: {
        prospectId: Number(prospectId),
        deals,
        jointClients,
        instructions,
        documents,
        riskAssessments,
        electronicIDChecks
      }
    };
  } catch (err) {
    context.log.error('fetchInstructionData error:', err);
    context.res = { status: 500, body: { error: 'Failed to fetch data', detail: err.message } };
  }
};
