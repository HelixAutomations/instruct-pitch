const sql = require('mssql');
const { getSqlPool } = require('./sqlClient');

async function getInstruction(ref) {
  const pool = await getSqlPool();
  const result = await pool.request()
    .input('ref', sql.NVarChar, ref)
    .query('SELECT * FROM Instructions WHERE InstructionRef = @ref');
  return result.recordset[0];
}

async function getLatestDeal(prospectId) {
  const pool = await getSqlPool();
  const result = await pool.request()
    .input('pid', sql.Int, prospectId)
    .query(`SELECT TOP 1 ServiceDescription, Amount, AreaOfWork
            FROM Deals
            WHERE ProspectId = @pid
            ORDER BY DealId DESC`);
  return result.recordset[0];
}

async function upsertInstruction(ref, fields) {
  const pool = await getSqlPool();
  const allowed = new Set([
    'Stage', 'ClientType', 'HelixContact', 'ConsentGiven', 'InternalStatus',
    'SubmissionDate', 'SubmissionTime', 'LastUpdated', 'ClientId', 'RelatedClientId', 'MatterId',
    'Title', 'FirstName', 'LastName', 'Nationality', 'NationalityAlpha2', 'DOB', 'Gender',
    'Phone', 'Email', 'PassportNumber', 'DriversLicenseNumber', 'IdType',
    'HouseNumber', 'Street', 'City', 'County', 'Postcode', 'Country', 'CountryCode',
    'CompanyName', 'CompanyNumber', 'CompanyHouseNumber', 'CompanyStreet', 'CompanyCity',
    'CompanyCounty', 'CompanyPostcode', 'CompanyCountry', 'CompanyCountryCode',
    'Notes', 'PaymentMethod', 'PaymentResult', 'PaymentAmount', 'PaymentProduct',
    'AliasId', 'OrderId', 'SHASign', 'PaymentTimestamp'
  ]);
  const request = pool.request().input('ref', sql.NVarChar, ref);
  const setParts = [];
  const insertCols = ['InstructionRef'];
  const insertVals = ['@ref'];
  const columnMap = { dob: 'DOB', shaSign: 'SHASign' };

  for (const [key, val] of Object.entries(fields || {})) {
    const col = columnMap[key] || key.charAt(0).toUpperCase() + key.slice(1);
    if (!allowed.has(col)) continue;
    setParts.push(`[${col}] = @${col}`);
    insertCols.push(`[${col}]`);
    insertVals.push(`@${col}`);

    if (['ConsentGiven'].includes(col)) {
      request.input(col, sql.Bit, Boolean(val));
    } else if (['DOB', 'SubmissionDate', 'PaymentTimestamp'].includes(col)) {
      let dateVal = null;
      if (val) {
        const d = new Date(val);
        if (!isNaN(d)) dateVal = d;
      }
      request.input(col, sql.DateTime2, dateVal);
    } else if (['PaymentAmount'].includes(col)) {
      request.input(col, sql.Decimal(18, 2), val != null ? Number(val) : null);
    } else {
      request.input(col, sql.NVarChar, val == null ? null : String(val));
    }
  }
  const updateSql = setParts.length ? `UPDATE Instructions SET ${setParts.join(', ')} WHERE InstructionRef=@ref` : '';
  const insertSql = `INSERT INTO Instructions (${insertCols.join(', ')}) VALUES (${insertVals.join(', ')})`;
  const sqlText = setParts.length
    ? `IF EXISTS (SELECT 1 FROM Instructions WHERE InstructionRef=@ref)
  BEGIN
    ${updateSql};
  END
  ELSE
  BEGIN
    ${insertSql};
  END
  SELECT * FROM Instructions WHERE InstructionRef=@ref;`
    : `${insertSql};
  SELECT * FROM Instructions WHERE InstructionRef=@ref;`;
  const result = await request.query(sqlText);
  return result.recordset[result.recordset.length - 1];
}

async function markCompleted(ref) {
  const pool = await getSqlPool();
  const result = await pool.request()
    .input('ref', sql.NVarChar, ref)
    .query("UPDATE Instructions SET Stage='completed' WHERE InstructionRef=@ref; SELECT * FROM Instructions WHERE InstructionRef=@ref;");
  return result.recordset[0];
}

module.exports = { getInstruction, upsertInstruction, markCompleted, getLatestDeal };