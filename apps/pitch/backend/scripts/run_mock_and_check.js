const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');

function startMockServer(port=4000) {
  return new Promise(resolve => {
    const app = express();
    app.use(express.json());

    const mockDeals = [
      { ProspectId: '12345', Passcode: '87402', Status: 'OPEN' },
      { ProspectId: '54321', Passcode: '99999', Status: 'CLOSED' }
    ];

    const mockInstructions = {
      'HLX-12345-87402': { FirstName: 'Alice', LastName: 'Smith', Email: 'alice@example.com' }
    };

    const distIndex = path.join(__dirname, '..', 'client', 'dist', 'index.html');
    let baseHtml = '<!doctype html><html><head></head><body><div id="root"></div></body></html>';
    if (fs.existsSync(distIndex)) {
      try { baseHtml = fs.readFileSync(distIndex, 'utf8'); } catch (e) { }
    }

    function injectPrefill(html, data) {
      if (!data || Object.keys(data).length === 0) return html;
      const safe = JSON.stringify(data).replace(/<\/script/g, '<\\/script');
      const script = `<script>window.helixPrefillData = ${safe};</script>`;
      return html.replace('</head>', `${script}\n</head>`);
    }

    app.get(['/pitch', '/pitch/:code', '/pitch/:code/*'], (req, res) => {
      const code = req.params.code;
      let html = baseHtml;
      let resolvedProspectId = null;
      if (code) {
        if (/^HLX-\d+-\d+$/i.test(code)) {
          const record = mockInstructions[code];
          if (record) html = injectPrefill(html, { First_Name: record.FirstName, Last_Name: record.LastName, Email: record.Email });
        } else {
          const deal = mockDeals.find(d => d.Passcode === code && String(d.Status).toUpperCase() !== 'CLOSED');
          if (deal && deal.ProspectId) resolvedProspectId = String(deal.ProspectId);
          if (resolvedProspectId) html = injectPrefill(html, { First_Name: 'Prefilled', Last_Name: 'FromDeal', Email: 'deal@example.com' });
        }
      }
      const safeOriginal = JSON.stringify(code);
      const safeCid = JSON.stringify(resolvedProspectId || '00000');
      html = html.replace('</head>', `<script>window.helixOriginalPasscode = ${safeOriginal}; window.helixCid = ${safeCid};</script></head>`);
      res.send(html);
    });

    app.get('/api/generate-instruction-ref', (req, res) => {
      const cid = req.query.cid;
      const passcode = req.query.passcode;
      if (!cid || !passcode) return res.status(400).json({ error: 'Missing cid or passcode' });
      const deal = mockDeals.find(d => String(d.ProspectId) === String(cid) && d.Passcode === passcode && String(d.Status).toUpperCase() !== 'CLOSED');
      if (!deal) return res.status(404).json({ error: 'Invalid combination' });
      res.json({ instructionRef: `HLX-${cid}-${passcode}` });
    });

    const server = app.listen(port, () => resolve(server));
  });
}

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
  const server = await startMockServer(4000);
  console.log('Mock server started on 4000');
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
    console.error('check failed', err && err.message);
  } finally {
    server.close(() => console.log('Mock server stopped'));
  }
})();
