const sql = require('mssql')
const { getSqlPool } = require('./sqlClient')

async function getInstruction(ref) {
  const pool = await getSqlPool()
  const result = await pool.request()
    .input('ref', sql.NVarChar, ref)
    .query('SELECT * FROM Instructions WHERE InstructionRef = @ref')
  return result.recordset[0]
}

async function getLatestDeal(prospectId) {
  const pool = await getSqlPool()
  const result = await pool.request()
    .input('pid', sql.Int, prospectId)
    .query(`
      SELECT TOP 1 ServiceDescription, Amount, AreaOfWork
      FROM Deals
      WHERE ProspectId = @pid
        AND (InstructionRef IS NULL OR InstructionRef = '')
      ORDER BY DealId DESC
    `)
  return result.recordset[0]
}

async function getDealByPasscode(passcode, prospectId) {
  const pool = await getSqlPool()
  const request = pool.request()
    .input('code', sql.NVarChar, passcode)
  if (prospectId != null) {
    request.input('pid', sql.Int, prospectId)
  }
  const wherePid = prospectId != null ? 'AND ProspectId = @pid' : ''
  const result = await request.query(`
      SELECT TOP 1 DealId, ProspectId, ServiceDescription, Amount, AreaOfWork
      FROM Deals
      WHERE Passcode = @code ${wherePid}
        AND (InstructionRef IS NULL OR InstructionRef = '')
    `)
  return result.recordset[0]
}

