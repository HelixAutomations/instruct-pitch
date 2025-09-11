const ALLOWED_FIELDS = [
  // Client/instruction level fields
  'clientId',
  'clientType',
  'amount',
  'product',
  'workType',

  // Company details
  'companyName',
  'companyNumber',
  'companyHouseNumber',
  'companyStreet',
  'companyCity',
  'companyCounty',
  'companyPostcode',
  'companyCountry',

  // Personal details
  'title',
  'firstName',
  'lastName',
  'nationality',
  'nationalityAlpha2',
  'houseNumber',
  'street',
  'city',
  'county',
  'postcode',
  'country',
  'countryCode',
  'dob',
  'gender',
  'phone',
  'email',

  // Identification
  'passportNumber',
  'driversLicenseNumber',
  'idType',

  // Misc
  'helixContact',
  'agreement',
  'nationalityCode',
  'companyCountryCode',
  'aliasId',
  'orderId',
  'shaSign',
  'paymentAmount',
  'paymentProduct',
  'paymentMethod',
  'paymentResult',

  // allow consent & status updates
  'consentGiven',
  'internalStatus',
 ];

function toTitleCase(str) {
  return str
    .toLowerCase()
    .replace(/\b\w+/g, w => w.charAt(0).toUpperCase() + w.slice(1));
}

