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
  const cols = Object.keys(fields || {});
  const request = pool.request().input('ref', sql.NVarChar, ref);
  const setParts = [];
  const insertCols = ['InstructionRef'];
  const insertVals = ['@ref'];
  for (const col of cols) {
    setParts.push(`[${col}] = @${col}`);
    insertCols.push(`[${col}]`);
    insertVals.push(`@${col}`);
    const val = fields[col];
    request.input(col, sql.NVarChar, val == null ? null : String(val));
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

module.exports = { getInstruction, upsertInstruction, markCompleted };