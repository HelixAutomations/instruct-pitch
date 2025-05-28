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
  return out;
}

module.exports = { normalizeInstruction };