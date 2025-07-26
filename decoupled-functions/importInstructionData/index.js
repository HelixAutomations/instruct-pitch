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
  context.log('importInstructionData function triggered');

  if (req.method !== 'POST') {
    context.res = { status: 405, body: 'Method not allowed' };
    return;
  }

  const body = req.body || {};
  const instructionRef = body.instructionRef || body.InstructionRef;
  if (!instructionRef) {
    context.res = { status: 400, body: 'Missing instructionRef' };
    return;
  }

  try {
    await ensureDbPassword();
    const pool = await getSqlPool();

    // Update Instructions table after matter opening
    const relatedField = body.relatedClientIds || body.relatedClientId || body.RelatedClientId;
    let relatedClientIds = null;
    if (Array.isArray(relatedField)) {
      relatedClientIds = relatedField.filter(Boolean).join(',');
    } else if (typeof relatedField === 'string') {
      relatedClientIds = relatedField;
    }

    await pool.request()
      .input('InstructionRef', sql.NVarChar(50), instructionRef)
      .input('Stage', sql.NVarChar(50), 'Client')
      .input('ClientId', sql.NVarChar(50), body.clientId || body.ClientId || null)
      .input('RelatedClientId', sql.NVarChar(255), relatedClientIds)
      .input('MatterId', sql.NVarChar(50), body.matterId || body.MatterId || null)
      .query(`UPDATE Instructions
              SET Stage=@Stage,
                  ClientId=COALESCE(@ClientId, ClientId),
                  RelatedClientId=COALESCE(@RelatedClientId, RelatedClientId),
                  MatterId=COALESCE(@MatterId, MatterId),
                  LastUpdated=SYSUTCDATETIME()
              WHERE InstructionRef=@InstructionRef`);

    // Optionally insert a row into Matters when provided
    if (body.matter) {
      const m = body.matter;
      await pool.request()
        .input('MatterId', sql.NVarChar(50), m.MatterId)
        .input('Status', sql.NVarChar(50), m.Status || null)
        .input('OpenDate', sql.Date, m.OpenDate || null)
        .input('OpenTime', sql.Time, m.OpenTime || null)
        .input('CloseDate', sql.Date, m.CloseDate || null)
        .input('ClientId', sql.NVarChar(255), m.ClientId || null)
        .input('DisplayNumber', sql.NVarChar(255), m.DisplayNumber || null)
        .input('ClientName', sql.NVarChar(255), m.ClientName || null)
        .input('ClientType', sql.NVarChar(100), m.ClientType || null)
        .input('Description', sql.NVarChar(sql.MAX), m.Description || null)
        .input('PracticeArea', sql.NVarChar(255), m.PracticeArea || null)
        .input('ApproxValue', sql.NVarChar(50), m.ApproxValue || null)
        .input('mod_stamp', sql.NVarChar(50), m.mod_stamp || null)
        .input('ResponsibleSolicitor', sql.NVarChar(255), m.ResponsibleSolicitor || null)
        .input('OriginatingSolicitor', sql.NVarChar(255), m.OriginatingSolicitor || null)
        .input('SupervisingPartner', sql.NVarChar(255), m.SupervisingPartner || null)
        .input('Opponent', sql.NVarChar(255), m.Opponent || null)
        .input('OpponentSolicitor', sql.NVarChar(255), m.OpponentSolicitor || null)
        .input('Source', sql.NVarChar(255), m.Source || null)
        .input('Referrer', sql.NVarChar(255), m.Referrer || null)
        .input('method_of_contact', sql.NVarChar(50), m.method_of_contact || null)
        .query(`INSERT INTO Matters (
                  MatterId, Status, OpenDate, OpenTime, CloseDate, ClientId, DisplayNumber, ClientName, ClientType,
                  Description, PracticeArea, ApproxValue, mod_stamp, ResponsibleSolicitor, OriginatingSolicitor,
                  SupervisingPartner, Opponent, OpponentSolicitor, Source, Referrer, method_of_contact)
                VALUES (
                  @MatterId, @Status, @OpenDate, @OpenTime, @CloseDate, @ClientId, @DisplayNumber, @ClientName, @ClientType,
                  @Description, @PracticeArea, @ApproxValue, @mod_stamp, @ResponsibleSolicitor, @OriginatingSolicitor,
                  @SupervisingPartner, @Opponent, @OpponentSolicitor, @Source, @Referrer, @method_of_contact)`);
    }

    context.res = { status: 200, body: { ok: true } };
  } catch (err) {
    context.log.error('importInstructionData error:', err);
    context.res = { status: 500, body: { error: 'Failed to import data', detail: err.message } };
  }
};