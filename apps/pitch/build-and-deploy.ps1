# Navigate to the pitch app root
Push-Location $PSScriptRoot

# Clean up old files
Remove-Item -Recurse -Force ..\..\client -ErrorAction SilentlyContinue
Remove-Item -Force ..\..\push-package.zip -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force ..\..\node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force ..\..\dist -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force ..\..\utilities -ErrorAction SilentlyContinue

# Build frontend
Push-Location .\client
npm ci
npm run build
Pop-Location

# Compile backend utilities (if any)
if (Test-Path .\backend\utilities) {
    npx --prefix .\client tsc -p .\backend
    # Ensure utilities directory exists at root
    New-Item -ItemType Directory -Path ..\..\utilities -Force | Out-Null
    Copy-Item -Recurse -Force .\backend\utilities\* ..\..\utilities\
}

# Copy built frontend to root-level client/dist
New-Item -ItemType Directory -Path ..\..\client\dist -Force | Out-Null
Copy-Item -Recurse -Force .\client\dist\* ..\..\client\dist\

# Remove client dev dependencies
Remove-Item -Recurse -Force .\client\node_modules -ErrorAction SilentlyContinue

# Build backend helper (compile TypeScript to dist)
Push-Location .\backend
npm run build
Pop-Location

# Copy backend files to root
Copy-Item .\backend\server.js ..\..\ -Force
Copy-Item .\backend\email.js ..\..\ -Force
Copy-Item .\backend\upload.js ..\..\ -Force
Copy-Item .\backend\sqlClient.js ..\..\ -Force
Copy-Item .\backend\instructionDb.js ..\..\ -Force
Copy-Item .\backend\package.json ..\..\ -Force
Copy-Item .\backend\web.config ..\..\ -Force
Copy-Item .\backend\.env ..\..\ -Force -ErrorAction SilentlyContinue

# Copy backend dist (compiled TypeScript output) to root-level dist
Copy-Item -Recurse -Force .\backend\dist ..\..\dist

# Install only production server deps
Push-Location ..\..\
npm install --omit=dev
npm install @azure/identity @azure/keyvault-secrets

# Ensure dist exists before zipping
if (!(Test-Path .\dist)) {
  throw "dist folder missing - did backend compile? (Check tsconfig and build step)"
}

# Create deployment archive
Compress-Archive -Path `
  .\client, `
  .\dist, `
  .\server.js, `
  .\email.js, `
  .\upload.js, `
  .\sqlClient.js, `
  .\instructionDb.js, `
  .\web.config, `
  .\package.json, `
  .\.env, `
  .\utilities, `
  .\node_modules `
  -DestinationPath push-package.zip -Force

# Deploy to Azure
az webapp deployment source config-zip `
  --resource-group Instructions `
  --name instruct-helixlaw-pitch `
  --src push-package.zip

# Optional cleanup
$shouldClean = $true
if ($shouldClean) {
  Remove-Item .\server.js, .\email.js, .\upload.js, .\sqlClient.js, .\instructionDb.js, .\package.json, .\web.config, .\.env -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force .\node_modules -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force .\client -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force .\dist -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force .\utilities -ErrorAction SilentlyContinue
}

# Restore original location
Pop-Location

# Pop again to return to the caller's starting directory
Pop-Location

# Restore client dependencies removed during packaging so the
# workspace remains ready for local development after deployment.
Push-Location .\client
npm ci
Pop-Location

# ✅ Play sound to indicate deployment is complete
[console]::beep(1000, 500)