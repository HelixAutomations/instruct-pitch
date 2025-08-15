# Mock Server Development Setup

## Overview
The mock server (`scripts/mock_local_server.js`) provides a complete local development environment for testing the pitch client application without requiring Azure services or production APIs.

## Server Configuration

### Port and Access
- **Port**: 4000
- **URL**: `http://localhost:4000`
- **Primary Test Route**: `/pitch/59914`

### Key Features
1. **Static Asset Serving** - Serves built client from `client/dist`
2. **Passcode Injection** - Server-side injection of passcode data
3. **API Endpoint Mocking** - Complete API coverage for development
4. **Error Reporting** - Client-side error collection and logging

## Mock Data Configuration

### Deal Mappings
```javascript
const mockDeals = [
  { ProspectId: '12345', Passcode: '87402', Status: 'OPEN', Amount: 1200, ServiceDescription: 'Advice' },
  { ProspectId: '54321', Passcode: '99999', Status: 'CLOSED', Amount: 800, ServiceDescription: 'Litigation' },
  { ProspectId: '27367', Passcode: '59914', Status: 'OPEN', Amount: 0, ServiceDescription: 'Consultation' }
];
```

### Test Cases
| Passcode | ProspectId | Amount | Service | Status | Use Case |
|----------|------------|---------|---------|---------|-----------|
| 59914 | 27367 | £0 | Consultation | OPEN | Zero-amount deal testing, document upload visibility |
| 87402 | 12345 | £1200 | Advice | OPEN | Standard paid instruction testing |
| 99999 | 54321 | £800 | Litigation | CLOSED | Closed deal testing (should be filtered out) |

## API Endpoints Provided

### Core Instruction Flow
- `GET /api/generate-instruction-ref` - Generates HLX references
- `GET /api/getDealByPasscodeIncludingLinked` - Passcode to ProspectId lookup
- `GET /api/internal/fetch-instruction-data` - Client data prefill
- `GET /api/instruction` - Retrieve instruction data
- `POST /api/instruction` - Store/update instruction data

### Document Management
- `GET /api/instruction/:ref/documents` - List documents for instruction
- `POST /api/instruction/:ref/documents` - Add document reference
- `POST /api/upload` - **File upload simulation**

### Payment Processing
- `POST /pitch/get-shasign` - Mock SHASIGN generation for payment forms

## Upload Endpoint Details

### Request Format
```javascript
POST /api/upload
Content-Type: multipart/form-data

// Form fields:
// - file: File object
// - clientId: Client identifier
// - passcode: Deal passcode
// - instructionRef: HLX reference
```

### Response Format
```javascript
// Success Response
{
  "blobName": "mock-1629876543210.pdf",
  "url": "https://mockblob.blob.core.windows.net/uploads/mock-1629876543210.pdf"
}

// Error Response
{
  "error": "Mock upload failed"
}
```

### Implementation Notes
- **No Actual File Storage** - Files are not persisted, only metadata returned
- **Realistic URLs** - Returns Azure Blob Storage format URLs for UI testing
- **Timestamp-based Names** - Unique blob names using current timestamp
- **Error Simulation** - Can be modified to test error scenarios

## Server-Side Injection

### Passcode Detection
The server detects passcode-only URLs and injects JavaScript variables:

```javascript
// For URL: /pitch/59914
window.helixOriginalPasscode = "59914";
window.helixCid = "27367";  // Looked up ProspectId
```

### Prefill Data Injection
For HLX references, server injects form prefill data:

```javascript
// For URL: /pitch/HLX-12345-87402
window.helixPrefillData = {
  "First_Name": "Alice",
  "Last_Name": "Smith",
  "Email": "alice@example.com",
  "Phone_Number": "0123456789"
};
```

## Client Error Reporting

### Automatic Error Collection
The server injects an error reporter that captures:
- JavaScript errors (`window.onerror`)
- Unhandled promise rejections
- Manual error reports via `window.__reportClientError()`

### Error Storage Endpoints
- `POST /__client_error` - Accept error reports
- `GET /__client_errors` - View collected errors

## Development Workflow

### Starting the Server
```bash
cd apps/pitch/backend
node scripts/mock_local_server.js
```

### Accessing the Application
```bash
# Primary test URL (passcode-only)
http://localhost:4000/pitch/59914

# HLX reference test
http://localhost:4000/pitch/HLX-12345-87402

# Root redirect
http://localhost:4000/  # Redirects to /pitch
```

### Testing Document Upload
1. Navigate to passcode URL: `http://localhost:4000/pitch/59914`
2. Complete authentication flow (auto-handled for injected passcodes)
3. Progress through steps to document upload
4. Upload files - will receive mock blob URLs
5. Check console for mock upload confirmations

## Troubleshooting

### Common Issues

**Assets Not Loading (404s)**
- Ensure client is built: `cd apps/pitch/client && npm run build`
- Check `dist` directory exists and contains assets
- Review server logs for asset path resolution

**API Calls Failing**
- Verify mock endpoints match client expectations
- Check request/response formats in browser dev tools
- Review server console for request logging

**Passcode Not Working**
- Confirm passcode exists in `mockDeals` array
- Check Status is 'OPEN' (CLOSED deals are filtered)
- Verify ProspectId mapping is correct

### Debug Logging
The server logs all requests with timestamps:
```
[mock] 2025-08-15T14:30:00.000Z GET /pitch/59914
[mock] simulated file upload to: https://mockblob.blob.core.windows.net/uploads/mock-1629876543210.pdf
```

## Production Differences

### What Mock Server Provides
- ✅ Complete API endpoint coverage
- ✅ Realistic response formats
- ✅ Error simulation capabilities
- ✅ No external dependencies

### What's Different from Production
- ❌ No actual file storage
- ❌ No database persistence
- ❌ No payment processing
- ❌ No email sending
- ❌ No Azure Key Vault integration

### Switching to Production
To test against production APIs:
1. Update Vite proxy target in `vite.config.ts`
2. Set `VITE_API_TARGET` environment variable
3. Ensure CORS is configured for localhost:5173

---

**Last Updated**: August 15, 2025  
**Mock Server Version**: Latest with upload endpoint  
**Recommended Use**: Local development and testing  
**Status**: ✅ Fully functional for complete workflow testing
