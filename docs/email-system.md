# Email System Documentation

## Overview

The instruction platform features a comprehensive email notification system designed for professional legal practice. All emails use litigation-grade templates with clean, direct messaging and consistent branding.

## Email Types

### Client-Facing Emails

#### 1. Client Success Email
**Triggered**: After successful payment completion
**Recipients**: Client (redirected to internal team in dev)
**Content**:
- Professional confirmation message
- Payment amount highlighted in red for clarity
- Real Stripe receipt URL for official records
- HLX-PASSCODE reference format
- Clean system signature (no contact encouragement)

#### 2. Client Failure Email  
**Triggered**: After payment failure
**Recipients**: Client (redirected to internal team in dev)
**Content**:
- Direct notification of payment issue
- HLX-PASSCODE reference for support
- Professional next steps guidance
- No flowery language or excessive encouragement

#### 3. Bank Transfer Email
**Triggered**: When client selects bank transfer option
**Recipients**: Client (redirected to internal team in dev)
**Content**:
- Complete bank transfer details
- HLX-PASSCODE as transfer reference
- Professional instruction formatting
- Payment amount clearly highlighted

### Internal Emails

#### 4. Fee Earner Diagnostic Email
**Triggered**: After instruction completion (success or failure)
**Recipients**: Both `lz@helix-law.com` and `cb@helix-law.com`
**Content**:
- **Comprehensive system state report**
- Full instruction details and payment information
- Document upload status and file listings
- Technical diagnostics and timestamps
- Database state and integration status
- Recommended next actions for case management
- Complete technical context for troubleshooting

#### 5. Debug Stuck Client Email
**Triggered**: When client encounters system issues
**Recipients**: Both `lz@helix-law.com` and `cb@helix-law.com`
**Content**:
- **Brief technical alert format**
- HLX-PASSCODE reference
- Client contact information
- Issue description and system status
- Timestamp and stage information
- Minimal, focused debugging information

## Email Routing

### Development Mode (Current)
```javascript
// All emails redirected to internal team
if (Array.isArray(to)) {
  to = ['lz@helix-law.com', 'cb@helix-law.com']; // Internal emails
} else {
  to = ['lz@helix-law.com', 'cb@helix-law.com']; // Client emails also redirected
}
```

### Production Mode (Future)
```javascript
// Client emails go to actual recipients, internal emails to team
if (Array.isArray(to)) {
  to = ['lz@helix-law.com', 'cb@helix-law.com']; // Internal emails
} else {
  // to = actual client email address
}
```

## Technical Implementation

### Email Delivery
- **Primary**: Microsoft Graph API integration
- **Fallback**: SMTP (if Graph fails)
- **Authentication**: Azure Key Vault for Graph credentials
- **Signature**: System signature (no contact info for automated emails)

### Reference Format
All emails use consistent **HLX-PASSCODE** format:
```javascript
// Extract passcode from HLX-PROSPECTID-PASSCODE
const shortRef = record.InstructionRef ? `HLX-${record.InstructionRef.split('-').pop()}` : 'N/A';
```

### Stripe Receipt Integration
```javascript
// Extract receipt URL from successful payment
if (paymentIntent.latest_charge) {
  const charge = await stripeService.stripe.charges.retrieve(paymentIntent.latest_charge);
  receiptUrl = charge.receipt_url;
}
```

## Email Templates

### Design Standards
- **Typography**: Raleway font family throughout
- **Colors**: 
  - Payment amounts: `#dc2626` (red) for prominence
  - Links: `#3690CE` (blue) for clarity
  - Success: `#22c55e` (green)
- **Layout**: Clean, professional table-based design
- **Signatures**: Minimal system signature without contact encouragement

### Content Guidelines
- **Professional tone**: Direct, clear, litigation-appropriate language
- **No flowery language**: Avoid excessive encouragement or casual phrasing
- **Clear next steps**: Specific actions when applicable
- **Technical precision**: Accurate references and technical details

## Testing

### Test Files
- `test-emails.js` - Comprehensive email template testing
- `test-debug-emails.js` - Debug notification system testing

### Development Testing
```bash
cd apps/pitch/backend
node test-emails.js        # Test all email templates
node test-debug-emails.js  # Test debug notifications
```

## Configuration

### Environment Variables
```bash
EMAIL_LOG_ONLY=1          # Log emails without sending (development)
EMAIL_FORCE_SEND=1        # Force sending even in log-only mode
```

### Key Vault Secrets
- `graph-client-id` - Microsoft Graph application ID
- `graph-client-secret` - Microsoft Graph application secret
- Tenant ID configured in application code

## Monitoring

### Email Delivery Tracking
- Comprehensive console logging for all email operations
- Success/failure tracking for each recipient
- Automatic retry logic for temporary failures

### Debug Client Detection
- Automatic detection of stuck clients at completion endpoint
- Payment failure monitoring and alerting
- Proactive technical notifications for issue resolution

## Future Enhancements

### Production Deployment
1. Update email routing to send client emails to actual recipients
2. Maintain internal copy functionality for compliance
3. Consider adding email delivery status tracking
4. Implement email template versioning for A/B testing

### Advanced Features
1. Email preference management for clients
2. Automated follow-up sequences
3. Integration with case management systems
4. Advanced analytics and delivery reporting
