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
