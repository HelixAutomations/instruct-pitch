# Troubleshooting Guide - Updated September 2025

## Email System Issues

### Emails Not Being Sent

#### Symptoms
- Email functions execute without errors but no emails are received
- Console shows "EMAIL_LOG_ONLY OUTPUT" messages

#### Solutions
1. **Check EMAIL_LOG_ONLY setting**:
   ```bash
   # Disable log-only mode
   EMAIL_LOG_ONLY=0
   # OR force sending
   EMAIL_FORCE_SEND=1
   ```

2. **Verify Microsoft Graph credentials**:
   ```bash
   # Check Key Vault secrets
   graph-client-id=your-app-id
   graph-client-secret=your-app-secret
   ```

3. **Test Graph API connectivity**:
   ```javascript
   // Test in Node.js console
   const { sendMail } = require('./email');
   await sendMail('test@helix-law.com', 'Test', '<p>Test email</p>');
   ```

### Wrong Email Recipients

#### Symptoms
- Emails going to unexpected addresses
- Client emails not reaching both lz@ and cb@

#### Solutions
1. **Check development routing**:
   ```javascript
   // In sendMail function
   if (Array.isArray(to)) {
     to = ['lz@helix-law.com', 'cb@helix-law.com']; // Internal emails
   } else {
     to = ['lz@helix-law.com', 'cb@helix-law.com']; // Client emails redirected
   }
   ```

2. **Verify recipient configuration** for production vs development mode

### Email Template Rendering Issues

#### Symptoms
- Broken HTML in emails
- Missing styling or images
- Incorrect reference numbers

#### Solutions
1. **Test templates locally**:
   ```bash
   cd apps/pitch/backend
   EMAIL_LOG_ONLY=1 node test-emails.js
   ```

2. **Check shortRef format**:
   ```javascript
   // Should produce HLX-PASSCODE format
   const shortRef = record.InstructionRef ? `HLX-${record.InstructionRef.split('-').pop()}` : 'N/A';
   ```

3. **Validate HTML structure** using browser developer tools

## Payment System Issues

### Stripe Webhooks Not Working

#### Symptoms
- Payments succeed in Stripe but emails not triggered
- Payment status not updating in database
- Missing receipt URLs in emails

#### Solutions
1. **Verify webhook endpoint**:
   ```bash
   # Check Stripe Dashboard webhook configuration
   https://your-domain.com/api/webhook/stripe
   ```

2. **Test webhook signature verification**:
   ```javascript
   // In webhook handler
   const event = stripeService.verifyWebhookSignature(payload, signature);
   console.log('Webhook verified:', event.type);
   ```

3. **Check webhook secret in Key Vault**:
   ```bash
   stripe-webhook-secret=whsec_...
   ```

### Receipt URLs Missing

#### Symptoms
- Success emails sent but no receipt URL included
- Receipt URL shows as "Not available" in logs

#### Solutions
1. **Verify charge object retrieval**:
   ```javascript
   // In handleSuccessfulPayment
   if (paymentIntent.latest_charge) {
     const charge = await stripeService.stripe.charges.retrieve(paymentIntent.latest_charge);
     console.log('Receipt URL:', charge.receipt_url);
   }
   ```

2. **Check Stripe API permissions** for charge access

3. **Test with actual payment** (test cards may not generate receipt URLs)

### Payment Status Not Updating

#### Symptoms
- Stripe shows payment succeeded but internal status remains pending
- Client stuck on payment screen

#### Solutions
1. **Check webhook delivery** in Stripe Dashboard
2. **Verify database connection** in webhook handler
3. **Test payment intent retrieval**:
   ```javascript
   const payment = await paymentDatabase.getPaymentByIntentId(paymentIntentId);
   console.log('Payment found:', payment ? 'YES' : 'NO');
   ```

## Debug Monitoring Issues

### Debug Emails Not Triggering

#### Symptoms
- Clients appear stuck but no debug notifications sent
- Debug email function runs without errors but no emails received

#### Solutions
1. **Test debug email function**:
   ```bash
   cd apps/pitch/backend
   node test-debug-emails.js
   ```

2. **Check stuck client detection logic**:
   ```javascript
   // In completion endpoint
   if (shouldTriggerDebugEmail) {
     await sendDebugStuckClientEmail(record, reason);
   }
   ```

3. **Verify email routing** for debug emails (should go to both recipients)

### False Positive Debug Alerts

#### Symptoms
- Too many debug notifications for normal behavior
- Debug emails triggered for expected scenarios

#### Solutions
1. **Review detection logic** in server.js completion endpoint
2. **Adjust thresholds** for stuck client detection
3. **Add exclusion rules** for known edge cases

## Database Issues

### Connection Failures

#### Symptoms
- "Missing DB config field(s)" errors
- Database operations timing out

#### Solutions
1. **Verify environment variables**:
   ```bash
   DB_USER=your_user
   DB_PASSWORD_SECRET=your-keyvault-secret
   DB_SERVER=your-server.database.windows.net
   DB_NAME=your_database
   ```

2. **Test Key Vault access**:
   ```javascript
   const { getSecret } = require('./azure-key-vault');
   const password = await getSecret(process.env.DB_PASSWORD_SECRET);
   console.log('Password retrieved:', password ? 'YES' : 'NO');
   ```

3. **Check SQL Server firewall** rules for Azure access

### Data Consistency Issues

#### Symptoms
- Payment succeeded but instruction not marked complete
- Missing instruction data in diagnostic emails

