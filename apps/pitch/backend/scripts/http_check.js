const http = require('http');
function fetch(path) {
  return new Promise((resolve, reject) => {
    http.get({ hostname: 'localhost', port: 4000, path, agent: false }, res => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

(async () => {
  try {
    const r1 = await fetch('/pitch/87402');
    console.log('/pitch/87402 status', r1.status);
    console.log(r1.body.split('\n').slice(0,20).join('\n'));
    const r2 = await fetch('/api/generate-instruction-ref?cid=12345&passcode=87402');
    console.log('\n/api/generate-instruction-ref?cid=12345&passcode=87402 status', r2.status);
    console.log(r2.body);
    const r3 = await fetch('/api/generate-instruction-ref?cid=00000&passcode=87402');
    console.log('\n/api/generate-instruction-ref?cid=00000&passcode=87402 status', r3.status);
    console.log(r3.body);
  } catch (err) {
    console.error('HTTP check failed:', err.message);
  }
})();
