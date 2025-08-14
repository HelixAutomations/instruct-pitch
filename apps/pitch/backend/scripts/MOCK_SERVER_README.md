Mock server (apps/pitch/backend/scripts/mock_local_server.js)

Overview
--------
This document records the code-level changes made to the mock local server and explains why they were necessary, how to run the server, and how to verify the end-to-end flow for `/pitch/:passcode`.

Why the changes were needed
--------------------------
- Problem: When loading `/pitch/<passcode>` the client showed a "Please confirm passcode" modal or a blank page.
  - Cause A: The real backend injects `window.helixOriginalPasscode` into the served HTML; the Vite dev server does not. Without the injection the client shows the modal.
  - Cause B: The mock server initially returned `index.html` for asset requests (e.g., `/pitch/assets/index-*.js`) which caused the browser to download HTML where JS was expected, resulting in a blank page.

Summary of code changes
-----------------------
1) Fixed `distDir` path
   - File: `mock_local_server.js`
   - Before: `path.join(__dirname, '..', 'client', 'dist')` (wrong relative path)
   - After:  `path.join(__dirname, '..', '..', 'client', 'dist')`
   - Reason: the script is at `apps/pitch/backend/scripts`; client dist lives at `apps/pitch/client/dist`.

2) Ensure assets are served correctly
   - File: `mock_local_server.js`
   - Added: `app.use('/pitch/assets', express.static(...))` and an explicit
     `app.get('/pitch/assets/*', ...)` handler that `res.sendFile()` when the file exists.
   - Reason: Guarantees that JS/CSS requests return the correct file rather than falling through to the `/pitch` catch-all which returns HTML.

3) Added logging & diagnostics
   - File: `mock_local_server.js`
   - Added request logging middleware and startup diagnostics that log `distDir` and check for the expected asset file.
   - Reason: Made debugging deterministic and revealed the incorrect `distDir` earlier.

4) Kept and documented existing mock behavior
   - The server still reads `client/dist/index.html` as `baseHtml` and injects:
     - `window.helixPrefillData` (simulated prefill)
     - `window.helixOriginalPasscode` (the requested passcode)
     - `window.helixCid` (resolved ProspectId)
   - The server still exposes `/api/generate-instruction-ref` which validates
     the cid+passcode pair against `mockDeals` and returns `instructionRef`.

How to run locally (repro steps)
-------------------------------
1) Build the client (if needed):

```powershell
cd 'D:\helix projects\workspace\vsc\instructions\apps\pitch\client'
npm install   # only if dependencies changed or not installed
npm run build
```

2) Start the mock server:

```powershell
cd 'D:\helix projects\workspace\vsc\instructions\apps\pitch\backend\scripts'
node mock_local_server.js
# or background
Start-Process -FilePath node -ArgumentList 'mock_local_server.js' -WorkingDirectory 'D:\helix projects\workspace\vsc\instructions\apps\pitch\backend\scripts' -NoNewWindow -PassThru
```

3) Test endpoints:

```powershell
Invoke-WebRequest -Uri http://127.0.0.1:4000/pitch/87402 -UseBasicParsing
Invoke-WebRequest -Uri http://127.0.0.1:4000/pitch/assets/index-KaFbzlFk.js -UseBasicParsing
```

Expected results:
- The page request returns `index.html` with injected `window.helixOriginalPasscode` and `window.helixCid` scripts in the head.
- The JS asset request returns JS content (not HTML), e.g. starts with `function` in the built minified file.

Verification performed (what was done during the fix)
-----------------------------------------------------
- Confirmed built `index.html` references `/pitch/assets/index-KaFbzlFk.js` and `/pitch/assets/index-DFsqt3py.css`.
- Observed server logs showing `distDir` was incorrect; corrected it and rechecked.
- Verified via PowerShell that:
  - GET /pitch/87402 returned the expected HTML with injected passcode/cid.
  - GET /pitch/assets/index-KaFbzlFk.js returned JS file content (no longer 404/HTML).

Notes and caveats
-----------------
- Vite dev server (localhost:5173) does not inject `window.helixOriginalPasscode`. To test injection and auto-flow behavior use the mock server (port 4000) or implement a dev-only client fallback.
- The mock server contains debug logging for request visibility. Consider removing or gating behind an environment variable before committing as a permanent utility.
- Client UX: currently the client was previously changed to hide the ID modal immediately when `window.helixOriginalPasscode` exists. This is a simple fix but may be improved by hiding only after the `/api/generate-instruction-ref` call succeeds.

Files changed in this fix
-------------------------
- Modified: `apps/pitch/backend/scripts/mock_local_server.js` — fixed `distDir`, added explicit assets handler, logging, and diagnostics.
- Added: `apps/pitch/backend/scripts/MOCK_SERVER_README.md` — this document.

Next suggested actions
----------------------
- (Optional) Update the client to hide ID modal only after `/api/generate-instruction-ref` returns success.
- (Optional) Add a small `README` note in `apps/pitch/client/` describing how the server injects passcode for QA.
- (Optional) Make mock server logging conditional on `MOCK_VERBOSE=1`.

Contact
-------
If you want me to implement the optional client change or to remove debug logging and add env gating, tell me which option to implement next.
