const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, 'instructions.json');

function loadStore() {
  if (!fs.existsSync(DATA_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function saveStore(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

function getInstruction(ref) {
  const store = loadStore();
  return store[ref];
}

function upsertInstruction(ref, record) {
  const store = loadStore();
  store[ref] = { ...(store[ref] || {}), ...record };
  saveStore(store);
  return store[ref];
}

module.exports = {
  loadStore,
  saveStore,
  getInstruction,
  upsertInstruction,
};