async function upsertInstruction(ref, fields) {
  const pool = await getSqlPool()
  const allowed = new Set([
    'Stage','ClientType','HelixContact','ConsentGiven','InternalStatus',
    'SubmissionDate','SubmissionTime','LastUpdated','ClientId','RelatedClientId','MatterId',
    'Title','FirstName','LastName','Nationality','NationalityAlpha2','DOB','Gender',
    'Phone','Email','PassportNumber','DriversLicenseNumber','IdType',
    'HouseNumber','Street','City','County','Postcode','Country','CountryCode',
    'CompanyName','CompanyNumber','CompanyHouseNumber','CompanyStreet','CompanyCity',
    'CompanyCounty','CompanyPostcode','CompanyCountry','CompanyCountryCode',
    'Notes','PaymentMethod','PaymentResult','PaymentAmount','PaymentProduct',
    'AliasId','OrderId','SHASign','PaymentTimestamp'
  ])
  const request = pool.request().input('ref', sql.NVarChar, ref)
  const setParts = []
  const insertCols = ['InstructionRef']
  const insertVals = ['@ref']
  const columnMap = { dob: 'DOB', shaSign: 'SHASign' }

  for (const [key, val] of Object.entries(fields || {})) {
    const col = columnMap[key] || key.charAt(0).toUpperCase() + key.slice(1)
    if (!allowed.has(col)) continue
    setParts.push(`[${col}] = @${col}`)
    insertCols.push(`[${col}]`)
    insertVals.push(`@${col}`)

    if (col === 'ConsentGiven') {
      request.input(col, sql.Bit, Boolean(val))
    } else if (['DOB','SubmissionDate','PaymentTimestamp'].includes(col)) {
      let dateVal = null
      if (val) {
        const d = new Date(val)
        if (!isNaN(d)) dateVal = d
      }
      request.input(col, sql.DateTime2, dateVal)
    } else if (col === 'PaymentAmount') {
      request.input(col, sql.Decimal(18, 2), val != null ? Number(val) : null)
    } else {
      request.input(col, sql.NVarChar, val == null ? null : String(val))
    }
  }

  const updateSql = setParts.length
    ? `UPDATE Instructions SET ${setParts.join(', ')} WHERE InstructionRef=@ref`
    : ''
  const insertSql = `INSERT INTO Instructions (${insertCols.join(',')}) VALUES (${insertVals.join(',')})`

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
      SELECT * FROM Instructions WHERE InstructionRef=@ref;`

  const result = await request.query(sqlText)
  return result.recordset[result.recordset.length - 1]
}

async function markCompleted(ref) {
  const pool = await getSqlPool()
  const result = await pool.request()
    .input('ref', sql.NVarChar, ref)
    .query(`
      UPDATE Instructions SET Stage='completed'
      WHERE InstructionRef=@ref;
      SELECT * FROM Instructions WHERE InstructionRef=@ref;
    `)
  return result.recordset[0]
}

async function updatePaymentStatus(
  ref,
  method,
  success,
  amount,
  product,
  aliasId,
  orderId,
  shaSign
) {
  const pool = await getSqlPool()
  const paymentResult = method === 'card'
    ? (success ? 'successful' : 'rejected')
    : 'verifying'
  const internalStatus = method === 'card'
    ? (success ? 'paid' : null)
    : 'paid'

  const request = pool.request()
    .input('InstructionRef',   sql.NVarChar,  ref)
    .input('PaymentMethod',    sql.NVarChar,  method)
    .input('PaymentResult',    sql.NVarChar,  paymentResult)
    .input('PaymentAmount',    sql.Decimal(18,2), amount != null ? Number(amount) : null)
    .input('PaymentProduct',   sql.NVarChar,  product || null)
    .input('AliasId',          sql.NVarChar,  aliasId)
    .input('OrderId',          sql.NVarChar,  orderId)
    .input('SHASign',          sql.NVarChar,  shaSign)
    .input('PaymentTimestamp', sql.DateTime2, new Date())
    .input('InternalStatus',   sql.NVarChar,  internalStatus)

  await request.query(`
    UPDATE Instructions SET
      PaymentMethod    = @PaymentMethod,
      PaymentResult    = @PaymentResult,
      PaymentAmount    = COALESCE(@PaymentAmount, PaymentAmount),
      PaymentProduct   = COALESCE(@PaymentProduct, PaymentProduct),
      AliasId          = @AliasId,
      OrderId          = @OrderId,
      SHASign          = @SHASign,
      PaymentTimestamp = @PaymentTimestamp,
      InternalStatus   = CASE WHEN @InternalStatus IS NOT NULL THEN @InternalStatus ELSE InternalStatus END,
      LastUpdated      = SYSUTCDATETIME()
    WHERE InstructionRef = @InstructionRef
  `)
}

async function attachInstructionRefToDeal(ref) {
  const match = /^HLX-(\d+)-/.exec(ref)
  if (!match) return
  const pid = Number(match[1])
  const pool = await getSqlPool()
  await pool.request()
    .input('ref', sql.NVarChar, ref)
    .input('pid', sql.Int, pid)
    .query(`
      UPDATE Deals SET InstructionRef=@ref
      WHERE DealId = (
        SELECT TOP 1 DealId FROM Deals
        WHERE ProspectId=@pid AND (InstructionRef IS NULL OR InstructionRef='')
        ORDER BY DealId DESC
      )
    `)
}

async function closeDeal(ref) {
  const pool = await getSqlPool()
  const now = new Date()
  await pool.request()
    .input('ref', sql.NVarChar, ref)
    .input('date', sql.Date, now)
    .input('time', sql.Time, now)
    .query(`
      UPDATE Deals
        SET Status='closed',
            CloseDate=@date,
            CloseTime=@time
        WHERE InstructionRef=@ref;

      IF @@ROWCOUNT = 0
        INSERT INTO Deals (InstructionRef, Status, CloseDate, CloseTime)
        VALUES (@ref, 'closed', @date, @time);
    `)
}

async function getDocumentsForInstruction(ref) {
  const pool = await getSqlPool()
  const result = await pool.request()
    .input('ref', sql.NVarChar, ref)
    .query('SELECT FileName, BlobUrl FROM Documents WHERE InstructionRef=@ref')
  return result.recordset || []
}

module.exports = {
  getInstruction,
  getLatestDeal,
  getDealByPasscode,
  upsertInstruction,
  markCompleted,
  updatePaymentStatus,
  attachInstructionRefToDeal,
  closeDeal,
  getDocumentsForInstruction
}
