// Entry point for IISNode - simply require and export the main server
console.log('💫 app.js loaded, requiring server.js...');
try {
  const server = require('./server.js');
  console.log('💫 server.js loaded successfully, type:', typeof server);
  console.log('💫 server object keys:', Object.keys(server || {}));
  module.exports = server;
} catch (err) {
  console.error('💥 Failed to load server.js:', err);
  throw err;
}
