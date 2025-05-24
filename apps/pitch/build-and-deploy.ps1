# Navigate to the pitch app root
Push-Location $PSScriptRoot

# Clean up old files
Remove-Item -Recurse -Force ..\..\client\dist -ErrorAction SilentlyContinue
Remove-Item -Force ..\..\push-package.zip -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force ..\..\node_modules -ErrorAction SilentlyContinue

# Build frontend
Push-Location .\client
npm ci
npm run build
Pop-Location

# Copy backend files to root of instructions/
Copy-Item .\backend\server.js ..\..\ -Force
# Upload.js was removed – skip copying
Copy-Item .\backend\package.json ..\..\ -Force
Copy-Item .\backend\web.config ..\..\ -Force
Copy-Item .\backend\.env ..\..\ -Force -ErrorAction SilentlyContinue

# Install production-only server deps in root
Push-Location ..\..\
npm install --omit=dev
npm install @azure/identity @azure/keyvault-secrets

# Zip frontend + backend (INCLUDE WHOLE CLIENT FOLDER)
Compress-Archive -Path .\apps\pitch\client, .\*.js, .\package.json, .\web.config, .\.env, .\upload.js, .\server.js, .\node_modules -DestinationPath push-package.zip -Force

# Deploy to Azure
az webapp deployment source config-zip `
  --resource-group Instructions `
  --name instruct-helixlaw-pitch `
  --src push-package.zip

# Optional cleanup – only run manually if needed
$shouldClean = $false
if ($shouldClean) {
  Remove-Item .\server.js, .\upload.js, .\package.json, .\web.config, .\.env -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force .\node_modules -ErrorAction SilentlyContinue
}

# Return to original path
Pop-Location
