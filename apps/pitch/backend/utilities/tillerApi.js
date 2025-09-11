const axios = require('axios');
const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');
const { buildTillerPayload } = require('./buildTillerPayload');

const keyVaultName = process.env.KEY_VAULT_NAME || 'helixlaw-instructions';
const vaultUrl = `https://${keyVaultName}.vault.azure.net`;
const credential = new DefaultAzureCredential();
const secretClient = new SecretClient(vaultUrl, credential);

let cachedClientId;
let cachedClientSecret;
let cachedToken;
let tokenExpiry = 0;

async function getCredentials() {
    console.log('[TILLER-AUTH] Getting credentials from Key Vault:', vaultUrl);
    
    if (!cachedClientId || !cachedClientSecret) {
        console.log('[TILLER-AUTH] Fetching new credentials from Key Vault...');
        try {
            const [id, secret] = await Promise.all([
                secretClient.getSecret('tiller-clientid'),
                secretClient.getSecret('tiller-clientsecret'),
            ]);
            cachedClientId = id.value;
            cachedClientSecret = secret.value;
            console.log('[TILLER-AUTH] SUCCESS: Credentials retrieved from Key Vault');
        } catch (err) {
            console.error('[TILLER-AUTH] ERROR: Failed to get credentials from Key Vault:', err.message);
            console.error('[TILLER-AUTH] Key Vault URL:', vaultUrl);
            console.error('[TILLER-AUTH] Error details:', err);
            throw err;
        }
    } else {
        console.log('[TILLER-AUTH] Using cached credentials');
    }
    
    return { clientId: cachedClientId, clientSecret: cachedClientSecret };
}

async function refreshToken() {
    console.log('[TILLER-AUTH] Refreshing token...');
    
    try {
        const { clientId, clientSecret } = await getCredentials();
        const body = new URLSearchParams({
            grant_type: 'client_credentials',
            scope: 'VerificationsAPI',
            client_id: clientId,
            client_secret: clientSecret,
        }).toString();

        console.log('[TILLER-AUTH] Requesting token for client:', clientId);

        const res = await axios.post(
            'https://verify-auth.tiller-verify.com/connect/token',
            body,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Accept: 'application/json',
                },
            }
        );

        console.log('[TILLER-AUTH] Token response status:', res.status);
        cachedToken = res.data.access_token;
        tokenExpiry = Date.now() + (res.data.expires_in - 60) * 1000;
        console.log('[TILLER-AUTH] SUCCESS: Token expires in', res.data.expires_in, 'seconds');
        return cachedToken;
    } catch (err) {
        console.error('[TILLER-AUTH] ERROR: Failed to refresh token');
        if (err.response) {
            console.error('[TILLER-AUTH] HTTP Status:', err.response.status);
            console.error('[TILLER-AUTH] Error data:', JSON.stringify(err.response.data, null, 2));
        } else {
            console.error('[TILLER-AUTH] Network error:', err.message);
        }
        throw err;
    }
}

async function getToken() {
    if (cachedToken && Date.now() < tokenExpiry) {
        console.log('ℹ️ Using cached Tiller token');
        return cachedToken;
    }
    return refreshToken();
}

async function submitVerification(instructionData) {
    const instructionRef = instructionData.instructionRef || instructionData.InstructionRef;
    console.log(`[TILLER-API] Starting verification submission for: ${instructionRef}`);
    
    try {
        console.log(`[TILLER-API] Getting auth token...`);
        const token = await getToken();
        console.log(`[TILLER-API] Token obtained successfully`);
        
        console.log(`[TILLER-API] Building payload for ${instructionRef}...`);
        const payload = buildTillerPayload(instructionData);
        console.log(`[TILLER-API] Payload built successfully`);
        console.log(`[TILLER-API] Payload summary:`, {
            hasProfile: !!payload.profile,
            countryCode: payload.profile?.currentAddress?.structured?.countryCode,
            firstName: payload.profile?.firstName,
            lastName: payload.profile?.lastName,
            email: payload.profile?.email,
            cardTypesCount: payload.profile?.cardTypes?.length || 0
        });
        
        console.log(`[TILLER-API] Submitting to Tiller API...`);
        const res = await axios.post(
            'https://verify-api.tiller-verify.com/api/v1/verifications',
            payload,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );
        
        console.log(`[TILLER-API] SUCCESS: Verification submitted for ${instructionRef}`);
        console.log(`[TILLER-API] Response status:`, res.status);
        console.log(`[TILLER-API] Response data:`, JSON.stringify(res.data, null, 2));
        return res.data;
    } catch (err) {
        console.error(`[TILLER-API] ERROR: Verification failed for ${instructionRef}`);
        if (err.response) {
            console.error(`[TILLER-API] HTTP Status:`, err.response.status);
            console.error(`[TILLER-API] Error Response:`, JSON.stringify(err.response.data, null, 2));
            console.error(`[TILLER-API] Request Headers:`, err.config?.headers);
        } else {
            console.error(`[TILLER-API] Network/Other Error:`, err.message);
        }
        console.error(`[TILLER-API] Full error:`, err);
        throw err;
    }
}

module.exports = { submitVerification };
