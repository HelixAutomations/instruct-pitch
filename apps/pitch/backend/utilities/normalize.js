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
];

function toTitleCase(str) {
  return str
    .toLowerCase()
    .replace(/\b\w+/g, w => w.charAt(0).toUpperCase() + w.slice(1));
}

function normalizeInstruction(data) {
  const out = { ...data };
  if (out.firstName) out.firstName = toTitleCase(out.firstName);
  if (out.lastName) out.lastName = toTitleCase(out.lastName);
  if (out.title) out.title = toTitleCase(out.title);
  if (out.email) out.email = String(out.email).toLowerCase();

  const tcFields = [
    'houseNumber',
    'street',
    'city',
    'county',
    'companyName',
    'companyHouseNumber',
    'companyStreet',
    'companyCity',
    'companyCounty',
    'companyCountry',
  ];
  for (const f of tcFields) {
    if (out[f]) out[f] = toTitleCase(out[f]);
  }

  // Map fields that don't directly correspond to DB columns
  if (Object.prototype.hasOwnProperty.call(out, 'isCompanyClient')) {
    if (out.isCompanyClient === true) out.clientType = 'client';
    else if (out.isCompanyClient === false) out.clientType = 'individual';
    delete out.isCompanyClient;
  }

  if (Object.prototype.hasOwnProperty.call(out, 'idType')) {
    out.idType = String(out.idType);
  }

  if (Object.prototype.hasOwnProperty.call(out, 'idNumber')) {
    if (out.idType === 'passport') {
      out.passportNumber = out.idNumber;
    } else if (out.idType === 'driver-license') {
      out.driversLicenseNumber = out.idNumber;
    }
    delete out.idNumber;
  }

  // idStatus is used by compliance and should not be stored in Instructions
  delete out.idStatus;

  // Build final object containing only allowed fields
  const finalObj = {};
  for (const key of ALLOWED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(out, key)) {
      const val = out[key];
      finalObj[key] = typeof val === 'boolean' ? String(val) : val;
    }
  }

  return finalObj;
}

module.exports = { normalizeInstruction };