function normalizeInstruction(data) {
  console.log('[NORMALIZE] Starting normalization');
  console.log('[NORMALIZE] Input data keys:', Object.keys(data || {}));
  console.log('[NORMALIZE] Input data:', data);
  
  const out = { ...data };

  // Standardize casing for names and contact
  if (out.firstName) {
    console.log('[NORMALIZE] Processing firstName:', out.firstName);
    out.firstName = toTitleCase(out.firstName);
    console.log('[NORMALIZE] Normalized firstName:', out.firstName);
  }
  if (out.lastName) {
    console.log('[NORMALIZE] Processing lastName:', out.lastName);
    out.lastName  = toTitleCase(out.lastName);
    console.log('[NORMALIZE] Normalized lastName:', out.lastName);
  }
  if (out.title) {
    console.log('[NORMALIZE] Processing title:', out.title);
    out.title     = toTitleCase(out.title);
    console.log('[NORMALIZE] Normalized title:', out.title);
  }
  if (out.email) {
    console.log('[NORMALIZE] Processing email:', out.email);
    out.email     = String(out.email).toLowerCase();
    console.log('[NORMALIZE] Normalized email:', out.email);
  }

  if (out.helixContact) {
    const inputStr = String(out.helixContact).trim();
    console.log('[NORMALIZE] Processing helixContact:', inputStr);
    
    // If the input already looks like initials (2-3 uppercase letters), keep it as-is
    if (/^[A-Z]{2,3}$/.test(inputStr)) {
      out.helixContact = inputStr;
      console.log('[NORMALIZE] Keeping existing initials:', out.helixContact);
    } else {
      // Process as full name - extract initials from each word
      const initials = inputStr
        .split(' ')
        .filter(Boolean)
        .map(w => w[0].toUpperCase())
        .join('');
      out.helixContact = initials;
      console.log('[NORMALIZE] Extracted initials from full name:', out.helixContact);
    }
  }

  // Map nationality to Alpha-2 code
  if (out.nationality) {
    console.log('[NORMALIZE] Processing nationality:', out.nationality);
    
    // Import reference data for country mapping
    const { countries } = require('./referenceData');
    
    const nationalityName = String(out.nationality).trim();
    
    // Try to find exact match first
    let countryEntry = countries.find(c => 
      c.name.toLowerCase() === nationalityName.toLowerCase()
    );
    
    console.log('[NORMALIZE] Exact nationality match search for:', nationalityName, 'found:', countryEntry ? `${countryEntry.name} (${countryEntry.code})` : 'none');
    
    // If no exact match, try partial match
    if (!countryEntry) {
      countryEntry = countries.find(c => 
        c.name.toLowerCase().includes(nationalityName.toLowerCase()) ||
        nationalityName.toLowerCase().includes(c.name.toLowerCase())
      );
      console.log('[NORMALIZE] Partial nationality match found:', countryEntry ? `${countryEntry.name} (${countryEntry.code})` : 'none');
    }
    
    if (countryEntry) {
      out.nationalityAlpha2 = countryEntry.code;
      console.log(`[NORMALIZE] SUCCESS: Mapped nationality "${nationalityName}" → Alpha-2 code "${countryEntry.code}"`);
    } else {
      console.warn(`[NORMALIZE] WARNING: Could not map nationality "${nationalityName}" to Alpha-2 code`);
      console.log('[NORMALIZE] Available countries sample:', countries.slice(0, 5).map(c => `${c.name} (${c.code})`));
    }
  }

  // Map country to Alpha-2 code
  if (out.country) {
    console.log('[NORMALIZE] Processing country:', out.country);
    
    // Import reference data for country mapping
    const { countries } = require('./referenceData');
    
    const countryName = String(out.country).trim();
    
    // Try to find exact match first
    let countryEntry = countries.find(c => 
      c.name.toLowerCase() === countryName.toLowerCase()
    );
    
    console.log('[NORMALIZE] Exact country match search for:', countryName, 'found:', countryEntry ? `${countryEntry.name} (${countryEntry.code})` : 'none');
    
    // If no exact match, try partial match
    if (!countryEntry) {
      countryEntry = countries.find(c => 
        c.name.toLowerCase().includes(countryName.toLowerCase()) ||
        countryName.toLowerCase().includes(c.name.toLowerCase())
      );
      console.log('[NORMALIZE] Partial country match found:', countryEntry ? `${countryEntry.name} (${countryEntry.code})` : 'none');
    }
    
    if (countryEntry) {
      out.countryCode = countryEntry.code;
      console.log(`[NORMALIZE] SUCCESS: Mapped country "${countryName}" → Alpha-2 code "${countryEntry.code}"`);
    } else {
      console.warn(`[NORMALIZE] WARNING: Could not map country "${countryName}" to Alpha-2 code`);
    }
  }

  // Handle user-entered date-of-birth format DD/MM/YYYY
  if (out.dob && typeof out.dob === 'string') {
    const m = out.dob.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) {
      out.dob = `${m[3]}-${m[2]}-${m[1]}`;
    }
  }

  // Title-case for various address and company fields
  const tcFields = [
    'houseNumber', 'street', 'city', 'county',
    'companyName', 'companyHouseNumber', 'companyStreet',
    'companyCity', 'companyCounty', 'companyCountry',
  ];
  for (const f of tcFields) {
    if (out[f]) out[f] = toTitleCase(out[f]);
  }

  // Map boolean isCompanyClient to clientType
  if (Object.prototype.hasOwnProperty.call(out, 'isCompanyClient')) {
    out.clientType = out.isCompanyClient ? 'Company' : 'Individual';
    delete out.isCompanyClient;
  }

  // Normalize idType
  if (Object.prototype.hasOwnProperty.call(out, 'idType')) {
    out.idType = String(out.idType);
  }

  // Remap idNumber to specific fields based on idType
  if (Object.prototype.hasOwnProperty.call(out, 'idNumber')) {
    if (out.idType === 'passport') {
      out.passportNumber = out.idNumber;
    } else if (out.idType === 'driver-license') {
      out.driversLicenseNumber = out.idNumber;
    }
    delete out.idNumber;
  }

  // Remove compliance-only flag
  delete out.idStatus;

  // Convert stage to internalStatus if provided
  if (data.stage === 'proof-of-id-complete') {
    out.internalStatus = 'poid';
  }

  // Include consent and internalStatus if provided
  if (data.consentGiven != null)   out.consentGiven    = Boolean(data.consentGiven);
  if (data.internalStatus != null) out.internalStatus  = data.internalStatus;

  // Build final object with only allowed fields
  console.log('[NORMALIZE] Building final object from allowed fields');
  console.log('[NORMALIZE] Available fields to process:', Object.keys(out));
  
  const finalObj = {};
  let includedFields = 0;
  let skippedFields = 0;
  
  for (const key of ALLOWED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(out, key)) {
      let val = out[key];
      console.log(`[NORMALIZE] Including field: ${key} = ${val}`);
      
      // Normalize DOB to ISO format
      if (key === 'dob' && typeof val === 'string') {
        const d = new Date(val);
        if (!isNaN(d)) {
          val = d.toISOString().slice(0, 10);
          console.log(`[NORMALIZE] Normalized DOB: ${val}`);
        }
      }
      finalObj[key] = typeof val === 'boolean' ? String(val) : val;
      includedFields++;
    } else {
      skippedFields++;
    }
  }

  console.log('[NORMALIZE] Normalization complete');
  console.log(`[NORMALIZE] Final object: ${includedFields} fields included, ${skippedFields} allowed fields not present`);
  console.log('[NORMALIZE] Final object keys:', Object.keys(finalObj));
  console.log('[NORMALIZE] Final object:', finalObj);

  return finalObj;
}

module.exports = { normalizeInstruction };
