# Instruct Pitch

This repository contains a small React client and an Express backend used to demonstrate a payment flow with Barclays ePDQ.

Clients load the app using their **Client ID** in the URL (e.g. `/pitch/12345`). On first visit they must also supply a unique **passcode** from their invitation email. The passcode validates the deal and is required to generate an instruction reference and upload documents.

For an overview of how these pieces fit together, see the [architecture diagram](docs/architecture.md).

## Prerequisites
- Node.js 18+
- npm
- SQL Server database with an `Instructions` table and connection variables (`DB_USER`, `DB_PASSWORD`, `DB_SERVER`, `DB_NAME`)

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

For convenience, running the development server with

```bash
npm run dev --prefix apps/pitch/client
```

will automatically use a dummy deal if no backend is available. This exposes the
Pay and Document steps so you can test the flow without connecting to a
database.


Environment variables (e.g., Azure Key Vault secrets) must be configured for the backend before running in production.

### Key Vault Environment Variable

Add the Key Vault name to `apps/pitch/backend/.env` so the server can load secrets:

```
KEY_VAULT_NAME=my-key-vault
```

This determines which Azure Key Vault the backend connects to.

The decoupled `dealCapture` Azure Function uses the same `KEY_VAULT_NAME` (or
`KEY_VAULT_URL`) setting. If not provided it falls back to the default vault
`https://helix-keys-v1.vault.azure.net/`.

The `sendEmail` Azure Function also relies on these variables. In production we
set `KEY_VAULT_NAME=helixlaw-instructions` which stores the Graph secrets
`graph-pitchbuilderemailprovider-clientid` and
`graph-pitchbuilderemailprovider-clientsecret`.

### Database Environment Variables

The backend connects to a SQL Server instance using the following settings in `apps/pitch/backend/.env`:

```
DB_USER=myuser
DB_PASSWORD=mypassword
DB_SERVER=myserver
DB_NAME=mydatabase
```

These variables point the server at a database containing an `Instructions` table.


### Upload Environment Variables

File uploads require the following settings in `apps/pitch/backend/.env`. The
values below are examples and should be replaced with your own configuration:
```
AZURE_STORAGE_ACCOUNT=instructionfiles
UPLOAD_CONTAINER=instruction-files
```

These specify where the server stores uploaded documents in Azure Blob Storage.

### Email Environment Variables

Emails are sent directly through Microsoft Graph using a service account.
Ensure the Key Vault referenced by `KEY_VAULT_NAME` contains the secrets `graph-pitchbuilderemailprovider-clientid` and `graph-pitchbuilderemailprovider-clientsecret`. If Graph sending fails the server falls back to the local SMTP settings `SMTP_HOST`, `SMTP_USER` and `SMTP_PASS`.
If `SMTP_HOST` is missing the fallback is skipped; otherwise Nodemailer defaults
to `localhost` and email delivery fails.

### Document upload behaviour

Uploaded documents are not cached between sessions. Refreshing the page or returning to the upload step shows an empty form and no files are considered uploaded until they are submitted again during that visit.

### Instruction fields

When posting data to `/api/instruction` the backend only persists a known set of
fields. Any extra properties in the request body are ignored and will not be
stored. The response includes the saved instruction record so the client can
update its local state immediately. The allowed instruction fields are:

- `idStatus`
- `isCompanyClient`
- `idType`
- `companyName`
- `companyNumber`
- `companyHouseNumber`
- `companyStreet`
- `companyCity`
- `companyCounty`
- `companyPostcode`
- `companyCountry`
- `title`
- `firstName`
- `lastName`
- `nationality`
- `houseNumber`
- `street`
- `city`
- `county`
- `postcode`
- `country`
- `dob`
- `gender`
- `phone`
- `email`
- `idNumber`
- `helixContact`
- `agreement`


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

During packaging `build-and-deploy.ps1` copies several backend files
(`server.js`, `instructionDb.js`, `sqlClient.js`, `upload.js`, `package.json`,
and `web.config`) to the repository root so they are included in
`push-package.zip`. Once deployed, access the site via
`https://<app-domain>/pitch/` rather than `https://<app-domain>/server.js`.

### Allowed fields for `/api/instruction`

The backend only stores recognised fields. Any other properties in a POST request
are ignored. Supported fields currently include:

- `stage`
- `clientId`
- `clientType`
- `amount`
- `product`
- `workType`
- `companyName`
- `companyNumber`
- `companyHouseNumber`
- `companyStreet`
- `companyCity`
- `companyCounty`
- `companyPostcode`
- `companyCountry`
- `title`
- `firstName`
- `lastName`
- `nationality`
- `houseNumber`
- `street`
- `city`
- `county`
- `postcode`
- `country`
- `dob`
- `gender`
- `phone`
- `email`
- `helixContact`

Fields like `idStatus`, `idNumber`, `idType` and `isCompanyClient` are currently
ignored to prevent database errors.