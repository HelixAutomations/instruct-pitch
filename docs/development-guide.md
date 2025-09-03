# Development Guide - Updated September 2025

## Overview

This guide covers the complete development setup and workflow for the instruction platform, including the latest email system, Stripe integration, and UI improvements.

## Prerequisites

- **Node.js 18+**
- **npm**
- **SQL Server database** with Instructions table
- **Azure Key Vault** access for secrets
- **Stripe account** (test and live modes)
- **Microsoft Graph** application for email services

## Environment Setup

### 1. Clone and Install Dependencies
```bash
# Clone repository
git clone https://github.com/HelixAutomations/instruct-pitch.git
cd instruct-pitch

# Install all dependencies
npm install --prefix apps/pitch/backend
npm install --prefix apps/pitch/client
npm install --prefix decoupled-functions
```

### 2. Database Configuration
Set up SQL Server connection variables:
```bash
DB_USER=your_db_user
DB_PASSWORD_SECRET=your-keyvault-secret-name
DB_SERVER=your-sql-server.database.windows.net
DB_NAME=your_database_name
```

### 3. Azure Key Vault Secrets
Configure required secrets in Azure Key Vault:

#### Payment Secrets
```bash
stripe-restricted-payments-key=sk_live_xxx or sk_test_xxx
stripe-webhook-secret=whsec_xxx
stripe-publishable-key=pk_live_xxx or pk_test_xxx
```

#### Email Secrets
```bash
graph-client-id=your-graph-app-id
graph-client-secret=your-graph-app-secret
```

#### Database Secrets
```bash
your-database-password-secret=your-actual-db-password
```

### 4. Environment Variables
Create `.env` file in backend directory:
```bash
# Development settings
EMAIL_LOG_ONLY=1              # Log emails without sending
EMAIL_FORCE_SEND=0            # Override log-only when needed
DISABLE_PAYMENTS=false        # Enable payment processing

# Azure configuration
TENANT_ID=your-azure-tenant-id
KEY_VAULT_URL=https://your-vault.vault.azure.net/

# Development URLs
CLIENT_URL=http://localhost:3000
```

## Development Workflow

### Quick Start (Recommended)
```bash
cd apps/pitch/backend
npm run dev:hot
```
This starts both backend and frontend with hot reload.

**Access**: http://localhost:4000/pitch/59914

### Separate Development Servers
```bash
# Terminal 1 - Backend
cd apps/pitch/backend
npm run dev

# Terminal 2 - Frontend
cd apps/pitch/client
npm start
```

**Access**: 
- Frontend: http://localhost:3000/pitch/59914
- Backend API: http://localhost:4000

### Azure Functions (Optional)
```bash
cd decoupled-functions
func start
```

## Testing

### Email System Testing
```bash
cd apps/pitch/backend

# Test all email templates
node test-emails.js

# Test debug notification system  
node test-debug-emails.js

# Log-only mode (no actual sending)
EMAIL_LOG_ONLY=1 node test-emails.js
```

### Payment Testing
Use Stripe test cards:
- **Success**: 4242424242424242
- **Decline**: 4000000000000002
- **3D Secure**: 4000002500003155

### UI Testing
```bash
cd apps/pitch/client
npm test                    # Run test suite
npm run build              # Test production build
```

## Code Structure

### Backend (`apps/pitch/backend/`)
```
├── server.js              # Main Express server
├── email.js               # Email system with all templates
├── payment-routes.js      # Stripe webhook handling
├── stripe-service.js      # Stripe API integration
├── instructionDb.js       # Database operations
├── upload.js              # File upload handling
└── test-*.js             # Testing utilities
```

### Frontend (`apps/pitch/client/src/`)
```
├── components/
│   ├── premium/           # Premium checkout components
│   └── paymentsV2/       # Payment form components
├── structure/             # Page-level components
├── styles/               # CSS and styling
└── context/              # React context providers
```

## Email Development

### Email Template Development
1. **Edit templates** in `email.js`
2. **Test locally** with test scripts
3. **Use EMAIL_LOG_ONLY=1** to avoid sending real emails
4. **Check console output** for rendered email content

