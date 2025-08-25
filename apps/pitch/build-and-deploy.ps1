# Navigate to the pitch app root
Push-Location $PSScriptRoot

# Define package root path
$packageRoot = Resolve-Path "..\..\" | Select-Object -ExpandProperty Path

# Clean up old files
Remove-Item -Recurse -Force ..\..\client -ErrorAction SilentlyContinue
Remove-Item -Force ..\..\push-package.zip -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force ..\..\node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force ..\..\dist -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force ..\..\utilities -ErrorAction SilentlyContinue

# Build frontend
Push-Location .\client
# Use npm install instead of npm ci to avoid Windows file locking issues
npm install
npm run build
Pop-Location

# Compile backend utilities (if any)
if (Test-Path .\backend\utilities) {
    # Ensure utilities directory exists at root
    New-Item -ItemType Directory -Path (Join-Path $packageRoot 'utilities') -Force | Out-Null
    Copy-Item -Recurse -Force .\backend\utilities\* (Join-Path $packageRoot 'utilities')
}

# Copy built frontend to root-level client/dist
Write-Host "Ensuring client/dist exists at package root"
New-Item -ItemType Directory -Path (Join-Path $packageRoot 'client\dist') -Force | Out-Null
Copy-Item -Recurse -Force .\client\dist\* (Join-Path $packageRoot 'client\dist')

# Remove client dev dependencies
Remove-Item -Recurse -Force .\client\node_modules -ErrorAction SilentlyContinue

# Build backend helper (compile TypeScript to dist)
Push-Location .\backend
npm run build
Pop-Location

# Copy backend files to root
Copy-Item .\backend\server.js $packageRoot -Force
Copy-Item .\backend\email.js $packageRoot -Force
Copy-Item .\backend\upload.js $packageRoot -Force
Copy-Item .\backend\sqlClient.js $packageRoot -Force
Copy-Item .\backend\instructionDb.js $packageRoot -Force
Copy-Item .\backend\package.json $packageRoot -Force
Copy-Item .\backend\web.config $packageRoot -Force
Copy-Item .\backend\.env $packageRoot -Force -ErrorAction SilentlyContinue

# Copy Stripe integration files
Copy-Item .\backend\stripe-service.js $packageRoot -Force
Copy-Item .\backend\payment-database.js $packageRoot -Force
Copy-Item .\backend\payment-routes.js $packageRoot -Force

# Copy backend dist (compiled TypeScript output) to root-level dist
Write-Host "Copying backend compiled artifacts to package root dist"
New-Item -ItemType Directory -Path (Join-Path $packageRoot 'dist') -Force | Out-Null
Copy-Item -Force .\backend\dist\generateInstructionRef.js (Join-Path $packageRoot 'dist')

# Validate critical file exists
$genRef = Join-Path $packageRoot 'dist\generateInstructionRef.js'
if (!(Test-Path $genRef)) {
  throw "❌ generateInstructionRef.js missing after copy step"
}
else {
  Write-Host "✅ Found $genRef"
}

# Copy utilities directory (required for normalize module)
Write-Host "Copying backend utilities to package root"
if (Test-Path .\backend\utilities) {
    New-Item -ItemType Directory -Path (Join-Path $packageRoot 'utilities') -Force | Out-Null
    Copy-Item -Recurse -Force .\backend\utilities\* (Join-Path $packageRoot 'utilities')
}

# Install only production server deps
Push-Location ..\..\
npm install --omit=dev
npm install @azure/identity @azure/keyvault-secrets

# Ensure dist exists before zipping
# Verify critical files exist before creating the deployment archive
$expectedFiles = @(
  (Join-Path $packageRoot 'server.js'),
  (Join-Path $packageRoot 'client\dist\index.html'),
  (Join-Path $packageRoot 'dist\generateInstructionRef.js')
)
foreach ($f in $expectedFiles) {
  if (!(Test-Path $f)) {
    throw "Deployment missing required file: $f"
  } else {
    Write-Host "Found: $f"
  }
}

# Create deployment archive from package root
Push-Location $packageRoot
 $paths = @(
   '.\server.js',
   '.\client',
   '.\dist',
   '.\email.js',
   '.\upload.js',
   '.\sqlClient.js',
   '.\instructionDb.js',
   '.\stripe-service.js',
   '.\payment-database.js',
   '.\payment-routes.js',
   '.\web.config',
   '.\package.json',
   '.\\.env',
   '.\utilities',
   '.\node_modules'
 )
 if (Test-Path .\hello.js) { $paths += '.\hello.js' }
 Compress-Archive -Path $paths -DestinationPath push-package.zip -Force
Pop-Location

# Deploy to Azure
az webapp deployment source config-zip `
  --resource-group Instructions `
  --name instruct-helixlaw-pitch `
  --slot staging `
  --src (Join-Path $packageRoot 'push-package.zip')

# Check deployment success before cleanup
if ($LASTEXITCODE -eq 0) {
  Write-Host "✅ Deployment successful"
  # Optional cleanup after successful deployment
  $shouldClean = $true
  if ($shouldClean) {
    Remove-Item .\email.js, .\upload.js, .\sqlClient.js, .\instructionDb.js, .\package.json, .\web.config, .\.env, .\stripe-service.js, .\payment-database.js, .\payment-routes.js -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force .\node_modules -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force .\client -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force .\dist -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force .\utilities -ErrorAction SilentlyContinue
  }
} else {
  Write-Host "❌ Deployment failed with exit code $LASTEXITCODE"
  throw "Deployment failed"
}

# Restore original location
Pop-Location

# Restore client dependencies removed during packaging so the
# workspace remains ready for local development after deployment.
Push-Location .\client
npm install
Pop-Location

# ✅ Play sound to indicate deployment is complete
[console]::beep(1000, 500)