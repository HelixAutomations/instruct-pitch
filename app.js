// Entry point for IISNode - require the server from its actual location in the repository
console.log('💫 app.js loaded, requiring server.js from backend...');
try {
  const server = require('./apps/pitch/backend/server.js');
  console.log('💫 server.js loaded successfully, type:', typeof server);
  console.log('💫 server object keys:', Object.keys(server || {}));
  module.exports = server;
} catch (err) {
  console.error('💥 Failed to load server.js from backend:', err);
  throw err;
}
