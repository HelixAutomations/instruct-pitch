# Document Upload Error Handling Fix

## Issue Description
Document upload functionality was failing with JSON parsing errors when the server returned HTML error pages instead of JSON responses.

## Error Messages Observed
```
Unexpected token '<', "<!DOCTYPE "... is not valid JSON
SyntaxError: Unexpected token '<' at position 0
```

## Root Cause Analysis
The `uploadSingleFile` function in `DocumentUpload.tsx` was attempting to parse all HTTP responses as JSON without checking the content type first. When the server returned 404 or 500 error pages in HTML format, the `await res.json()` call would fail.

## Code Location
**File**: `apps/pitch/client/src/structure/DocumentUpload.tsx`  
**Function**: `uploadSingleFile`  
**Lines**: ~235-250

## Solution Implementation

### Before (Problematic Code)
```typescript
try {
  const res = await fetch('/api/upload', { method: 'POST', body: formData });
  const data = await res.json(); // ❌ Assumes all responses are JSON
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  // ... rest of success handling
} catch (err) {
  // Error handling
}
```

### After (Fixed Code)
```typescript
try {
  const res = await fetch('/api/upload', { method: 'POST', body: formData });
  
  // Check if response is JSON before parsing
  const contentType = res.headers.get('content-type');
  let data;
  
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else {
    // Non-JSON response (likely HTML error page)
    await res.text(); // Consume the response body
    throw new Error(`Server error (${res.status}): ${res.statusText}`);
  }
  
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  // ... rest of success handling
} catch (err) {
  // Error handling with improved messages
}
```

## Key Improvements

1. **Content-Type Checking**: Validates response is JSON before parsing
2. **Graceful Error Handling**: Consumes HTML responses without parsing
3. **User-Friendly Messages**: Shows "Server error (404): Not Found" instead of JSON parsing errors
4. **Maintains Functionality**: Success paths remain unchanged

## Testing Scenarios

### Before Fix
- ❌ 404 error → "Unexpected token '<'" (confusing)
- ❌ 500 error → "Unexpected token '<'" (confusing)
- ✅ JSON success → Works correctly
- ✅ JSON error → Works correctly

### After Fix
- ✅ 404 error → "Server error (404): Not Found" (clear)
- ✅ 500 error → "Server error (500): Internal Server Error" (clear)
- ✅ JSON success → Works correctly
- ✅ JSON error → Works correctly

## Related Files Modified

### Mock Server Endpoint Addition
**File**: `apps/pitch/backend/scripts/mock_local_server.js`

Added mock `/api/upload` endpoint to prevent 404s during local development:

```javascript
app.post('/api/upload', express.raw({ type: 'multipart/form-data', limit: '50mb' }), (req, res) => {
  try {
    const mockBlobUrl = `https://mockblob.blob.core.windows.net/uploads/mock-${Date.now()}.pdf`;
    console.log('[mock] simulated file upload to:', mockBlobUrl);
    return res.json({ 
      blobName: `mock-${Date.now()}.pdf`,
      url: mockBlobUrl 
    });
  } catch (err) {
    console.error('[mock] upload error:', err);
    return res.status(500).json({ error: 'Mock upload failed' });
  }
});
```

## Deployment Considerations

1. **Production Impact**: Fix is backward compatible, no breaking changes
2. **Error Monitoring**: Consider logging these content-type mismatches for investigation
3. **Global Pattern**: Consider applying similar fixes to other fetch calls throughout the application
4. **CORS Headers**: Ensure production API endpoints return proper content-type headers

## Prevention Strategies

1. **TypeScript Utility**: Create a typed fetch wrapper that handles content-type checking
2. **Global Error Handler**: Implement application-wide error boundary for fetch failures
3. **API Standards**: Ensure all endpoints return consistent JSON responses with proper headers
4. **Testing**: Add integration tests that verify error response handling

---

**Fix Applied**: August 15, 2025  
**Severity**: High (User-facing errors)  
**Impact**: Document upload functionality restored  
**Testing**: ✅ Verified locally with mock server
