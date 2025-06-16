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

  // Identification
  'passportNumber',
  'driversLicenseNumber',
  'idType',

  // Misc
  'helixContact',
  'agreement',
  'nationalityCode',
  'countryCode',
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
  const out = { ...data };

  // Standardize casing for names and contact
  if (out.firstName)    out.firstName = toTitleCase(out.firstName);
  if (out.lastName)     out.lastName  = toTitleCase(out.lastName);
  if (out.title)        out.title     = toTitleCase(out.title);
  if (out.email)        out.email     = String(out.email).toLowerCase();

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

  // Include consent and internalStatus if provided
  if (data.consentGiven != null)   out.consentGiven    = Boolean(data.consentGiven);
  if (data.internalStatus != null) out.internalStatus  = data.internalStatus;

  // Build final object with only allowed fields
  const finalObj = {};
  for (const key of ALLOWED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(out, key)) {
      let val = out[key];
      // Normalize DOB to ISO format
      if (key === 'dob' && typeof val === 'string') {
        const d = new Date(val);
        if (!isNaN(d)) {
          val = d.toISOString().slice(0, 10);
        }
      }
      finalObj[key] = typeof val === 'boolean' ? String(val) : val;
    }
  }

  return finalObj;
}

module.exports = { normalizeInstruction };