#### Solutions
1. **Check instruction update logic**:
   ```javascript
   await instructionDb.updatePaymentStatus(instructionRef, 'card', true, amount);
   const updatedInstruction = await instructionDb.getInstruction(instructionRef);
   ```

2. **Verify transaction handling** in payment processing
3. **Test database constraints** and foreign key relationships

## UI Issues

### Progress Bar Not Expanding

#### Symptoms
- Progress bar appears narrow or constrained
- Visual layout looks cramped

#### Solutions
1. **Check CSS constraints**:
   ```css
   .progress-bar {
     width: 100%; /* Should be 100%, not fixed width */
     min-width: 0;
   }
   ```

2. **Verify responsive design** across different screen sizes
3. **Test browser compatibility** for CSS grid/flexbox

### Email Template Styling Issues

#### Symptoms
- Emails appear unstyled or broken in certain clients
- Font inconsistencies across templates

#### Solutions
1. **Use inline styles** for email compatibility:
   ```html
   <p style="font-family:'Raleway',sans-serif;color:#111">Text</p>
   ```

2. **Test across email clients** (Outlook, Gmail, Apple Mail)
3. **Validate HTML structure** for email compatibility

## General Troubleshooting Steps

### 1. Check Logs
```bash
# Application logs
tail -f /var/log/application.log

# Azure App Service logs
az webapp log tail --name your-app --resource-group your-rg
```

### 2. Test Individual Components
```bash
# Test email system
node test-emails.js

# Test payment system
node -e "const stripe = require('./stripe-service'); console.log(stripe.initialized);"

# Test database
node -e "const db = require('./instructionDb'); db.testConnection();"
```

### 3. Verify Configuration
```bash
# Check environment variables
printenv | grep -E "(DB_|STRIPE_|EMAIL_)"

# Test Key Vault access
az keyvault secret show --vault-name your-vault --name graph-client-id
```

### 4. Monitor External Services
- **Stripe Dashboard** - Check webhook delivery and payment status
- **Microsoft Graph** - Verify API quotas and permissions
- **Azure Key Vault** - Check access policies and secret versions

## Completion State Troubleshooting

When visiting `/pitch/<instructionRef>` the client fetches the instruction record. The completion banner only appears when the API responds with `Stage` equal to `completed`.

In `HomePage.tsx` the stage is checked:

```
          if (stage === 'completed') {
            setInstructionCompleted(true);
            if (data.InternalStatus === 'paid') {
              const fname = rest.FirstName || '';
              const hr = new Date().getHours();
              const greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
              setCompletionGreeting(`${greet}, ${fname}.`);
            }
            setInstructionReady(true);
          }
```

The backend exposes `/api/instruction/complete` which updates the record via `markCompleted()`:

```
app.post('/api/instruction/complete', async (req, res) => {
  const { instructionRef } = req.body;
  ...
  const record = await markCompleted(instructionRef);
  ...
});
```

`markCompleted` sets `Stage='completed'` in the database:

```
async function markCompleted(ref) {
  const pool = await getSqlPool();
  const result = await pool.request()
    .input('ref', sql.NVarChar, ref)
    .query(`
      UPDATE Instructions SET Stage='completed'
      WHERE InstructionRef=@ref;
      SELECT * FROM Instructions WHERE InstructionRef=@ref;
    `);
  return result.recordset[0];
}
```

Ensure the client calls `/api/instruction/complete` once the user has uploaded any required documents and confirms the instruction. This endpoint marks the instruction as completed **and** closes the associated deal so no further payments can be taken. Without this call the server continues to return `Stage: 'in_progress'` even if payment succeeded, so the UI will not display the completed state.

## Payments temporarily disabled

Symptoms
- Payment endpoints return HTTP 503
- Clients do not receive payment-related emails

Checks
- Ensure DISABLE_PAYMENTS or PAYMENT_DISABLED is set in the backend environment
- Review logs for:
  - "🛑 /pitch/get-shasign blocked: payments disabled"
  - "🛑 /pitch/confirm-payment blocked: payments disabled"
  - "✉️  Client emails suppressed (payments disabled)"

Resolution
- This is expected while the freeze is in place. Remove/disable the flag to restore card payments and client emails.

## Development Environment Issues

For comprehensive troubleshooting of local development setup, Key Vault configuration, and git safety issues, see:
- [Development Fixes - August 15, 2025](./development-fixes-2025-08-15.md)

Common development issues:
- **Azure Functions "Key Vault not specified" errors**: Check `decoupled-functions/local.settings.json` for placeholder values
- **Documents step not visible**: Ensure using mock server (port 4000) or correct URL format with Vite
- **Git safety**: Review .gitignore updates to prevent committing sensitive files

## Legacy prefill failures

Symptoms
- Instruction page loads but no prefill data appears
- Logs show `Legacy prefill skipped: no fetchInstructionData secret`

Checks
- Confirm the Key Vault contains a secret named `fetchInstructionDataLegacy-code` (or set `FETCH_INSTRUCTION_DATA_SECRET` to a different name).
- Ensure the backend has permission to access the Key Vault specified by `KEY_VAULT_NAME`.
- Verify the legacy function URL `https://legacy-fetch-v2.azurewebsites.net/api/fetchInstructionData` is reachable from the web app.

Resolution
- Create/update the secret in Key Vault or point `FETCH_INSTRUCTION_DATA_SECRET` to the correct secret name. Deploy again so the backend loads the secret on startup.
