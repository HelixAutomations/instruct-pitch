# Comprehensive Development Guide

## Quick Start for New Developers

### Essential URLs for Testing
- **Primary Development**: `http://localhost:4000/pitch/59914`
- **Frontend Only**: `http://localhost:5173/pitch/59914`
- **Alternative Test**: `http://localhost:4000/pitch/87402`

### Starting Development Environment
```bash
# Terminal 1: Start Mock Backend (Port 4000)
cd apps/pitch/backend
node scripts/mock_local_server.js

# Terminal 2: Start Frontend Dev Server (Port 5173)
cd apps/pitch/client
npm run dev

# Terminal 3: Optional - Start Azure Functions (Port 7071)
cd decoupled-functions
npm run start
```

## Project Architecture Overview

### Core Components
```
apps/pitch/
├── backend/
│   ├── scripts/mock_local_server.js     # Development mock server
│   ├── server.js                        # Production backend
│   ├── upload.js                        # File upload handling
│   └── email.js                         # Email notifications
├── client/
│   ├── src/structure/
│   │   ├── App.tsx                      # Main routing & URL handling
│   │   ├── IDAuth.tsx                   # Authentication component
│   │   ├── HomePage.tsx                 # Multi-step workflow
│   │   └── DocumentUpload.tsx           # File upload interface
│   └── vite.config.ts                   # Dev server configuration
```

### Data Flow
1. **URL Processing** → `App.tsx` handles passcode detection and client ID lookup
2. **Authentication** → `IDAuth.tsx` validates credentials and generates instruction refs
3. **Workflow Steps** → `HomePage.tsx` manages multi-step progression
4. **Document Upload** → `DocumentUpload.tsx` handles file uploads with error recovery

## Recent Fixes and Improvements

### 1. Document Upload Error Handling ✅
**Problem**: JSON parsing errors when server returns HTML error pages  
**Solution**: Content-type checking before JSON parsing  
**Files**: `DocumentUpload.tsx`

### 2. Passcode-Only URL Access ✅
**Problem**: URLs like `/pitch/59914` required manual authentication  
**Solution**: Auto-detection and client ID lookup  
**Files**: `App.tsx`, mock server endpoints

### 3. Zero-Amount Deal Document Upload ✅
**Problem**: Consultation deals (£0) hid document upload steps  
**Solution**: Always show document upload regardless of amount  
**Files**: `HomePage.tsx`

### 4. API Validation Improvements ✅
**Problem**: Empty API parameters caused 400 errors  
**Solution**: Client-side validation before API calls  
**Files**: `IDAuth.tsx`

## Development Testing Scenarios

### Test Case 1: Zero-Amount Consultation (Primary)
- **URL**: `http://localhost:4000/pitch/59914`
- **Mapping**: Passcode 59914 → Client ID 27367
- **Amount**: £0 (Consultation)
- **Expected**: All steps visible including document upload

### Test Case 2: Standard Paid Instruction
- **URL**: `http://localhost:4000/pitch/87402`
- **Mapping**: Passcode 87402 → Client ID 12345
- **Amount**: £1200 (Advice)
- **Expected**: Normal workflow with payment processing

### Test Case 3: Direct HLX Reference
- **URL**: `http://localhost:4000/pitch/HLX-12345-87402`
- **Expected**: Prefilled form data, returning user flow

## Code Patterns and Best Practices

### Error Handling Pattern
```typescript
// ✅ Good: Check content-type before parsing
const res = await fetch('/api/endpoint');
const contentType = res.headers.get('content-type');

if (contentType?.includes('application/json')) {
  const data = await res.json();
  // Handle JSON response
} else {
  await res.text(); // Consume non-JSON response
  throw new Error(`Server error (${res.status}): ${res.statusText}`);
}

// ❌ Bad: Assume all responses are JSON
const res = await fetch('/api/endpoint');
const data = await res.json(); // Can throw on HTML error pages
```

### API Validation Pattern
```typescript
// ✅ Good: Validate before API calls
const handleSubmit = async () => {
  if (!clientId || !passcode) {
    setError('Please provide both Client ID and passcode');
    return;
  }
  
  try {
    const response = await fetch(`/api/endpoint?cid=${clientId}&passcode=${passcode}`);
    // Handle response
  } catch (err) {
    // Error handling
  }
};

// ❌ Bad: No validation, empty parameters sent
const handleSubmit = async () => {
  const response = await fetch(`/api/endpoint?cid=${clientId}&passcode=${passcode}`);
};
```

