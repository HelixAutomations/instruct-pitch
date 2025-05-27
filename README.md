# Instruct Pitch

This repository contains a small React client and an Express backend used to demonstrate a payment flow with Barclays ePDQ.

## Prerequisites
- Node.js 18+
- npm

## Installing dependencies
Install backend and client dependencies:

```bash
npm install --prefix apps/pitch/backend
npm install --prefix apps/pitch/client
```

## Running the backend
The backend exposes a simple server in `apps/pitch/backend`:

```bash
npm start --prefix apps/pitch/backend
```

This starts `server.js` which provides SHA-sign generation and payment confirmation endpoints.

## Building the client
To build the React client:

```bash
npm run build --prefix apps/pitch/client
```

To preview the production build locally:

```bash
npm run preview --prefix apps/pitch/client
```

Environment variables (e.g., Azure Key Vault secrets) must be configured for the backend before running in production.

### Key Vault Environment Variable

Add the Key Vault name to `apps/pitch/backend/.env` so the server can load secrets:

```
KEY_VAULT_NAME=my-key-vault
```

This determines which Azure Key Vault the backend connects to.


### Upload Environment Variables

File uploads require the following settings in `apps/pitch/backend/.env`. The
values below are examples and should be replaced with your own configuration:
```
AZURE_STORAGE_ACCOUNT=instructionfiles
UPLOAD_CONTAINER=instruction-files
```

These specify where the server stores uploaded documents in Azure Blob Storage.

### Document upload behaviour

Uploaded documents are not cached between sessions. Refreshing the page or returning to the upload step shows an empty form and no files are considered uploaded until they are submitted again during that visit.

## Deploying to Azure

The repository includes a PowerShell script that builds the client and backend
and then pushes the package to an Azure Web App. Run the script from the project
root:

```powershell
pwsh apps/pitch/build-and-deploy.ps1
```

### Deployment prerequisites

- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) installed
  locally
- Signed in to Azure CLI with the correct subscription selected
- A valid `.env` file in `apps/pitch/backend` containing the environment
  variables mentioned above (e.g. `AZURE_STORAGE_ACCOUNT` and
  `UPLOAD_CONTAINER`)

The script builds the production assets, creates `push-package.zip`, and uploads
it using `az webapp deployment source config-zip`.

During packaging `build-and-deploy.ps1` copies `apps/pitch/backend/server.js` and
`apps/pitch/backend/web.config` to the repository root so they are included in
`push-package.zip`. Once deployed, access the site via
`https://<app-domain>/pitch/` rather than `https://<app-domain>/server.js`.