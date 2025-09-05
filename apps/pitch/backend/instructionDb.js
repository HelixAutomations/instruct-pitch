const sql = require('mssql')
const { getSqlPool } = require('./sqlClient')

// Solicitor mapping based on PitchedBy field - looks up team member by initials
async function getSolicitorInfo(pitchedBy) {
  if (!pitchedBy) {
    return {
      SolicitorName: 'Support Team',
      SolicitorTitle: 'Litigation Team',
      SolicitorEmail: 'support@helix-law.com',
      SolicitorPhone: '0345 314 2044'
    };
  }

  try {
    const pool = await getSqlPool();
    const result = await pool.request()
      .input('initials', sql.NVarChar(10), pitchedBy)
      .query(`
        SELECT [Full Name] as FullName, [Email] as Email
        FROM [dbo].[team] 
        WHERE [Initials] = @initials
      `);

    if (result.recordset.length > 0) {
      const teamMember = result.recordset[0];
      return {
        SolicitorName: teamMember.FullName || 'Team Member',
        SolicitorTitle: 'Solicitor',
        SolicitorEmail: teamMember.Email || 'support@helix-law.com',
        SolicitorPhone: '0345 314 2044' // Default phone as not in team table
      };
    } else {
      // Fallback if initials not found
      return {
        SolicitorName: 'Support Team',
        SolicitorTitle: 'Litigation Team',
        SolicitorEmail: 'support@helix-law.com',
        SolicitorPhone: '0345 314 2044'
      };
    }
  } catch (error) {
    console.error('Error fetching solicitor info:', error);
    // Return fallback on error
    return {
      SolicitorName: 'Support Team',
      SolicitorTitle: 'Litigation Team',
      SolicitorEmail: 'support@helix-law.com',
      SolicitorPhone: '0345 314 2044'
    };
  }
}

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
        AND UPPER(Status) <> 'CLOSED'
    ORDER BY DealId DESC
  `)
  return result.recordset[0]
}

// Similar to getDealByPasscode but do NOT filter out deals that already
// have an InstructionRef. Useful for read-only checks like generating
// an instructionRef for an existing deal. Also allows access to closed deals
// when they have an InstructionRef (for viewing completed instructions).
async function getDealByPasscodeIncludingLinked(passcode, prospectId) {
  const pool = await getSqlPool()
  const request = pool.request()
    .input('code', sql.NVarChar, passcode)
  if (prospectId != null) {
    request.input('pid', sql.Int, prospectId)
  }
  const wherePid = prospectId != null ? 'AND ProspectId = @pid' : ''
  const result = await request.query(`
      SELECT TOP 1 DealId, ProspectId, InstructionRef, ServiceDescription, Amount, AreaOfWork, PitchedBy
      FROM Deals
      WHERE Passcode = @code ${wherePid}
        AND (UPPER(Status) <> 'CLOSED' OR InstructionRef IS NOT NULL)
      ORDER BY DealId DESC
    `)
  
  const deal = result.recordset[0];
  if (deal && deal.PitchedBy) {
    // Add solicitor information based on who pitched the deal
    const solicitorInfo = await getSolicitorInfo(deal.PitchedBy);
    Object.assign(deal, solicitorInfo);
  }
  
  return deal;
}

// Lookup a deal by ProspectId (useful when the route contains the ProspectId)
async function getDealByProspectId(prospectId) {
  const pool = await getSqlPool()
  const result = await pool.request()
    .input('pid', sql.Int, prospectId)
    .query(`
      SELECT TOP 1 DealId, ProspectId, Passcode, InstructionRef, ServiceDescription, Amount, AreaOfWork, PitchedBy
      FROM Deals
      WHERE ProspectId = @pid
        AND UPPER(Status) <> 'CLOSED'
      ORDER BY DealId DESC
    `)
  
  const deal = result.recordset[0];
  if (deal && deal.PitchedBy) {
    // Add solicitor information based on who pitched the deal
    const solicitorInfo = await getSolicitorInfo(deal.PitchedBy);
    Object.assign(deal, solicitorInfo);
  }
  
  return deal;
}

// Given a passcode, return the existing InstructionRef on the matching deal
// or create one in the format HLX-<ProspectId>-<Passcode> and persist it
// to that specific Deal row. Returns the InstructionRef string or null
// if no matching deal (or ProspectId) can be found.
async function getOrCreateInstructionRefForPasscode(passcode, prospectId) {
  const pool = await getSqlPool()
  // Use the include-linked variant so we can read an existing InstructionRef
  const deal = await getDealByPasscodeIncludingLinked(passcode, prospectId || null)
  if (!deal) return null

  // If an InstructionRef already exists, return it unchanged.
  if (deal.InstructionRef && String(deal.InstructionRef).trim() !== '') {
    return deal.InstructionRef
  }

  // Need a ProspectId to construct the HLX-<cid>-<passcode> value.
  const pid = deal.ProspectId
  if (!pid) return null

  const newRef = `HLX-${pid}-${passcode}`

  // Persist the generated InstructionRef to the specific Deal row we queried.
  await pool.request()
    .input('ref', sql.NVarChar, newRef)
    .input('dealId', sql.Int, deal.DealId)
    .query(`
      UPDATE Deals SET InstructionRef=@ref
      WHERE DealId = @dealId
    `)

  return newRef
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
    'AliasId','OrderId','SHASign','PaymentTimestamp','SolicitorId'
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
    } else if (col === 'HelixContact') {
      const initials = val == null ? null : String(val)
        .split(' ')
        .filter(Boolean)
        .map(w => w[0].toUpperCase())
        .join('')
      request.input(col, sql.NVarChar, initials)
    } else if (col === 'SolicitorId') {
      const initials = val == null ? null : String(val)
        .split(' ')
        .filter(Boolean)
        .map(w => w[0].toUpperCase())
        .join('')
      request.input(col, sql.NVarChar, initials)
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

function getCheckResult(data, typeId) {
  const status = (data.checkStatuses || []).find(c => c.checkTypeId === typeId);
  return status && status.result && status.result.result;
}

function getProspectId(ref) {
  const match = /HLX-(\d+)-/.exec(ref || '');
  return match ? Number(match[1]) : null;
}

async function insertIDVerification(instructionRef, email, response) {
  const pool = await getSqlPool();
  const res0 = response?.[0] ?? {};
  const payload = JSON.stringify(res0);
  const now = new Date();

  const status =
    res0?.overallStatus?.status?.toLowerCase() === 'completed'
      ? 'completed'
      : 'pending';

  const overall = res0?.overallResult?.result || null;
  const pep = getCheckResult(res0, 2);
  const address = getCheckResult(res0, 1);
  const correlation = res0?.correlationId || null;
  const prospectId = getProspectId(instructionRef);

  const expiry = new Date(now);
  expiry.setMonth(expiry.getMonth() + 6);

  return pool.request()
    .input('InstructionRef', sql.NVarChar, instructionRef)
    .input('ProspectId', sql.Int, prospectId)
    .input('ClientEmail', sql.VarChar, email)
    .input('IsLeadClient', sql.Bit, 0)
    .input('EIDCheckId', sql.NVarChar, correlation)
    .input('EIDRawResponse', sql.NVarChar, payload)
    .input('EIDCheckedDate', sql.Date, now)
    .input('EIDCheckedTime', sql.Time, now)
    .input('EIDStatus', sql.VarChar, status)
    .input('EIDProvider', sql.VarChar, 'tiller')
    .input('CheckExpiry', sql.Date, expiry)
    .input('EIDOverallResult', sql.NVarChar, overall)
    .input('PEPAndSanctionsCheckResult', sql.NVarChar, pep)
    .input('AddressVerificationResult', sql.NVarChar, address)
    .query(`
    INSERT INTO [dbo].[IDVerifications] (
        InstructionRef,
        ProspectId,
        ClientEmail,
        IsLeadClient,
        EIDCheckId,
        EIDRawResponse,
        EIDCheckedDate,
        EIDCheckedTime,
        EIDStatus,
        EIDProvider,
        CheckExpiry,
        EIDOverallResult,
        PEPAndSanctionsCheckResult,
        AddressVerificationResult
      ) VALUES (
        @InstructionRef,
        @ProspectId,
        @ClientEmail,
        @IsLeadClient,
        @EIDCheckId,
        @EIDRawResponse,
        @EIDCheckedDate,
        @EIDCheckedTime,
        @EIDStatus,
        @EIDProvider,
        @CheckExpiry,
        @EIDOverallResult,
        @PEPAndSanctionsCheckResult,
        @AddressVerificationResult
      )
    `);
}

module.exports = {
  getInstruction,
  getLatestDeal,
  getDealByPasscode,
  getDealByPasscodeIncludingLinked,
  getDealByProspectId,
  getOrCreateInstructionRefForPasscode,
  upsertInstruction,
  markCompleted,
  attachInstructionRefToDeal,
  closeDeal,
  getDocumentsForInstruction,
  insertIDVerification
}
