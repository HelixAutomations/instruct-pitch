const sql = require('mssql');
let poolPromise;

function getSqlPool() {
  if (poolPromise) return poolPromise;
  const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: { encrypt: true }
  };
  poolPromise = sql.connect(config);
  return poolPromise;
}

module.exports = { getSqlPool };