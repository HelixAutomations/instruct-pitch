# Navigate to the pitch app root
Push-Location $PSScriptRoot

# Clean up old files
Remove-Item -Recurse -Force ..\..\client -ErrorAction SilentlyContinue
Remove-Item -Force ..\..\push-package.zip -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force ..\..\node_modules -ErrorAction SilentlyContinue

# Build frontend
Push-Location .\client
npm ci
npm run build
Pop-Location

# Copy built frontend to root-level client/dist
New-Item -ItemType Directory -Path ..\..\client\dist -Force | Out-Null
Copy-Item -Recurse -Force .\client\dist\* ..\..\client\dist\

# Remove client dev dependencies
Remove-Item -Recurse -Force .\client\node_modules -ErrorAction SilentlyContinue

# Copy backend files to root
Copy-Item .\backend\server.js ..\..\ -Force
Copy-Item .\backend\upload.js ..\..\ -Force
Copy-Item .\backend\package.json ..\..\ -Force
Copy-Item .\backend\web.config ..\..\ -Force
Copy-Item .\backend\.env ..\..\ -Force -ErrorAction SilentlyContinue

# Install only production server deps
Push-Location ..\..\
npm install --omit=dev
npm install @azure/identity @azure/keyvault-secrets

# Create deployment archive
Compress-Archive -Path `
  .\client, `
  .\server.js, `
  .\upload.js, `
  .\web.config, `
  .\package.json, `
  .\.env, `
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
  Remove-Item .\server.js, .\upload.js, .\package.json, .\web.config, .\.env -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force .\node_modules -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force .\client -ErrorAction SilentlyContinue
}

# Restore original location
Pop-Location
