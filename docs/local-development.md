## Local development quickstart (Windows / PowerShell)

This file explains a pragmatic, low-friction way to run the Tab app, Pitch app, and the decoupled functions locally so you can iterate fast and test end-to-end deal capture flows.

Keep this short and actionable — use it as a checklist and reference.

Assumptions
- You have Node.js (>=18) and npm installed.
- You have Azure Functions Core Tools installed when running Azure Functions locally (`func`).
- You will use PowerShell for the commands below.
- The repo root is the workspace root that contains `apps/tab-app`, `apps/pitch`, and `decoupled-functions`.

Checklist (first-pass)
- [x] Add the `apps/tab-app` submodule (already done)
- [ ] Create a local `.env` using `apps/tab-app/.env.example` and `decoupled-functions/.env` if needed
- [ ] Install dependencies for client, API and decoupled functions
- [ ] Run local dev servers: Tab app client (Vite), Tab app API (Functions host), decoupled functions (Functions host)
- [ ] Run a smoke test to POST a sample deal to `/api/insertDeal` and confirm the decoupled `dealCapture` receives it

Environment variables (key ones)
- USE_LOCAL_SECRETS=true  # Tab app reads local .env instead of Key Vault
- DEAL_CAPTURE_BASE_URL=http://localhost:7071/api/dealCapture
- DEAL_CAPTURE_CODE=local-test-key
- KEY_VAULT_NAME=local-placeholder  # Set in decoupled-functions/local.settings.json to avoid startup errors
- DB_PASSWORD=localdev  # Direct password for local dev, bypasses Key Vault lookup
- Any other secrets referenced in `apps/tab-app/api` or `decoupled-functions` should be mirrored in local env when USE_LOCAL_SECRETS=true

## Pitch App Setup

### Quick Start (Combined Dev Environment)
```powershell
# Start all pitch app services at once
cd "D:\helix projects\workspace\vsc\instructions\apps\pitch\backend"
npm run dev:hot
```

This starts:
- Vite client dev server (port 5173) - for hot reloading
- Mock server (port 4000) - for production-like testing  
- Azure Functions (port 7071) - decoupled functions

### URLs for Testing
- **Production-like**: http://localhost:4000/pitch/59914 (recommended)
- **Vite dev**: http://localhost:5173/59914-pitch (alternative format)

### Individual Services
```powershell
# Client only (Vite)
cd "D:\helix projects\workspace\vsc\instructions\apps\pitch\client"
npm run dev

# Mock server only
cd "D:\helix projects\workspace\vsc\instructions\apps\pitch\backend"
npm run dev:mock

# Backend server only
cd "D:\helix projects\workspace\vsc\instructions\apps\pitch\backend"
npm start
```

## Tab App Setup

PowerShell commands — install deps

# Pitch app dependencies
cd "D:\helix projects\workspace\vsc\instructions\apps\pitch\backend"
npm install

cd "D:\helix projects\workspace\vsc\instructions\apps\pitch\client"
npm install

# Tab app dependencies  
cd "D:\helix projects\workspace\vsc\instructions\apps\tab-app\server"
npm install

cd "D:\helix projects\workspace\vsc\instructions\apps\tab-app\api"
npm install

# Decoupled functions
cd "D:\helix projects\workspace\vsc\instructions\decoupled-functions"
npm install

PowerShell commands — start services (recommended order)

# 1) Start the decoupled functions host (make sure you have func installed)
cd "D:\helix projects\workspace\vsc\instructions\decoupled-functions"
func start

# 2) Start the Tab app API (Functions host for the API project)
cd "D:\helix projects\workspace\vsc\instructions\apps\tab-app\api"
func start

# 3) Start the Tab app client (Vite) / server dev (UI)
cd "D:\helix projects\workspace\vsc\instructions\apps\tab-app\server"
npm run dev

If any of the projects use different npm scripts (for example `start` or `serve`), check their `package.json` and adjust the command.

Testing end-to-end locally
- Ensure both Functions hosts (decoupled and tab-app API) are running and listening on different ports (default is 7071). Make sure `DEAL_CAPTURE_BASE_URL` in `apps/tab-app/.env` points to your local decoupled function host (example above).
- Use the included quick-test script `apps/tab-app/tmp_post_insertDeal.js` by running:

```powershell
cd "D:\helix projects\workspace\vsc\instructions\apps\tab-app"
node tmp_post_insertDeal.js
```

- Or use curl / HTTPie to POST to the API function:

```powershell
# Example - replace host/port as required
Invoke-WebRequest -Uri "http://localhost:7071/api/insertDeal" -Method POST -Body (ConvertTo-Json @{
  prospectId = 123
  serviceDescription = 'Test scope'
  amount = '£1,200'
  leadClientEmail = 'dev@local'
}) -ContentType 'application/json'
```

How Tab app handles secrets locally
- The Tab app already supports a local-secrets mode. Toggle `USE_LOCAL_SECRETS=true` and place values in `apps/tab-app/.env`.
- When `USE_LOCAL_SECRETS` is false, code reads secrets from Azure Key Vault. For local development prefer `USE_LOCAL_SECRETS=true` to avoid Key Vault calls.

Quick troubleshooting
- If the API call to the decoupled `dealCapture` fails with 401/403, ensure `DEAL_CAPTURE_CODE` matches the function key expected by the decoupled host, or disable function auth locally for testing.
- If Key Vault lookups still fail, set `USE_LOCAL_SECRETS=true` and populate `.env` values.
- **If Azure Functions fail to start with "Key Vault not specified" errors**: Ensure `decoupled-functions/local.settings.json` contains `KEY_VAULT_NAME` and `DB_PASSWORD` placeholders.
- **If Documents step doesn't appear in Pitch app**: Use the mock server at port 4000 instead of Vite at port 5173, or use the URL format `/<passcode>-<clientId>` with Vite.

Finding where the frontend triggers the API
- The API handler is `apps/tab-app/api/src/functions/insertDeal.ts` (it normalizes and forwards to `dealCapture`). To find the frontend caller search the UI tree for `/api/insertDeal` or `insertDeal`:

Use VS Code search or PowerShell:

```powershell
Select-String -Path "D:\helix projects\workspace\vsc\instructions\apps\tab-app\src\**\*.{ts,tsx,js,jsx}" -Pattern "/api/insertDeal" -SimpleMatch -List
```

Next steps (pick one)
- (A) I can search the repo now and point to the exact frontend call site that submits the deal (fast).
- (B) I can produce a short `README` snippet in the repo root or `apps/tab-app/` that you can commit (done here in docs folder).
- (C) Walk through an end-to-end smoke run with you (I can provide the exact commands and what to expect; you run them locally).

If you want me to continue, say which next step (A/B/C) you prefer and I'll proceed.
