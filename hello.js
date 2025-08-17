// Minimal diagnostic entrypoint to verify iisnode can spawn a Node process
// GET /hello-diag should return JSON even if main app.js is failing.
console.log('🔧 hello.js diagnostic handler starting (pid=' + process.pid + ')');
const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true, path: req.url, ts: new Date().toISOString(), envIIS: !!process.env.IISNODE_VERSION }));
});

if (!process.env.IISNODE_VERSION) {
  const PORT = process.env.PORT || 3100;
  server.listen(PORT, () => console.log('🔧 hello.js listening locally on', PORT));
} else {
  console.log('🔧 hello.js ready for IISNode');
}

module.exports = server;
