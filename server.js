// IISNode entry point - forwards to the pitch backend server
console.log('🚀 Root server.js loaded, forwarding to pitch backend...');

try {
  // Require and export the pitch backend server
  const pitchServer = require('./apps/pitch/backend/server.js');
  console.log('✅ Pitch backend server loaded successfully');
  module.exports = pitchServer;
} catch (err) {
  console.error('💥 Failed to load pitch backend server:', err);
  
  // Provide a basic fallback server to prevent complete failure
  const express = require('express');
  const app = express();
  
  app.get('*', (req, res) => {
    res.status(503).json({
      error: 'Server temporarily unavailable',
      message: 'Pitch backend server could not be loaded',
      details: err.message
    });
  });
  
  module.exports = app;
}