### Email Routing (Development)
All emails currently route to `lz@helix-law.com` and `cb@helix-law.com`:
```javascript
// Current development routing
if (Array.isArray(to)) {
  to = ['lz@helix-law.com', 'cb@helix-law.com']; // Internal emails
} else {
  to = ['lz@helix-law.com', 'cb@helix-law.com']; // Client emails also redirected
}
```

### Adding New Email Templates
1. **Create template function** in `email.js`
2. **Add to test suite** in `test-emails.js`
3. **Follow existing patterns** for consistency
4. **Use HLX-PASSCODE** reference format

## Payment Development

### Stripe Webhook Testing
```bash
# Install Stripe CLI
stripe login
stripe listen --forward-to localhost:4000/api/webhook/stripe

# Test webhook events
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
```

### Payment Flow Testing
1. **Create payment intent** via frontend
2. **Use test cards** for different scenarios
3. **Monitor webhook delivery** in Stripe Dashboard
4. **Check email notifications** are triggered correctly

## Database Development

### Schema Updates
Update `docs/database-schema.sql` with any changes to:
- Instructions table structure
- Payment-related fields
- Email tracking fields

### Testing Database Operations
```bash
# Test database connectivity
node -e "const db = require('./instructionDb'); db.testConnection();"
```

## Deployment

### Branch Strategy
- **main** - Production-ready code
- **deployment-backup** - Stable checkpoint for deployment
- **workspace** - Active development branch

### Pre-deployment Checklist
1. ✅ **Test all email templates** with real scenarios
2. ✅ **Verify Stripe webhook** endpoints in Dashboard
3. ✅ **Update Key Vault secrets** for production
4. ✅ **Test payment flows** with live Stripe keys
5. ✅ **Update email routing** for production recipients
6. ✅ **Verify database connections** in production environment

### Production Deployment
```bash
# Build production frontend
cd apps/pitch/client
npm run build

# Deploy to Azure App Service
# (Use existing deployment scripts)
```

## Troubleshooting

### Common Issues

#### Email Not Sending
1. **Check Key Vault** access for Graph credentials
2. **Verify tenant ID** configuration
3. **Test Graph API** connectivity
4. **Check EMAIL_LOG_ONLY** environment variable

#### Payment Failures
1. **Verify Stripe keys** in Key Vault
2. **Check webhook endpoint** URL in Stripe Dashboard
3. **Test webhook signature** verification
4. **Monitor Stripe logs** for errors

#### Database Connection Issues
1. **Verify connection string** parameters
2. **Check Key Vault** database password secret
3. **Test SQL Server** connectivity from Azure
4. **Validate database** permissions

### Debugging Tools

#### Email System Debug
```bash
# Enable detailed email logging
DEBUG=email* node server.js

# Test specific email scenarios
node -e "
const { sendClientSuccessEmail } = require('./email');
sendClientSuccessEmail(testRecord);
"
```

#### Payment Debug
```bash
# Monitor webhook delivery
stripe listen --print-json

# Test payment scenarios
DEBUG=payment* node server.js
```

## Performance Optimization

### Email Performance
- **Lazy loading** of heavy modules in email functions
- **Async/await** patterns for better concurrency
- **Error isolation** to prevent email failures affecting payments

### Payment Performance
- **Webhook idempotency** to prevent duplicate processing
- **Database connection pooling** for better throughput
- **Stripe API rate limiting** awareness

## Security Considerations

### Secret Management
- **Never commit** secrets to version control
- **Use Key Vault** for all sensitive configuration
- **Rotate secrets** regularly

### Payment Security
- **Webhook signature verification** for all Stripe events
- **Client-side payment** confirmation only
- **Server-side validation** of all payment states

### Email Security
- **Graph API permissions** minimal scope
- **Email content validation** to prevent injection
- **Recipient validation** in production mode

## Development Best Practices

### Code Quality
- **ESLint configuration** for consistent style
- **Error handling** at all integration points
- **Comprehensive logging** for debugging

### Testing Strategy
- **Unit tests** for critical business logic
- **Integration tests** for external services
- **Manual testing** for user flows

### Documentation
- **Keep docs updated** with code changes
- **Comment complex logic** especially in email templates
- **Document configuration** requirements
