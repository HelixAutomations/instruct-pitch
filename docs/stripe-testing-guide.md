# Stripe Local Testing Guide

Quick reference for testing Stripe payments locally.

## Environment Setup

### Frontend (.env in `/apps/pitch/client/`)
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

### Backend (.env in `/apps/pitch/backend/` or root)
```bash
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## Get Stripe Test Credentials

1. Go to **Stripe Dashboard:** https://dashboard.stripe.com/
2. **Switch to TEST mode** (toggle in top left)
3. **Get keys from:** https://dashboard.stripe.com/test/apikeys
   - **Publishable key:** `pk_test_...` (frontend safe)
   - **Secret key:** `sk_test_...` (backend only)

## Test Card Numbers

### ✅ Successful Payments
- **Visa:** `4242424242424242`
- **Mastercard:** `5555555555554444`
- **American Express:** `378282246310005`

### ❌ Failed Payments
- **Card declined:** `4000000000000002`
- **Insufficient funds:** `4000000000009995`
- **Expired card:** `4000000000000069`

### 🔐 3D Secure Testing
- **3DS required:** `4000000000003220`
- **3DS challenge:** `4000000000000101`

### Card Details (for any test card)
- **Expiry:** Any future date (e.g., `12/28`)
- **CVC:** Any 3-4 digits (e.g., `123`)
- **ZIP:** Any valid postcode (e.g., `SW1A 1AA`)

## Quick Test

1. **Start servers:**
   ```bash
   # Backend
   cd apps/pitch/backend && npm start
   
   # Frontend  
   cd apps/pitch/client && npm run dev
   ```

2. **Test successful payment:**
   - Card: `4242424242424242`
   - Expiry: `12/28`
   - CVC: `123`
   - ZIP: `SW1A 1AA`

3. **Test declined payment:**
   - Card: `4000000000000002`
   - Same other details

## Debugging

### Check Environment Variables
```javascript
// Browser console (frontend)
console.log('Stripe Key:', import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

// Backend terminal
console.log('Backend Stripe Key:', process.env.STRIPE_SECRET_KEY)
```

### Common Issues
- **"Stripe is not defined"** → Check `VITE_STRIPE_PUBLISHABLE_KEY`
- **"Invalid API key"** → Use test keys (`pk_test_` / `sk_test_`)
- **Payment not processing** → Check both frontend and backend keys are set

## Webhook Testing (Optional)

```bash
# Install Stripe CLI
stripe login

# Forward webhooks to localhost
stripe listen --forward-to localhost:3000/api/webhook/stripe

# Copy the webhook secret from CLI output to .env
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Test Checklist

- [ ] ✅ Successful payment (`4242424242424242`)
- [ ] ❌ Declined payment (`4000000000000002`)
- [ ] 🔐 3D Secure payment (`4000000000003220`)
- [ ] 📱 Mobile viewport
- [ ] 🔄 Form validation
- [ ] 🎯 Success/failure redirects

---

**Quick Reference URL:** https://stripe.com/docs/testing#cards
