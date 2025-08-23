const sql = require('mssql');
let poolPromise;

function buildConfig() {
  return {
    user: process.env.DB_USER || process.env.SQLUSER || 'helix-database-server',
    password: process.env.DB_PASSWORD || process.env.SQLPASSWORD,
    server: process.env.DB_SERVER || process.env.SQLSERVER || 'helix-database-server.database.windows.net',
    database: process.env.DB_NAME || process.env.SQLDATABASE || 'helix-core-data',
    options: { encrypt: true }
  };
}

function validateConfig(cfg) {
  const missing = [];
  ['user','password','server','database'].forEach(k => { if (!cfg[k]) missing.push(k); });
  if (missing.length) {
    const msg = `Missing DB config field(s): ${missing.join(', ')}. Set DB_USER, DB_PASSWORD, DB_SERVER, DB_NAME (or SQL* fallbacks).`;
    // Throwing preserves existing stack so callers log concise cause.
    throw new Error(msg);
  }
}

function getSqlPool() {
  if (poolPromise) return poolPromise;
  const config = buildConfig();
  try {
    validateConfig(config);
  } catch (e) {
    // Provide early, explicit log (mirrors prior silent failure where mssql threw cryptic error).
    console.error('❌ DB configuration error:', e.message);
    return Promise.reject(e);
  }
  poolPromise = sql.connect(config).catch(err => {
    console.error('❌ DB connection failed:', err.message);
    // Allow subsequent calls to retry if first attempt failed.
    poolPromise = null;
    throw err;
  });
  return poolPromise;
}

// Backwards-compatible alias expected by payment-database.js
async function getSqlClient() {
  await getSqlPool();
  return sql;
}

module.exports = { getSqlPool, getSqlClient };