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

// ──────────────────────────────────────────────────────────────────────────────
// DATABASE SCHEMA MAPPING - London Timezone Aware
// Database Schema: [id] [datetime] [stage] [claim] [poc] [pitch] [aow] [tow] [moc] 
//                  [rep] [first] [last] [email] [phone] [value] [notes] [rank] 
//                  [rating] [acid] [card_id] [source] [url] [contact_referrer] 
//                  [company_referrer] [gclid]
//
// REQUIRED: datetime, stage, aow, moc, first, last, email, source
// CONDITIONAL: rep (required if moc contains 'call')
// OPTIONAL: claim, poc, pitch, tow, phone, value, rating, acid, card_id, url, 
//           contact_referrer, company_referrer, gclid
// DEFAULTS: rank=4, stage='enquiry', source='originalForward'
// ──────────────────────────────────────────────────────────────────────────────

function getLondonDateTime() {
  // Create current time in London timezone
  const now = new Date();
  const londonTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/London" }));
  return londonTime;
}

function mapEnquiryFields(data) {
  // Parse moc to determine if rep is required
  const moc = data.moc || data.methodOfContact || data.channel || null;
  const isCallBased = moc && moc.toLowerCase().includes('call');

  return {
    // REQUIRED FIELDS
    datetime: getLondonDateTime(), // Always current London time when request is made
    stage: 'enquiry', // Default stage for all new enquiries
    aow: data.aow || data.areaOfWork || data.practice || data.service || null, // REQUIRED
    moc: moc, // REQUIRED
    first: data.first || data.firstName || data.first_name || data.fname || null, // REQUIRED
    last: data.last || data.lastName || data.last_name || data.lname || null, // REQUIRED
    email: data.email || data.emailAddress || null, // REQUIRED
    source: 'originalForward', // Default source classification

    // CONDITIONAL FIELDS
    rep: isCallBased ? (data.rep || data.representative || null) : null, // Required if moc contains 'call'

    // OPTIONAL FIELDS
    claim: null, // Will be updated later
    poc: null, // Will be updated later  
    pitch: null, // Will be updated later
    tow: data.tow || data.typeOfWork || null, // Optional
    phone: data.phone || data.phoneNumber || data.tel || null, // Optional
    value: data.value || data.amount || data.estimatedValue || null, // Optional
    notes: data.notes || data.message || data.details || null, // Optional
    rank: '4', // Default rank
    rating: data.rating || null, // Optional
    acid: data.acid || data.activecampaignId || data.contactId || null, // Optional
    card_id: data.card_id || data.cardId || null, // Optional
    url: data.url || data.referralUrl || null, // Optional
    contact_referrer: data.contact_referrer || data.referredBy || null, // Optional
    company_referrer: data.company_referrer || data.referringCompany || null, // Optional
    gclid: data.gclid || (data.url && data.url.includes('gclid') ? extractGclid(data.url) : null) // Optional
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// DATA TRANSFORMATION UTILITIES
// ──────────────────────────────────────────────────────────────────────────────

function extractGclid(url) {
  if (!url) return null;
  const match = url.match(/[?&]gclid=([^&]+)/);
  return match ? match[1] : null;
}

function transformPhoneNumber(phone) {
  if (!phone) return null;

  // Remove all non-digits
  const digitsOnly = phone.replace(/\D/g, '');

  // UK phone number transformations
  if (digitsOnly.startsWith('07') && digitsOnly.length === 11) {
    return `+44${digitsOnly.substring(1)}`;
  } else if (digitsOnly.startsWith('447') && digitsOnly.length === 12) {
    return `+${digitsOnly}`;
  }

  return phone; // Return original if no transformation needed
}

function transformName(name) {
  if (!name) return null;

  // Title case transformation
  return name.toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function transformEmail(email) {
  if (!email) return null;
  return email.toLowerCase().trim();
}

function validateRank(rank) {
  const validRanks = ['1', '2', '3', '4', '5'];
  return validRanks.includes(String(rank)) ? String(rank) : '4';
}

function ensureDateTime(dateValue) {
  if (!dateValue) return new Date();
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === 'string') {
    // Try parsing the date string
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  return new Date();
}

// ──────────────────────────────────────────────────────────────────────────────
// VALIDATION FUNCTIONS
// ──────────────────────────────────────────────────────────────────────────────

function validateRequiredFields(mappedData) {
  const errors = [];

  // Required fields validation
  if (!mappedData.aow) errors.push('aow (Area of Work) is required');
  if (!mappedData.moc) errors.push('moc (Method of Contact) is required');
  if (!mappedData.first) errors.push('first (First Name) is required');
  if (!mappedData.last) errors.push('last (Last Name) is required');
  if (!mappedData.email) errors.push('email is required');

  // Conditional validation: rep required if moc contains 'call'
  if (mappedData.moc && mappedData.moc.toLowerCase().includes('call') && !mappedData.rep) {
    errors.push('rep (Representative) is required when method of contact contains "call"');
  }

  return errors;
}

// ──────────────────────────────────────────────────────────────────────────────
// ACTIVECAMPAIGN INTEGRATION FUNCTIONS (Basic contact checking)
// ──────────────────────────────────────────────────────────────────────────────

async function processActiveCampaignIntegration(mappedData, updateAC = false) {
  if (!updateAC || !mappedData.email) {
    return { processed: false, reason: updateAC ? 'No email provided' : 'AC processing disabled' };
  }

  try {
    // Check if contact exists in ActiveCampaign
    const existingContactId = await checkActiveCampaignContact(mappedData.email);

    if (existingContactId) {
      // Update existing contact
      await updateActiveCampaignContact(existingContactId, mappedData);
      return { processed: true, action: 'updated', contactId: existingContactId };
    } else {
      // Create new contact
      const newContactId = await createActiveCampaignContact(mappedData);
      return { processed: true, action: 'created', contactId: newContactId };
    }
  } catch (error) {
    return { processed: false, error: error.message };
  }
}

async function checkActiveCampaignContact(email) {
  // TODO: Implement ActiveCampaign API call to check if contact exists
  // This is a placeholder for basic contact checking functionality
  // When implemented, this should return the contact ID if found, null if not found
  return null;
}

async function updateActiveCampaignContact(contactId, data) {
  // TODO: Implement ActiveCampaign API call to update existing contact
  // This is a placeholder for contact update functionality
  return null;
}

async function createActiveCampaignContact(data) {
  // TODO: Implement ActiveCampaign API call to create new contact
  // This is a placeholder for contact creation functionality
  return null;
}

// ──────────────────────────────────────────────────────────────────────────────
// CORE MAPPING FUNCTION
// ──────────────────────────────────────────────────────────────────────────────

function mapEnquiryData(sourceData, sourceType = 'generic') {
  // Map the data to our database schema
  const mappedData = mapEnquiryFields(sourceData);

  // Apply post-mapping transformations
  mappedData.phone = transformPhoneNumber(mappedData.phone);
  mappedData.first = transformName(mappedData.first);
  mappedData.last = transformName(mappedData.last);
  mappedData.email = transformEmail(mappedData.email);
  mappedData.rank = validateRank(mappedData.rank);
  mappedData.datetime = ensureDateTime(mappedData.datetime);

  return mappedData;
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN FUNCTION
// ──────────────────────────────────────────────────────────────────────────────

module.exports = async function (context, req) {
  context.log('processEnquiry function triggered');

  // ──────────────────────────────────────────────────────────────────────────────
  // PAYLOAD LOGGING - ALWAYS LOG FOR DEBUGGING
  // ──────────────────────────────────────────────────────────────────────────────
  context.log('=== PAYLOAD LOGGING START ===');
  context.log('Request method:', req.method);
  context.log('Request query:', JSON.stringify(req.query, null, 2));
  context.log('Request headers:', JSON.stringify(req.headers, null, 2));
  context.log('Request body (raw):', JSON.stringify(req.body, null, 2));
  context.log('=== PAYLOAD LOGGING END ===');

  if (req.method !== 'POST') {
    context.res = { status: 405, body: 'Method not allowed' };
    return;
  }

  try {
    // Parse request body (accept empty body and proceed)
    const requestBody = req.body || {};
    if (!req.body) {
      context.log('WARN: Request body is empty or null - proceeding with empty object');
    }

    // Extract source type, data, and ActiveCampaign flag
    const sourceType = req.query.source || requestBody.source || 'originalForward';
    const sourceData = requestBody.data || requestBody;
    const updateAC = req.query.updateAC === 'true' || requestBody.updateAC === true || false;

    context.log(`Processing enquiry from source: ${sourceType}`);
    context.log(`ActiveCampaign processing: ${updateAC ? 'ENABLED' : 'DISABLED'}`);
    context.log('Source data received:', JSON.stringify(sourceData, null, 2));

    // Map the source data to our database schema
    const mappedData = mapEnquiryData(sourceData, sourceType);
    context.log('Mapped enquiry data:', JSON.stringify(mappedData, null, 2));

    // Validate required fields but do NOT fail the request here; convert to warnings
    const validationErrors = validateRequiredFields(mappedData);
    const validationWarnings = [];
    if (validationErrors.length > 0) {
      context.log('WARN: Validation issues -', validationErrors.join(', '));
      validationWarnings.push(...validationErrors);
    }

  // Identify and log source (try query param, body.source, mappedData.source, fallback to 'Undefined')
  const identifiedSource = (req.query && req.query.source) || requestBody.source || mappedData.source || sourceType || 'Undefined';
  context.log('Identified incoming source:', identifiedSource);

  // Feature flag: enable DB insert via env or query param. Default: disabled (dry-run)
  const enableInsert = (process.env.ENABLE_DB_INSERT === 'true') || (req.query && req.query.enableInsert === 'true');
  context.log(`DB insert enabled: ${enableInsert}`);

    // Process ActiveCampaign integration if enabled
    let activeCampaignResult = null;
    if (updateAC) {
      context.log('Processing ActiveCampaign integration...');
      activeCampaignResult = await processActiveCampaignIntegration(mappedData, updateAC);
      context.log('ActiveCampaign result:', JSON.stringify(activeCampaignResult, null, 2));

      // Update acid field if we got a contact ID from ActiveCampaign
      if (activeCampaignResult.processed && activeCampaignResult.contactId) {
        mappedData.acid = activeCampaignResult.contactId;
        context.log(`Updated acid field with ActiveCampaign contact ID: ${activeCampaignResult.contactId}`);
      }
    }

    // Prepare SQL insert and execute only if enabled. Otherwise perform dry-run (no DB changes).
    let insertResult = { rowsAffected: [0] };
    if (enableInsert) {
      // Connect to database
      context.log('Connecting to database...');
      await ensureDbPassword();
      const pool = await getSqlPool();
      context.log('Database connection established');

      // Prepare SQL insert query - note: [id] is IDENTITY so we don't insert it
      const insertQuery = `
      INSERT INTO [dbo].[enquiries] (
        [datetime], [stage], [claim], [poc], [pitch], [aow], [tow], [moc], 
        [rep], [first], [last], [email], [phone], [value], [notes], [rank], 
        [rating], [acid], [card_id], [source], [url], [contact_referrer], 
        [company_referrer], [gclid]
      ) VALUES (
        @datetime, @stage, @claim, @poc, @pitch, @aow, @tow, @moc, 
        @rep, @first, @last, @email, @phone, @value, @notes, @rank, 
        @rating, @acid, @card_id, @source, @url, @contact_referrer, 
        @company_referrer, @gclid
      )`;

      const request = pool.request();

      // Helper to safely bind SQL parameters without throwing on bad types or nulls
      function safeInput(reqObj, name, type, value) {
        if (value === undefined || value === null || value === '') {
          reqObj.input(name, type, null);
          return;
        }
        // Dates: ensure Date object
        if (type === sql.DateTime) {
          reqObj.input(name, type, ensureDateTime(value));
          return;
        }
        // Integers: coerce safely
        if (type === sql.Int) {
          const n = parseInt(value, 10);
          reqObj.input(name, type, Number.isNaN(n) ? null : n);
          return;
        }
        // Default: pass value (strings will be converted)
        reqObj.input(name, type, value);
      }

      // Add parameters with safe handling
      safeInput(request, 'datetime', sql.DateTime, mappedData.datetime);
      safeInput(request, 'stage', sql.NVarChar(50), mappedData.stage);
      safeInput(request, 'claim', sql.DateTime, mappedData.claim);
      safeInput(request, 'poc', sql.NVarChar(100), mappedData.poc);
      safeInput(request, 'pitch', sql.Int, mappedData.pitch);
      safeInput(request, 'aow', sql.NVarChar(100), mappedData.aow);
      safeInput(request, 'tow', sql.NVarChar(100), mappedData.tow);
      safeInput(request, 'moc', sql.NVarChar(50), mappedData.moc);
      safeInput(request, 'rep', sql.NVarChar(100), mappedData.rep);
      safeInput(request, 'first', sql.NVarChar(100), mappedData.first);
      safeInput(request, 'last', sql.NVarChar(100), mappedData.last);
      safeInput(request, 'email', sql.NVarChar(255), mappedData.email);
      safeInput(request, 'phone', sql.NVarChar(50), mappedData.phone);
      safeInput(request, 'value', sql.NVarChar(100), mappedData.value);
      safeInput(request, 'notes', sql.NVarChar(sql.MAX), mappedData.notes);
      safeInput(request, 'rank', sql.NVarChar(50), mappedData.rank);
      safeInput(request, 'rating', sql.NVarChar(50), mappedData.rating);
      safeInput(request, 'acid', sql.NVarChar(100), mappedData.acid);
      safeInput(request, 'card_id', sql.NVarChar(100), mappedData.card_id);
      safeInput(request, 'source', sql.NVarChar(100), mappedData.source);
      safeInput(request, 'url', sql.NVarChar(sql.MAX), mappedData.url);
      safeInput(request, 'contact_referrer', sql.NVarChar(100), mappedData.contact_referrer);
      safeInput(request, 'company_referrer', sql.NVarChar(100), mappedData.company_referrer);
      safeInput(request, 'gclid', sql.NVarChar(255), mappedData.gclid);

      context.log('Executing SQL insert...');
      context.log('SQL Query:', insertQuery);

      // Execute the insert
      insertResult = await request.query(insertQuery);
      context.log(`SUCCESS: Enquiry inserted from source ${sourceType}. Rows affected: ${insertResult.rowsAffected[0]}`);
    } else {
      context.log('DB insert disabled by feature flag - performing dry-run (no DB operations)');
    }

  context.log(`SUCCESS: Enquiry inserted from source ${sourceType}. Rows affected: ${result.rowsAffected[0]}`);

    // Return success response
    context.res = {
      status: 201,
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        success: true,
        message: 'Enquiry inserted successfully',
        sourceType: sourceType,
        identifiedSource: identifiedSource,
        validationWarnings: validationWarnings,
        rowsAffected: result.rowsAffected[0],
        insertedData: mappedData,
        activeCampaign: activeCampaignResult,
        timestamp: new Date().toISOString(),
        londonTime: getLondonDateTime().toISOString()
      }
    };

  } catch (err) {
    context.log.error('=== ERROR in processEnquiry ===');
    context.log.error('Error message:', err.message);
    context.log.error('Error stack:', err.stack);
    context.log.error('Request source type:', req.query.source || req.body?.source || 'unknown');
    context.log.error('Request body:', JSON.stringify(req.body, null, 2));

    // Determine if it's a validation error or system error
    const isValidationError = err.message && (
      err.message.includes('Invalid column name') ||
      err.message.includes('Cannot insert') ||
      err.message.includes('constraint') ||
      err.message.includes('duplicate') ||
      err.message.includes('foreign key')
    );

    context.res = {
      status: isValidationError ? 400 : 500,
      body: {
        error: isValidationError ? 'Data validation error' : 'Failed to process enquiry',
        detail: err.message,
        sourceType: req.query.source || req.body?.source || 'unknown',
        timestamp: new Date().toISOString()
      }
    };
  }
};
