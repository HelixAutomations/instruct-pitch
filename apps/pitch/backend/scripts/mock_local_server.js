const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// In-memory mock deals (imitates Deals table). Status not 'CLOSED' are valid.
const mockDeals = [
  { ProspectId: '12345', Passcode: '87402', Status: 'OPEN', Amount: 1200, ServiceDescription: 'Advice' },
  { ProspectId: '54321', Passcode: '99999', Status: 'CLOSED', Amount: 800, ServiceDescription: 'Litigation' }
];

// Mock instructions (for HLX-... prefill)
const mockInstructions = {
  'HLX-12345-87402': { FirstName: 'Alice', LastName: 'Smith', Email: 'alice@example.com', Phone: '0123456789' }
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
      if (record) {
        const prefill = {
          First_Name: record.FirstName || '',
          Last_Name: record.LastName || '',
          Email: record.Email || '',
          Phone_Number: record.Phone || ''
        };
        html = injectPrefill(html, prefill);
      }
    } else {
      // resolve prospect id by passcode excluding CLOSED deals
      const deal = mockDeals.find(d => d.Passcode === code && String(d.Status).toUpperCase() !== 'CLOSED');
      if (deal && deal.ProspectId) resolvedProspectId = String(deal.ProspectId);
      // simulate fetchInstructionData prefill when resolvedProspectId
      if (resolvedProspectId) {
        const simulated = { First_Name: 'Prefilled', Last_Name: 'FromDeal', Email: 'deal@example.com' };
        html = injectPrefill(html, simulated);
      }
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
  const ref = `HLX-${cid}-${passcode}`;
  res.json({ instructionRef: ref });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Mock server listening on ${PORT}`));
