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
  const prospectId = req.query.prospectId && Number(req.query.prospectId);
  const instructionRef = req.query.instructionRef;
  const dealId = req.query.dealId && Number(req.query.dealId);

  if (!initials && prospectId == null && !instructionRef && dealId == null) {
    context.res = {
      status: 400,
      body: 'Missing query parameter – provide initials, prospectId, instructionRef or dealId'
    };
    return;
  }

  try {
    await ensureDbPassword();
    const pool = await getSqlPool();

    // ─── Deals pitched by this user with related data ────────────────────
    let deals = [];
    if (initials) {
      const dealsResult = await pool.request()
        .input('initials', sql.NVarChar, initials)
        .query('SELECT * FROM Deals WHERE PitchedBy=@initials ORDER BY DealId DESC');
      deals = dealsResult.recordset || [];

      for (const d of deals) {
        const jointRes = await pool.request()
          .input('dealId', sql.Int, d.DealId)
          .query('SELECT * FROM DealJointClients WHERE DealId=@dealId ORDER BY DealJointClientId');
        d.jointClients = jointRes.recordset || [];

        if (d.InstructionRef) {
          const instRes = await pool.request()
            .input('ref', sql.NVarChar, d.InstructionRef)
            .query('SELECT * FROM Instructions WHERE InstructionRef=@ref');
          const inst = instRes.recordset[0] || null;
          if (inst) {
            const docRes = await pool.request()
              .input('ref', sql.NVarChar, d.InstructionRef)
              .query('SELECT FileName, BlobUrl FROM Documents WHERE InstructionRef=@ref');
            inst.documents = docRes.recordset || [];

            const riskRes = await pool.request()
              .input('ref', sql.NVarChar, d.InstructionRef)
              .query('SELECT * FROM IDVerifications WHERE InstructionRef=@ref ORDER BY InternalId DESC');
            inst.idVerifications = riskRes.recordset || [];
            d.instruction = inst;
          }
        }
      }
    }

    // ─── Single deal by ID when requested ───────────────────────────────
    let deal = null;
    if (dealId != null) {
      const dealRes = await pool.request()
        .input('dealId', sql.Int, dealId)
        .query('SELECT * FROM Deals WHERE DealId=@dealId');
      deal = dealRes.recordset[0] || null;
      if (deal) {
        const jointRes = await pool.request()
          .input('dealId', sql.Int, dealId)
          .query('SELECT * FROM DealJointClients WHERE DealId=@dealId ORDER BY DealJointClientId');
        deal.jointClients = jointRes.recordset || [];

        if (deal.InstructionRef) {
          const instRes = await pool.request()
            .input('ref', sql.NVarChar, deal.InstructionRef)
            .query('SELECT * FROM Instructions WHERE InstructionRef=@ref');
          const inst = instRes.recordset[0] || null;
          if (inst) {
            const docRes = await pool.request()
              .input('ref', sql.NVarChar, deal.InstructionRef)
              .query('SELECT FileName, BlobUrl FROM Documents WHERE InstructionRef=@ref');
            inst.documents = docRes.recordset || [];

            const riskRes = await pool.request()
              .input('ref', sql.NVarChar, deal.InstructionRef)
              .query('SELECT * FROM IDVerifications WHERE InstructionRef=@ref ORDER BY InternalId DESC');
            inst.idVerifications = riskRes.recordset || [];
            deal.instruction = inst;
          }
        }
      }

    }

    // ─── Instructions for this user ──────────────────────────────────────
    let instructions = [];
    const allIdVerifications = [];
    if (initials) {
      const instrResult = await pool.request()
        .input('initials', sql.NVarChar, initials)
        .query('SELECT * FROM Instructions WHERE HelixContact=@initials ORDER BY InstructionRef DESC');
      instructions = instrResult.recordset || [];

      for (const inst of instructions) {
        const docRes = await pool.request()
          .input('ref', sql.NVarChar, inst.InstructionRef)
          .query('SELECT FileName, BlobUrl FROM Documents WHERE InstructionRef=@ref');
        inst.documents = docRes.recordset || [];

        const riskRes = await pool.request()
          .input('ref', sql.NVarChar, inst.InstructionRef)
          .query('SELECT * FROM IDVerifications WHERE InstructionRef=@ref ORDER BY InternalId DESC');
        inst.idVerifications = riskRes.recordset || [];
        allIdVerifications.push(...inst.idVerifications);

        const dealRes = await pool.request()
          .input('ref', sql.NVarChar, inst.InstructionRef)
          .query('SELECT * FROM Deals WHERE InstructionRef=@ref');
        const d = dealRes.recordset[0];
        if (d) {
          const jointRes = await pool.request()
            .input('dealId', sql.Int, d.DealId)
            .query('SELECT * FROM DealJointClients WHERE DealId=@dealId ORDER BY DealJointClientId');
          d.jointClients = jointRes.recordset || [];
          inst.deal = d;
        }
      }
    }

    // ─── Single instruction by reference when requested ─────────────────
    let instruction = null;
    if (instructionRef) {
      const instRes = await pool.request()
        .input('ref', sql.NVarChar, instructionRef)
        .query('SELECT * FROM Instructions WHERE InstructionRef=@ref');
      instruction = instRes.recordset[0] || null;

      if (instruction) {
        const docRes = await pool.request()
          .input('ref', sql.NVarChar, instructionRef)
          .query('SELECT FileName, BlobUrl FROM Documents WHERE InstructionRef=@ref');
        instruction.documents = docRes.recordset || [];

        const riskRes = await pool.request()
          .input('ref', sql.NVarChar, instructionRef)
          .query('SELECT * FROM IDVerifications WHERE InstructionRef=@ref ORDER BY InternalId DESC');
        instruction.idVerifications = riskRes.recordset || [];

        const dealRes = await pool.request()
          .input('ref', sql.NVarChar, instructionRef)
          .query('SELECT * FROM Deals WHERE InstructionRef=@ref');
        const d = dealRes.recordset[0];
        if (d) {
          const jointRes = await pool.request()
            .input('dealId', sql.Int, d.DealId)
            .query('SELECT * FROM DealJointClients WHERE DealId=@dealId ORDER BY DealJointClientId');
          d.jointClients = jointRes.recordset || [];
          instruction.deal = d;
        }
      }
    }

    // ─── ID verifications by ProspectId or instruction refs ─────────────
    let idVerifications = [];
    if (prospectId != null) {
      const riskRes = await pool.request()
        .input('pid', sql.Int, prospectId)
        .query('SELECT * FROM IDVerifications WHERE ProspectId=@pid ORDER BY InternalId DESC');
      idVerifications = riskRes.recordset || [];
    } else if (initials) {
      idVerifications = allIdVerifications;
    }


    // ─── Documents by instruction ref when requested ────────────────────
    let documents = [];
    if (instructionRef && !instruction) {
      const docRes = await pool.request()
        .input('ref', sql.NVarChar, instructionRef)
        .query('SELECT * FROM Documents WHERE InstructionRef=@ref ORDER BY DocumentId');
      documents = docRes.recordset || [];
    }

    context.res = {
      status: 200,
      body: {
        deals,
        deal,
        instructions,
        instruction,
        idVerifications,
        documents
      }
    };
  } catch (err) {
    context.log.error('fetchInstructionData error:', err);
    context.res = { status: 500, body: { error: 'Failed to fetch data', detail: err.message } };
  }
};
