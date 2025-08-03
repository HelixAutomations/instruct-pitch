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
  context.log('fetchEnquiriesData function triggered');

  if (req.method !== 'GET') {
    context.res = { status: 405, body: 'Method not allowed' };
    return;
  }

  const dateFrom = req.query.dateFrom;
  const dateTo = req.query.dateTo;
  const areaOfWork = req.query.areaOfWork;
  const pointOfContact = req.query.pointOfContact;
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;

  try {
    await ensureDbPassword();
    const pool = await getSqlPool();

    // ─── Fetch enquiries data with optional filters ─────────────────────
    let query = 'SELECT * FROM [dbo].[enquiries]';
    const conditions = [];
    const request = pool.request();

    // Add date range filter if provided
    if (dateFrom) {
      conditions.push('Touchpoint_Date >= @dateFrom');
      request.input('dateFrom', sql.DateTime, new Date(dateFrom));
    }

    if (dateTo) {
      conditions.push('Touchpoint_Date <= @dateTo');
      request.input('dateTo', sql.DateTime, new Date(dateTo));
    }

    // Add area of work filter if provided
    if (areaOfWork) {
      conditions.push('Area_of_Work = @areaOfWork');
      request.input('areaOfWork', sql.NVarChar, areaOfWork);
    }

    // Add point of contact filter if provided
    if (pointOfContact) {
      conditions.push('Point_of_Contact = @pointOfContact');
      request.input('pointOfContact', sql.NVarChar, pointOfContact);
    }

    // Build WHERE clause if there are conditions
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Add ordering and limit
    query += ' ORDER BY Touchpoint_Date DESC';
    
    if (limit && limit > 0) {
      query += ` OFFSET 0 ROWS FETCH NEXT ${limit} ROWS ONLY`;
    }

    context.log('Executing query:', query);
    const result = await request.query(query);
    const enquiries = result.recordset || [];

    context.log(`Fetched ${enquiries.length} enquiries`);

    context.res = {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        enquiries,
        count: enquiries.length,
        filters: {
          dateFrom,
          dateTo,
          areaOfWork,
          pointOfContact,
          limit
        }
      }
    };
  } catch (err) {
    context.log.error('fetchEnquiriesData error:', err);
    context.res = { 
      status: 500, 
      body: { 
        error: 'Failed to fetch enquiries data', 
        detail: err.message 
      } 
    };
  }
};
