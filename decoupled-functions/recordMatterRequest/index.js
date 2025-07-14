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
  context.log('recordMatterRequest function triggered');

  if (req.method !== 'POST') {
    context.res = { status: 405, body: 'Method not allowed' };
    return;
  }

  const body = req.body || {};

  try {
    await ensureDbPassword();
    const pool = await getSqlPool();

    let opponentId = body.opponentId || null;
    if (!opponentId && body.opponent) {
      const op = body.opponent;
      const res = await pool.request()
        .input('PartyRole', sql.NVarChar(50), 'Opponent')
        .input('IsCompany', sql.Bit, op.is_company ? 1 : 0)
        .input('Title', sql.NVarChar(20), op.title || null)
        .input('FirstName', sql.NVarChar(100), op.first_name || null)
        .input('LastName', sql.NVarChar(100), op.last_name || null)
        .input('CompanyName', sql.NVarChar(255), op.company_name || null)
        .input('CompanyNumber', sql.NVarChar(50), op.company_number || null)
        .input('Email', sql.NVarChar(255), op.email || null)
        .input('Phone', sql.NVarChar(50), op.phone || null)
        .input('HouseNumber', sql.NVarChar(50), null)
        .input('Street', sql.NVarChar(255), op.address || null)
        .input('City', sql.NVarChar(100), null)
        .input('County', sql.NVarChar(100), null)
        .input('Postcode', sql.NVarChar(20), null)
        .input('Country', sql.NVarChar(100), null)
        .query(`INSERT INTO Opponents (
          PartyRole, IsCompany, Title, FirstName, LastName, CompanyName, CompanyNumber,
          Email, Phone, HouseNumber, Street, City, County, Postcode, Country)
          OUTPUT INSERTED.OpponentID
          VALUES (
          @PartyRole, @IsCompany, @Title, @FirstName, @LastName, @CompanyName, @CompanyNumber,
          @Email, @Phone, @HouseNumber, @Street, @City, @County, @Postcode, @Country)`);
      opponentId = res.recordset[0].OpponentID;
    }

    let solicitorId = body.solicitorId || null;
    if (!solicitorId && body.solicitor) {
      const sol = body.solicitor;
      const res = await pool.request()
        .input('PartyRole', sql.NVarChar(50), 'Solicitor')
        .input('IsCompany', sql.Bit, sol.is_company ? 1 : 0)
        .input('Title', sql.NVarChar(20), sol.title || null)
        .input('FirstName', sql.NVarChar(100), sol.first_name || null)
        .input('LastName', sql.NVarChar(100), sol.last_name || null)
        .input('CompanyName', sql.NVarChar(255), sol.company_name || null)
        .input('CompanyNumber', sql.NVarChar(50), sol.company_number || null)
        .input('Email', sql.NVarChar(255), sol.email || null)
        .input('Phone', sql.NVarChar(50), sol.phone || null)
        .input('HouseNumber', sql.NVarChar(50), null)
        .input('Street', sql.NVarChar(255), sol.address || null)
        .input('City', sql.NVarChar(100), null)
        .input('County', sql.NVarChar(100), null)
        .input('Postcode', sql.NVarChar(20), null)
        .input('Country', sql.NVarChar(100), null)
        .query(`INSERT INTO Opponents (
          PartyRole, IsCompany, Title, FirstName, LastName, CompanyName, CompanyNumber,
          Email, Phone, HouseNumber, Street, City, County, Postcode, Country)
          OUTPUT INSERTED.OpponentID
          VALUES (
          @PartyRole, @IsCompany, @Title, @FirstName, @LastName, @CompanyName, @CompanyNumber,
          @Email, @Phone, @HouseNumber, @Street, @City, @County, @Postcode, @Country)`);
      solicitorId = res.recordset[0].OpponentID;
    }

    const { v4: uuidv4 } = require('uuid');
    const matterId = uuidv4();
    const now = new Date();
    const openTime = new Date(0); // midnight
    openTime.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    await pool.request()
      .input('MatterID', sql.NVarChar(255), matterId)
      .input('InstructionRef', sql.NVarChar(255), body.instructionRef || null)
      .input('ClientType', sql.NVarChar(255), body.clientType || null)
      .input('Description', sql.NVarChar(sql.MAX), body.description || null)
      .input('PracticeArea', sql.NVarChar(255), body.practiceArea || null)
      .input('ApproxValue', sql.NVarChar(50), body.value || null)
      .input('ResponsibleSolicitor', sql.NVarChar(255), body.responsibleSolicitor || null)
      .input('OriginatingSolicitor', sql.NVarChar(255), body.originatingSolicitor || null)
      .input('SupervisingPartner', sql.NVarChar(255), body.supervisingPartner || null)
      .input('Source', sql.NVarChar(255), body.source || null)
      .input('Referrer', sql.NVarChar(255), body.referrer || null)
      .input('OpponentID', sql.UniqueIdentifier, opponentId)
      .input('OpponentSolicitorID', sql.UniqueIdentifier, solicitorId)
      .input('Status', sql.NVarChar(50), 'MatterRequest')
      .input('OpenDate', sql.Date, new Date())
      .input('OpenTime', sql.Time, openTime)
      .query(`
  INSERT INTO Matters (
    MatterID, InstructionRef, ClientType, Description, PracticeArea, ApproxValue,
    ResponsibleSolicitor, OriginatingSolicitor, SupervisingPartner, Source, Referrer,
    OpponentID, OpponentSolicitorID, Status, OpenDate, OpenTime)
  VALUES (
    @MatterID, @InstructionRef, @ClientType, @Description, @PracticeArea, @ApproxValue,
    @ResponsibleSolicitor, @OriginatingSolicitor, @SupervisingPartner, @Source, @Referrer,
    @OpponentID, @OpponentSolicitorID, @Status, @OpenDate, @OpenTime)
`);

    context.res = { status: 201, body: { ok: true, matterId } };
  } catch (err) {
    context.log.error('recordMatterRequest error:', err);
    context.res = { status: 500, body: { error: 'Failed to insert matter request', detail: err.message } };
  }
};
