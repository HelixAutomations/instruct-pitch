const sql = require('mssql');
const { getSqlPool } = require('./sqlClient');

async function getInstruction(ref) {
  const pool = await getSqlPool();
  const result = await pool.request()
    .input('ref', sql.NVarChar, ref)
    .query('SELECT * FROM Instructions WHERE InstructionRef = @ref');
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
  const cols = Object.keys(fields || {}).filter(c => allowed.has(c));
  const request = pool.request().input('ref', sql.NVarChar, ref);
  const setParts = [];
  const insertCols = ['InstructionRef'];
  const insertVals = ['@ref'];
  for (const col of cols) {
    setParts.push(`[${col}] = @${col}`);
    insertCols.push(`[${col}]`);
    insertVals.push(`@${col}`);
    const val = fields[col];
  if (['ConsentGiven'].includes(col)) {
    request.input(col, sql.Bit, Boolean(val));
  } else if (['DOB', 'SubmissionDate', 'PaymentTimestamp'].includes(col)) {
    request.input(col, sql.DateTime2, val ? new Date(val) : null);
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

module.exports = { getInstruction, upsertInstruction, markCompleted };