### State Management Pattern
```typescript
// ✅ Good: Proper state updates with dependencies
useEffect(() => {
  if (instructionRef && clientId) {
    // Only run when both values are available
    performAction();
  }
}, [instructionRef, clientId]);

// ❌ Bad: Missing dependencies, race conditions
useEffect(() => {
  performAction(); // May run with undefined values
}, []); // Missing dependencies
```

## Debugging Common Issues

### Document Upload Not Working
1. **Check Browser Console**: Look for content-type or parsing errors
2. **Verify Server**: Ensure mock server is running on port 4000
3. **Check Network Tab**: Verify `/api/upload` endpoint is available
4. **Test Response**: Mock server should return JSON with `blobName` and `url`

### Passcode URLs Not Auto-Authenticating
1. **Verify Mapping**: Check passcode exists in mock server `mockDeals` array
2. **Check Console Logs**: Look for "Detected passcode in URL" messages
3. **Inspect Injection**: Verify `window.helixOriginalPasscode` and `window.helixCid` are set
4. **Status Check**: Ensure deal Status is 'OPEN' not 'CLOSED'

### Steps Not Showing Correctly
1. **Check Amount Logic**: Zero-amount deals should now show all steps
2. **Verify maxStep Calculation**: Should always include `documentsStepNumber`
3. **Review hasDeal Logic**: Should not hide steps based on amount
4. **Check Step State**: Verify `dealStepsVisible` and `instructionCompleted` states

### API 404 Errors
1. **Mock Server Endpoints**: Verify all required endpoints are implemented
2. **Proxy Configuration**: Check Vite proxy settings in `vite.config.ts`
3. **Port Conflicts**: Ensure servers are running on correct ports
4. **Request URLs**: Verify client is calling correct endpoint paths

## File Structure Reference

### Client Components (React/TypeScript)
```
src/
├── structure/
│   ├── App.tsx                    # Main app, routing, URL processing
│   ├── IDAuth.tsx                 # Authentication form & validation
│   ├── HomePage.tsx               # Multi-step workflow controller
│   ├── DocumentUpload.tsx         # File upload with error handling
│   ├── Header.tsx                 # Application header
│   ├── Footer.tsx                 # Application footer
│   └── PaymentResult.tsx          # Payment confirmation page
├── context/
│   ├── ClientContext.tsx          # Global client state
│   └── CompletionContext.tsx      # Completion workflow state
└── styles/
    ├── App.css                    # Main application styles
    ├── DocumentUpload.css         # Document upload specific styles
    └── global.css                 # Global CSS variables and resets
```

### Backend Structure
```
backend/
├── scripts/
│   └── mock_local_server.js       # Development mock server
├── server.js                      # Production Express server
├── upload.js                      # File upload router & Azure Blob handling
├── email.js                       # Email notification system
├── instructionDb.js               # Database operations
└── utilities/
    ├── normalize.js               # Data normalization
    └── tillerApi.js               # External API integration
```

## Environment Variables

### Development (.env.local)
```bash
# Not required for mock server testing
# Only needed for production API testing
VITE_API_TARGET=http://localhost:4000
```

### Production Backend (.env)
```bash
# Azure Storage
AZURE_STORAGE_ACCOUNT=your-storage-account
UPLOAD_CONTAINER=uploads

# Database
DB_SERVER=your-db-server
DB_NAME=your-database
DB_PASSWORD_SECRET=your-key-vault-secret

# Email
SMTP_HOST=your-smtp-server
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password

# Key Vault
KEY_VAULT_NAME=your-key-vault
```

## Deployment Notes

### Development Deployment
- Use mock server (port 4000) for complete local testing
- Use Vite dev server (port 5173) for frontend-only development
- Both support hot reloading and debugging

### Production Deployment
- Backend: Azure App Service or similar Node.js hosting
- Frontend: Static hosting (Azure Static Web Apps, Netlify, etc.)
- Database: Azure SQL Database
- Storage: Azure Blob Storage for file uploads

---

**Last Updated**: August 15, 2025  
**Status**: ✅ All systems operational  
**Primary Developer Contact**: GitHub Copilot session logs  
**Next Review**: When new features are added or issues discovered
