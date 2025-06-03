const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');
const sql = require('mssql');
const { getSqlPool } = require('../sqlClient');

const keyVaultName = process.env.KEY_VAULT_NAME;
if (!keyVaultName && !process.env.KEY_VAULT_URL) {
  throw new Error('Key Vault not specified! Set KEY_VAULT_NAME or KEY_VAULT_URL');
}
const vaultUrl = process.env.KEY_VAULT_URL ||
  `https://${keyVaultName}.vault.azure.net/`;
const credential = new DefaultAzureCredential();
const secretClient = new SecretClient(vaultUrl, credential);
let passwordPromise;

async function ensureDbPassword() {
  if (process.env.DB_PASSWORD) return process.env.DB_PASSWORD;
  if (!passwordPromise) {
    passwordPromise = secretClient.getSecret('instructionsadmin-password').then(s => {
      process.env.DB_PASSWORD = s.value;
      return s.value;
    });
  }
  return passwordPromise;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function formatTime(date) {
  return date.toTimeString().slice(0, 8);
}

module.exports = async function (context, req) {
  context.log('dealCapture function received a request');

  if (req.method !== 'POST') {
    context.res = { status: 405, body: 'Method not allowed' };
    return;
  }

  const body = req.body || {};
  const { serviceDescription, amount, areaOfWork, prospectId, pitchedBy, isMultiClient, leadClientEmail, clients } = body;

  if (!serviceDescription || amount == null || !areaOfWork || !pitchedBy) {
    context.res = { status: 400, body: 'Missing required fields' };
    return;
  }

  try {
    await ensureDbPassword();
    const pool = await getSqlPool();

    const now = new Date();
    const pitchValidUntil = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const dealResult = await pool.request()
      .input('InstructionRef', sql.NVarChar(50), null)
      .input('ProspectId', sql.Int, prospectId || null)
      .input('ServiceDescription', sql.NVarChar(255), serviceDescription)
      .input('Amount', sql.Money, amount)
      .input('AreaOfWork', sql.NVarChar(100), areaOfWork)
      .input('PitchedBy', sql.NVarChar(100), pitchedBy)
      .input('PitchedDate', sql.Date, formatDate(now))
      .input('PitchedTime', sql.Time, formatTime(now))
      .input('PitchValidUntil', sql.Date, formatDate(pitchValidUntil))
      .input('Status', sql.NVarChar(20), 'pitched')
      .input('IsMultiClient', sql.Bit, isMultiClient ? 1 : 0)
      .input('LeadClientId', sql.Int, null)
      .input('LeadClientEmail', sql.NVarChar(255), leadClientEmail || null)
      .input('CloseDate', sql.Date, null)
      .input('CloseTime', sql.Time, null)
      .query(`INSERT INTO Deals (InstructionRef, ProspectId, ServiceDescription, Amount, AreaOfWork, PitchedBy, PitchedDate, PitchedTime, PitchValidUntil, Status, IsMultiClient, LeadClientId, LeadClientEmail, CloseDate, CloseTime)
              OUTPUT INSERTED.DealId
              VALUES (@InstructionRef, @ProspectId, @ServiceDescription, @Amount, @AreaOfWork, @PitchedBy, @PitchedDate, @PitchedTime, @PitchValidUntil, @Status, @IsMultiClient, @LeadClientId, @LeadClientEmail, @CloseDate, @CloseTime)`);

    const dealId = dealResult.recordset[0].DealId;

    if (Array.isArray(clients)) {
      for (const c of clients) {
        await pool.request()
          .input('DealId', sql.Int, dealId)
          .input('ClientId', sql.Int, c.clientId || null)
          .input('ProspectId', sql.Int, c.prospectId || null)
          .input('ClientEmail', sql.NVarChar(255), c.clientEmail || '')
          .input('IsLeadClient', sql.Bit, c.isLeadClient ? 1 : 0)
          .query('INSERT INTO DealJointClients (DealId, ClientId, ProspectId, ClientEmail, IsLeadClient) VALUES (@DealId, @ClientId, @ProspectId, @ClientEmail, @IsLeadClient)');
      }
    }

    context.res = { status: 200, body: { ok: true, dealId } };
  } catch (err) {
    context.log.error('dealCapture error:', err);
    context.res = { status: 500, body: { error: 'Failed to insert deal', detail: err.message } };
  }
};