const sql = require('mssql');
const { getSqlPool } = require('./sqlClient');

// Columns that exist on the Instructions table. Only these fields will be
// persisted when upserting records.
const VALID_COLUMNS = [
  'stage',
  'idStatus',
  'isCompanyClient',
  'idType',
  'companyName',
  'companyNumber',
  'companyHouseNumber',
  'companyStreet',
  'companyCity',
  'companyCounty',
  'companyPostcode',
  'companyCountry',
  'title',
  'firstName',
  'lastName',
  'nationality',
  'houseNumber',
  'street',
  'city',
  'county',
  'postcode',
  'country',
  'dob',
  'gender',
  'phone',
  'email',
  'idNumber',
  'helixContact',
  'agreement',
];

function filterInstructionFields(fields) {
  const out = {};
  for (const key of Object.keys(fields || {})) {
    if (VALID_COLUMNS.includes(key)) {
      out[key] = fields[key];
    }
  }
  return out;
}

async function getInstruction(ref) {
  const pool = await getSqlPool();
  const result = await pool.request()
    .input('ref', sql.NVarChar, ref)
    .query('SELECT * FROM Instructions WHERE InstructionRef = @ref');
  return result.recordset[0];
}

async function upsertInstruction(ref, fields) {
  const pool = await getSqlPool();
  const filtered = filterInstructionFields(fields);
  const cols = Object.keys(filtered);
  const request = pool.request().input('ref', sql.NVarChar, ref);
  const setParts = [];
  const insertCols = ['InstructionRef'];
  const insertVals = ['@ref'];
  for (const col of cols) {
    setParts.push(`[${col}] = @${col}`);
    insertCols.push(`[${col}]`);
    insertVals.push(`@${col}`);
    const val = filtered[col];
    if (typeof val === 'boolean') {
      request.input(col, sql.Bit, val);
    } else {
      request.input(col, sql.NVarChar, val);
    }
  }
  const updateSql = setParts.length ? `UPDATE Instructions SET ${setParts.join(', ')} WHERE InstructionRef=@ref` : '';
  const insertSql = `INSERT INTO Instructions (${insertCols.join(', ')}) VALUES (${insertVals.join(', ')})`;
  const sqlText = `IF EXISTS (SELECT 1 FROM Instructions WHERE InstructionRef=@ref)
BEGIN
  ${updateSql};
END
ELSE
BEGIN
  ${insertSql};
END
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

module.exports = {
  getInstruction,
  upsertInstruction,
  markCompleted,
  filterInstructionFields,
};