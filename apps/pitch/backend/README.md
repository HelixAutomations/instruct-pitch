Run local development (build client, start mock server, start decoupled functions)

From this folder run:

```powershell
npm run dev:local
```

Or run everything with hot-reload (Vite dev + mock server + decoupled functions) in one terminal:

```powershell
npm run dev:hot
```

What it does:
- Builds the client (`apps/pitch/client`) into `dist`.
- Starts the mock server which serves the built `dist` at `/pitch` and exposes mock API endpoints.
- Starts the `decoupled-functions` (Azure Functions Core Tools) using `npm start` in the `decoupled-functions` folder.

Notes:
- Ensure `func` (Azure Functions Core Tools) is installed and available in PATH for decoupled functions to start.
- If you'd prefer to watch the client during development, run `npm --prefix ../client run dev` in a separate terminal instead of `npm run dev:local`.
