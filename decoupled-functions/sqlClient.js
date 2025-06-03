const sql = require('mssql');
let poolPromise;

function getSqlPool() {
  if (poolPromise) return poolPromise;
  const config = {
    user: process.env.DB_USER || 'helix-database-server',
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || 'helix-database-server.database.windows.net',
    database: process.env.DB_NAME || 'helix-core-data',
    options: { encrypt: true }
  };
  poolPromise = sql.connect(config);
  return poolPromise;
}

module.exports = { getSqlPool };