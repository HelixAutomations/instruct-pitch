const nodemailer = require('nodemailer');
const axios = require('axios');
const sql = require('mssql');
const { DefaultAzureCredential } = require("@azure/identity");
const { SecretClient } = require("@azure/keyvault-secrets");
const { getSqlPool } = require('./sqlClient');

const FROM_ADDRESS = 'automations@helix-law.com';
const FROM_NAME = 'Helix Law Team';

const tenantId = "7fbc252f-3ce5-460f-9740-4e1cb8bf78b8";
const clientIdSecret = "graph-pitchbuilderemailprovider-clientid";
const clientSecretSecret = "graph-pitchbuilderemailprovider-clientsecret";
const keyVaultName = process.env.KEY_VAULT_NAME || "helixlaw-instructions";
const vaultUrl = `https://${keyVaultName}.vault.azure.net`;
const credential = new DefaultAzureCredential();
const secretClient = new SecretClient(vaultUrl, credential);
let cachedClientId, cachedClientSecret;
// Local secrets parity: reuse KEY_VAULT_MODE=local + local-secrets.json pattern
let localSecrets = null;
const localSecretsMode = process.env.KEY_VAULT_MODE === 'local';
if (localSecretsMode) {
  const fs = require('fs');
  const path = require('path');
  const localSecretsFile = process.env.LOCAL_SECRETS_FILE || path.join(__dirname, 'local-secrets.json');
  try {
    if (fs.existsSync(localSecretsFile)) {
      localSecrets = JSON.parse(fs.readFileSync(localSecretsFile, 'utf8')) || {};
      console.log('🧪 [email] Local secrets loaded');
    } else {
      console.warn('⚠️  [email] Local secrets file not found at', localSecretsFile);
    }
  } catch (e) {
    console.warn('⚠️  [email] Failed to parse local secrets file:', e.message);
  }
}

const smtpHost = process.env.SMTP_HOST;
let transporter = null;
if (smtpHost) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function deriveEmail(fullName) {
  if (!fullName) return FROM_ADDRESS;
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .map(n => n[0].toLowerCase())
    .join('');
  return `${initials}@helix-law.com`;
}

function formatName(record) {
  return [record.Title, record.FirstName, record.LastName].filter(Boolean).join(' ');
}

async function getDocumentsForInstruction(ref) {
  if (process.env.EMAIL_LOG_ONLY) {
    // Skip DB access during logging/demo mode
    return [];
  }
  try {
    const pool = await getSqlPool();
    const result = await pool.request()
      .input('ref', sql.NVarChar, ref)
      .query('SELECT FileName, BlobUrl FROM Documents WHERE InstructionRef=@ref');
    return result.recordset || [];
  } catch (err) {
    console.error('getDocumentsForInstruction failed (fallback to empty):', err.message);
    return [];
  }
}

function buildDocList(docs) {
  if (!docs.length) return '<li>None</li>';
  return docs.map(d => `<li><a href="${d.BlobUrl}">${d.FileName}</a></li>`).join('');
}

function wrapSignature(bodyHtml) {
  const signature = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Helix Email</title>
</head>
<body style="margin:0; padding:0; font-family: Raleway, sans-serif; font-size:10pt; line-height:1.4; color:#000;">
  <div style="margin-bottom:4px; font-family: Raleway, sans-serif; color:#000;">
    ${bodyHtml}
  </div>
  <table border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin:0; padding:0; width:auto; font-family: Raleway, sans-serif; color:#000;">
    <tr>
      <td style="padding-bottom: 8px; font-family: Raleway, sans-serif; color:#000;">
        <img src="https://helix-law.co.uk/wp-content/uploads/2025/01/50px-logo.png" alt="Helix Law Logo" style="height:50px; display:block;" />
      </td>
    </tr>
    <tr>
      <td style="padding-top: 8px; padding-bottom: 8px; font-family: Raleway, sans-serif; color:#000;">
        <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <td style="padding-right:4px; vertical-align:middle;">
              <img src="https://helix-law.co.uk/wp-content/uploads/2025/01/email.png" alt="Email Icon" style="height:12px; vertical-align:middle;" />
            </td>
            <td style="padding-right:15px; vertical-align:middle; font-family: Raleway, sans-serif;">
              <a href="mailto:${FROM_ADDRESS}" style="color:#3690CE; text-decoration:none;">${FROM_ADDRESS}</a>
            </td>
            <td style="padding-right:4px; vertical-align:middle;">
              <img src="https://helix-law.co.uk/wp-content/uploads/2025/01/phone.png" alt="Phone Icon" style="height:12px; vertical-align:middle;" />
            </td>
            <td style="padding-right:15px; vertical-align:middle; font-family: Raleway, sans-serif;">
              <a href="tel:+443453142044" style="color:#0D2F60; text-decoration:none;">0345 314 2044</a>
            </td>
            <td style="padding-right:4px; vertical-align:middle;">
              <img src="https://helix-law.co.uk/wp-content/uploads/2025/01/website.png" alt="Website Icon" style="height:12px; vertical-align:middle;" />
            </td>
            <td style="padding-right:0; vertical-align:middle; font-family: Raleway, sans-serif;">
              <a href="https://www.helix-law.com/" style="color:#3690CE; text-decoration:none;">www.helix-law.com</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding-top:8px; padding-bottom: 8px; font-family: Raleway, sans-serif;">
        <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <td style="padding-right:4px; vertical-align:middle;">
              <img src="https://helix-law.co.uk/wp-content/uploads/2025/01/location.png" alt="Location Icon" style="height:12px; vertical-align:middle;" />
            </td>
            <td style="vertical-align:middle; color:#0D2F60; font-family: Raleway, sans-serif;">
              Helix Law Ltd, Second Floor, Britannia House, 21 Station Street, Brighton, BN1 4DE
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding-top:8px; color:#D65541; font-size:7pt; line-height:1.5; font-family: Raleway, sans-serif;">
        DISCLAIMER: Please be aware of cyber-crime. Our bank account details will NOT change during the course of a transaction.
        Helix Law Limited will not be liable if you transfer money to an incorrect account.
        We accept no responsibility or liability for malicious or fraudulent emails purportedly coming from our firm,
        and it is your responsibility to ensure that any emails coming from us are genuine before relying on anything contained within them.
      </td>
    </tr>
    <tr>
      <td style="padding-top:8px; font-style:italic; font-size:7pt; line-height:1.5; color:#444; font-family: Raleway, sans-serif;">
        Helix Law Limited is a limited liability company registered in England and Wales. Registration Number 07845461. A list of Directors is available for inspection at the Registered Office: Second Floor, Britannia House, 21 Station Street, Brighton, BN1 4DE. Authorised and regulated by the Solicitors Regulation Authority. The term partner is a reference to a Director or senior solicitor of Helix Law Limited. Helix Law Limited does not accept service by email. This email is sent by and on behalf of Helix Law Limited. It may be confidential and may also be legally privileged. It is intended only for the stated addressee(s) and access to it by any other person is unauthorised. If you are not an addressee, you must not disclose, copy, circulate or in any other way use or rely on the information contained in this email. If you have received it in error, please inform us immediately and delete all copies. All copyright is reserved entirely on behalf of Helix Law Limited. Helix Law and applicable logo are exclusively owned trademarks of Helix Law Limited, registered with the Intellectual Property Office under numbers UK00003984532 and UK00003984535. The trademarks should not be used, copied or replicated without consent first obtained in writing.
      </td>
    </tr>
  </table>
</body>
</html>`;
  return signature;
}

function wrapSystemSignature(bodyHtml) {
  const signature = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Helix Email</title>
</head>
<body style="margin:0; padding:0; font-family: Raleway, sans-serif; font-size:10pt; line-height:1.4; color:#000;">
  <div style="margin-bottom:4px; font-family: Raleway, sans-serif; color:#000;">
    ${bodyHtml}
  </div>
  <table border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin:0; padding:0; width:auto; font-family: Raleway, sans-serif; color:#000;">
    <tr>
      <td style="padding-bottom: 8px; font-family: Raleway, sans-serif; color:#000;">
        <img src="https://helix-law.co.uk/wp-content/uploads/2025/01/50px-logo.png" alt="Helix Law Logo" style="height:50px; display:block;" />
      </td>
    </tr>
    <tr>
      <td style="padding-top:8px; color:#D65541; font-size:6pt; line-height:1.4; font-family: Raleway, sans-serif;">
        DISCLAIMER: Please be aware of cyber-crime. Our bank account details will NOT change during the course of a transaction.
        Helix Law Limited will not be liable if you transfer money to an incorrect account.
        We accept no responsibility or liability for malicious or fraudulent emails purportedly coming from our firm,
        and it is your responsibility to ensure that any emails coming from us are genuine before relying on anything contained within them.
      </td>
    </tr>
    <tr>
      <td style="padding-top:8px; font-style:italic; font-size:6pt; line-height:1.4; color:#444; font-family: Raleway, sans-serif;">
        Helix Law Limited is a limited liability company registered in England and Wales. Registration Number 07845461. A list of Directors is available for inspection at the Registered Office: Second Floor, Britannia House, 21 Station Street, Brighton, BN1 4DE. Authorised and regulated by the Solicitors Regulation Authority. The term partner is a reference to a Director or senior solicitor of Helix Law Limited. Helix Law Limited does not accept service by email. This email is sent by and on behalf of Helix Law Limited. It may be confidential and may also be legally privileged. It is intended only for the stated addressee(s) and access to it by any other person is unauthorised. If you are not an addressee, you must not disclose, copy, circulate or in any other way use or rely on the information contained in this email. If you have received it in error, please inform us immediately and delete all copies. All copyright is reserved entirely on behalf of Helix Law Limited. Helix Law and applicable logo are exclusively owned trademarks of Helix Law Limited, registered with the Intellectual Property Office under numbers UK00003984532 and UK00003984535. The trademarks should not be used, copied or replicated without consent first obtained in writing.
      </td>
    </tr>
  </table>
</body>
</html>`;
  return signature;
}

async function getGraphCredentials() {
  if (!cachedClientId || !cachedClientSecret) {
    if (localSecretsMode && localSecrets) {
      cachedClientId = localSecrets[clientIdSecret];
      cachedClientSecret = localSecrets[clientSecretSecret];
      if (!cachedClientId || !cachedClientSecret) {
        console.warn('⚠️  [email] Missing Graph secrets in local secrets file');
      }
    } else {
      const [id, secret] = await Promise.all([
        secretClient.getSecret(clientIdSecret),
        secretClient.getSecret(clientSecretSecret),
      ]);
      cachedClientId = id.value;
      cachedClientSecret = secret.value;
    }
  }
  return { clientId: cachedClientId, clientSecret: cachedClientSecret };
}

async function sendViaGraph(to, subject, html) {
  const { clientId, clientSecret } = await getGraphCredentials();
  const tokenRes = await axios.post(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }).toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  const accessToken = tokenRes.data.access_token;
  
  // Handle both single email (string) and multiple emails (array)
  const recipients = Array.isArray(to) 
    ? to.map(email => ({ emailAddress: { address: email } }))
    : [{ emailAddress: { address: to } }];
  
  const payload = {
    message: {
      subject,
      body: { contentType: "HTML", content: html },
      toRecipients: recipients,
      from: { emailAddress: { address: FROM_ADDRESS } },
    },
    saveToSentItems: "false",
  };
  await axios.post(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(FROM_ADDRESS)}/sendMail`,
    payload,
    { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } }
  );
}


async function sendMail(to, subject, bodyHtml) {
  // Testing redirect: route ALL emails to both internal recipients but keep production appearance
  // Both internal emails (arrays) and client emails (strings) go to both lz@ and cb@
  if (Array.isArray(to)) {
    to = ['lz@helix-law.com', 'cb@helix-law.com']; // Internal emails go to both
  } else {
    to = ['lz@helix-law.com', 'cb@helix-law.com']; // Client emails also go to both
  }
  
  // Use system signature for automated emails (no contact info)
  const html = wrapSystemSignature(bodyHtml);

  // Debug/log mode: if EMAIL_LOG_ONLY is set, just output the rendered email and return.
  const forceSend = process.env.EMAIL_FORCE_SEND === '1';
  if (process.env.EMAIL_LOG_ONLY && !forceSend) {
    console.log('--- EMAIL_LOG_ONLY OUTPUT START ---');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('HTML (truncated 1000 chars):');
    console.log(html.length > 1000 ? html.slice(0,1000) + '\n...[truncated]...' : html);
    console.log('--- EMAIL_LOG_ONLY OUTPUT END ---');
    return;
  }
  try {
    await sendViaGraph(to, subject, html);
    return;
  } catch (err) {
    console.error("sendMail via Graph failed, falling back to SMTP", err);
  }
  if (!transporter) {
    console.error("SMTP_HOST not configured, cannot send email via SMTP");
    return;
  }
  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_ADDRESS}>`,
    to,
    subject,
    html,
  });
}

function buildClientSuccessBody(record) {
  const firstName = record.FirstName || 'Client';
  const greeting = `Dear ${firstName},`;
  const amount = record.PaymentAmount != null ? Number(record.PaymentAmount).toFixed(2) : '';
  const product = record.PaymentProduct || 'your matter';
  
  // Extract passcode and create HLX-PASSCODE format for display
  const passcode = record.InstructionRef.split('-').pop() || record.InstructionRef;
  const shortRef = passcode === record.InstructionRef ? passcode : `HLX-${passcode}`;  // Include receipt URL if available
  const receiptSection = record.ReceiptUrl ? 
    `<p><a href="${record.ReceiptUrl}" style="color: #3690CE; text-decoration: none;">View your payment receipt</a></p>` : '';
  
  return `
    <div style="font-family: Raleway, sans-serif; color: #1a1a1a; line-height: 1.6;">
      <p>${greeting}</p>
      <p><strong>Your instruction ${shortRef} has been received and payment of £${amount} confirmed.</strong></p>
      <p>Your matter will now proceed through our litigation process. We will contact you directly when the next stage requires your input.</p>
      ${receiptSection}
      <p style="margin-top: 24px; color: #666; font-size: 14px;">
        Helix Law Ltd
      </p>
    </div>
  `;
}

function buildClientFailureBody(record) {
  const firstName = record.FirstName || 'Client';
  const greeting = `Dear ${firstName},`;
  const amount = record.PaymentAmount != null ? Number(record.PaymentAmount).toFixed(2) : '';
  const product = record.PaymentProduct || 'your matter';
  
  // Extract passcode and create HLX-PASSCODE format for display and bank reference
  const passcode = record.InstructionRef.split('-').pop() || record.InstructionRef;
  const shortRef = passcode === record.InstructionRef ? passcode : `HLX-${passcode}`;
  const bankRef = shortRef; // Use HLX-PASSCODE for bank transfer reference
  
  return `
    <div style="font-family: Raleway, sans-serif; color: #1a1a1a; line-height: 1.6;">
      <p>${greeting}</p>
      <p><strong>Your instruction ${shortRef} is received.</strong></p>
      <p style="color: #D65541; font-weight: 600; margin: 16px 0;"><strong>Payment of £${amount} requires completion.</strong></p>
      <p>Your information is secure. Complete payment to proceed with your matter.</p>
      <p>You may pay by bank transfer using these details:</p>
      <table style="border-collapse:collapse; margin:16px 0; width:100%; max-width:480px;">
        <tr><td style="padding:8px; border:1px solid #e2e8f0; font-weight:600; width:40%">Account Name</td><td style="padding:8px; border:1px solid #e2e8f0;">Helix Law General Client Account</td></tr>
        <tr><td style="padding:8px; border:1px solid #e2e8f0; font-weight:600;">Bank</td><td style="padding:8px; border:1px solid #e2e8f0;">Barclays Bank, Eastbourne</td></tr>
        <tr><td style="padding:8px; border:1px solid #e2e8f0; font-weight:600;">Sort Code</td><td style="padding:8px; border:1px solid #e2e8f0;">20-27-91</td></tr>
        <tr><td style="padding:8px; border:1px solid #e2e8f0; font-weight:600;">Account Number</td><td style="padding:8px; border:1px solid #e2e8f0;">9347 2434</td></tr>
        <tr><td style="padding:8px; border:1px solid #e2e8f0; font-weight:600;">Reference</td><td style="padding:8px; border:1px solid #e2e8f0;">${bankRef}</td></tr>
        <tr><td style="padding:8px; border:1px solid #e2e8f0; font-weight:600;">Amount (GBP)</td><td style="padding:8px; border:1px solid #e2e8f0;">£${amount}</td></tr>
      </table>
      <p>Please use the reference exactly so we can match your payment. Faster Payments usually arrive within minutes.</p>
      <p style="margin-top: 24px; color: #666; font-size: 14px;">
        Helix Law Ltd
      </p>
    </div>
  `;
}

function buildFeeEarnerBody(record, docs) {
  const name = formatName(record) || 'Client';
  const amount = record.PaymentAmount != null ? Number(record.PaymentAmount).toFixed(2) : '';
  const product = record.PaymentProduct || '';
  const status = record.PaymentResult === 'successful' ? 'Succeeded' : (record.PaymentResult || '');
  const method = record.PaymentMethod === 'bank' ? 'Bank transfer confirmed by client' : `Card payment ${status}`;
  const docList = buildDocList(docs || []);
  
  // Get current timestamp for diagnostics
  const timestamp = new Date().toISOString();
  const shortRef = record.InstructionRef ? `HLX-${record.InstructionRef.split('-').pop()}` : 'N/A';
  
  return `
    <div style="font-family:Segoe UI,Arial,sans-serif;color:#111">
      <h2>New Instruction Completed - Full Stack Report</h2>
      <p><strong>Status:</strong> <span style="color:#22c55e;font-weight:600;">COMPLETED</span> - Client has finished the instructions process</p>
      <p><strong>Report Generated:</strong> ${timestamp}</p>
      
      <h3>System Overview</h3>
      <table style="border-collapse:collapse;border:1px solid #ddd;margin:12px 0;width:100%">
        <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #ddd;font-weight:600">Instruction Reference</td><td style="padding:8px;border:1px solid #ddd">${record.InstructionRef} <em>(Short: ${shortRef})</em></td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Internal Status</td><td style="padding:8px;border:1px solid #ddd">${record.InternalStatus || 'N/A'}</td></tr>
        <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #ddd;font-weight:600">Stage</td><td style="padding:8px;border:1px solid #ddd">${record.Stage || record.stage || 'N/A'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Submission Date</td><td style="padding:8px;border:1px solid #ddd">${record.SubmissionDate || 'N/A'}</td></tr>
        <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #ddd;font-weight:600">Last Updated</td><td style="padding:8px;border:1px solid #ddd">${record.LastUpdated || 'N/A'}</td></tr>
      </table>
      
      <h3>Client Information</h3>
      <table style="border-collapse:collapse;border:1px solid #ddd;margin:12px 0;width:100%">
        <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #ddd;font-weight:600">Name</td><td style="padding:8px;border:1px solid #ddd">${name}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Client Type</td><td style="padding:8px;border:1px solid #ddd">${record.ClientType || 'N/A'}</td></tr>
        <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #ddd;font-weight:600">Email</td><td style="padding:8px;border:1px solid #ddd">${record.Email || 'N/A'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Phone</td><td style="padding:8px;border:1px solid #ddd">${record.Phone || 'N/A'}</td></tr>
        <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #ddd;font-weight:600">Address</td><td style="padding:8px;border:1px solid #ddd">${[record.HouseNumber, record.Street, record.City, record.County, record.Postcode].filter(Boolean).join(', ') || 'N/A'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Company</td><td style="padding:8px;border:1px solid #ddd">${record.CompanyName || 'N/A'}</td></tr>
        <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #ddd;font-weight:600">Helix Contact</td><td style="padding:8px;border:1px solid #ddd">${record.HelixContact || 'N/A'}</td></tr>
      </table>
      
      <h3>Payment Stack</h3>
      <table style="border-collapse:collapse;border:1px solid #ddd;margin:12px 0;width:100%">
        <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #ddd;font-weight:600">Amount</td><td style="padding:8px;border:1px solid #ddd">£${amount}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Product/Service</td><td style="padding:8px;border:1px solid #ddd">${product}</td></tr>
        <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #ddd;font-weight:600">Work Type</td><td style="padding:8px;border:1px solid #ddd">${record.WorkType || 'N/A'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Payment Method</td><td style="padding:8px;border:1px solid #ddd">${record.PaymentMethod || 'N/A'}</td></tr>
        <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #ddd;font-weight:600">Payment Result</td><td style="padding:8px;border:1px solid #ddd">${record.PaymentResult || 'N/A'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Payment Timestamp</td><td style="padding:8px;border:1px solid #ddd">${record.PaymentTimestamp || 'N/A'}</td></tr>
        <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #ddd;font-weight:600">Order ID</td><td style="padding:8px;border:1px solid #ddd">${record.OrderId || 'N/A'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Payment Disabled</td><td style="padding:8px;border:1px solid #ddd">${record.PaymentDisabled ? 'Yes' : 'No'}</td></tr>
      </table>
      
      <h3>Document Stack</h3>
      <ul style="line-height:1.6">${docList}</ul>
      <p><strong>Document Count:</strong> ${(docs || []).length} files uploaded</p>
      
      <h3>Identity & Verification</h3>
      <table style="border-collapse:collapse;border:1px solid #ddd;margin:12px 0;width:100%">
        <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #ddd;font-weight:600">DOB</td><td style="padding:8px;border:1px solid #ddd">${record.DOB || 'N/A'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Nationality</td><td style="padding:8px;border:1px solid #ddd">${record.Nationality || 'N/A'}</td></tr>
        <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #ddd;font-weight:600">ID Type</td><td style="padding:8px;border:1px solid #ddd">${record.IdType || 'N/A'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Passport Number</td><td style="padding:8px;border:1px solid #ddd">${record.PassportNumber || 'N/A'}</td></tr>
        <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #ddd;font-weight:600">Drivers License</td><td style="padding:8px;border:1px solid #ddd">${record.DriversLicenseNumber || 'N/A'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Consent Given</td><td style="padding:8px;border:1px solid #ddd">${record.ConsentGiven ? 'Yes' : 'No'}</td></tr>
      </table>
      
      <h3>Database Stack</h3>
      <table style="border-collapse:collapse;border:1px solid #ddd;margin:12px 0;width:100%">
        <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #ddd;font-weight:600">Client ID</td><td style="padding:8px;border:1px solid #ddd">${record.ClientId || 'N/A'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Related Client ID</td><td style="padding:8px;border:1px solid #ddd">${record.RelatedClientId || 'N/A'}</td></tr>
        <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #ddd;font-weight:600">Matter ID</td><td style="padding:8px;border:1px solid #ddd">${record.MatterId || 'N/A'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Alias ID</td><td style="padding:8px;border:1px solid #ddd">${record.AliasId || 'N/A'}</td></tr>
        <tr style="background:#f8f9fa"><td style="padding:8px;border:1px solid #ddd;font-weight:600">SHA Sign</td><td style="padding:8px;border:1px solid #ddd">${record.SHASign || 'N/A'}</td></tr>
      </table>
      
      <h3>Additional Notes</h3>
      <div style="background:#f8f9fa;padding:12px;border:1px solid #ddd;margin:12px 0;border-radius:4px;">
        <p><strong>Client Notes:</strong> ${record.Notes || 'None provided'}</p>
      </div>
      
      <h3>Next Steps</h3>
      <ul style="line-height:1.6;color:#374151">
        <li><strong>Review:</strong> All client details and uploaded documents above</li>
        <li><strong>Verify:</strong> Payment status and method are correct</li>
        <li><strong>Contact:</strong> Client using details above to proceed with matter</li>
        <li><strong>CMS:</strong> Add to case management system with reference ${shortRef}</li>
        <li><strong>Tiller:</strong> ID verification may have been submitted automatically</li>
      </ul>
      
      <div style="margin-top:20px;padding:16px;background:#e1f5fe;border-left:4px solid #0ea5e9;color:#0c4a6e;border-radius:4px;">
        <p><strong>System Status:</strong> All operations completed successfully. Instruction data captured and ready for processing.</p>
        <p><strong>Debug Info:</strong> Complete client record, payment stack, document trail, and system state available above for troubleshooting.</p>
      </div>
    </div>
  `;
}

function buildAccountsBody(record, docs) {
  const name = formatName(record) || 'Client';
  const amount = record.PaymentAmount != null ? Number(record.PaymentAmount).toFixed(2) : '';
  const ref = record.OrderId || record.InstructionRef;
  const docList = buildDocList(docs || []);
  return `
    <p>Bank transfer pending for instruction <strong>${record.InstructionRef}</strong>.</p>
    <p><strong>Client:</strong> ${name}<br/>Email: ${record.Email || 'N/A'}<br/>Phone: ${record.Phone || 'N/A'}</p>
    <p>The client indicates they have transferred £${amount} using reference ${ref}. Please monitor the account and notify the fee earner when received.</p>
    <p>Uploaded documents:</p>
    <ul>${docList}</ul>
  `;
}


async function sendClientSuccessEmail(record) {
  if (!record.Email) return;
  const body = buildClientSuccessBody(record);
  await sendMail(record.Email, 'Instruction Confirmed – Payment Received', body);
}

async function sendClientFailureEmail(record) {
  if (!record.Email) return;
  const body = buildClientFailureBody(record);
  await sendMail(record.Email, 'Complete Payment – Instruction Pending', body);
}

async function sendFeeEarnerEmail(record) {
  const to = ['lz@helix-law.com', 'cb@helix-law.com']; // Internal tech team notification
  const docs = await getDocumentsForInstruction(record.InstructionRef);
  const body = buildFeeEarnerBody(record, docs);
  const amount = record.PaymentAmount != null ? `£${Number(record.PaymentAmount).toFixed(2)}` : 'N/A';
  const service = record.PaymentProduct || 'Unknown service';
  
  // Send to multiple recipients
  for (const email of to) {
    try {
      await sendMail(email, `✅ New Instruction Complete: ${service} (${amount}) - ${record.InstructionRef}`, body);
      console.log(`✅ Fee earner email sent to ${email}`);
    } catch (err) {
      console.error(`❌ Failed to send fee earner email to ${email}:`, err);
    }
  }
}

async function sendDebugStuckClientEmail(record, reason = 'Unknown issue') {
  const to = ['lz@helix-law.com', 'cb@helix-law.com']; // Internal dev notification
  // Extract passcode from HLX-PROSPECTID-PASSCODE format
  const shortRef = record.InstructionRef ? `HLX-${record.InstructionRef.split('-').pop()}` : 'N/A';
  const name = [record.FirstName, record.LastName].filter(Boolean).join(' ') || 'Unknown';
  
  const body = `
    <div style="font-family:Arial,sans-serif;color:#111;font-size:14px">
      <p><strong>${shortRef}</strong> - ${name} (${record.Email || 'no email'})</p>
      <p><strong>Issue:</strong> ${reason}</p>
      <p><strong>Status:</strong> ${record.Stage || 'unknown'} / ${record.InternalStatus || 'unknown'}</p>
      <p><strong>Payment:</strong> ${record.PaymentMethod || 'none'} - ${record.PaymentResult || 'none'}</p>
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
    </div>
  `;
  
  // Send single email to both recipients so they can see each other
  try {
    await sendMail(to, `🚨 ${shortRef} - ${reason.split(' ')[0]}`, body);
    console.log(`🚨 Debug stuck client email sent to ${to.join(', ')}`);
  } catch (err) {
    console.error(`❌ Failed to send debug stuck client email:`, err);
  }
}

// Send bank details to client upon request from failure page
async function sendBankDetailsEmail({ Email, InstructionRef, Amount }) {
  if (!Email) return;
  const amountStr = Amount != null ? Number(Amount).toFixed(2) : '';
  // Extract just the passcode for bank reference (get last part after final hyphen)
  const bankRef = InstructionRef.split('-').pop() || InstructionRef;
  const html = `
    <p>Dear Client,</p>
    <p>As requested, here are the bank transfer details to complete your payment for instruction <strong>${bankRef}</strong>.</p>
    <table style="border-collapse:collapse; margin:16px 0; width:100%; max-width:480px;">
      <tr><td style="padding:8px; border:1px solid #e2e8f0; font-weight:600; width:40%">Account Name</td><td style="padding:8px; border:1px solid #e2e8f0;">Helix Law General Client Account</td></tr>
      <tr><td style="padding:8px; border:1px solid #e2e8f0; font-weight:600;">Bank</td><td style="padding:8px; border:1px solid #e2e8f0;">Barclays Bank, Eastbourne</td></tr>
      <tr><td style="padding:8px; border:1px solid #e2e8f0; font-weight:600;">Sort Code</td><td style="padding:8px; border:1px solid #e2e8f0;">20-27-91</td></tr>
      <tr><td style="padding:8px; border:1px solid #e2e8f0; font-weight:600;">Account Number</td><td style="padding:8px; border:1px solid #e2e8f0;">9347 2434</td></tr>
      <tr><td style="padding:8px; border:1px solid #e2e8f0; font-weight:600;">Reference</td><td style="padding:8px; border:1px solid #e2e8f0;">${bankRef}</td></tr>
      ${amountStr ? `<tr><td style="padding:8px; border:1px solid #e2e8f0; font-weight:600;">Amount (GBP)</td><td style="padding:8px; border:1px solid #e2e8f0;">£${amountStr}</td></tr>` : ''}
    </table>
    <p>Please use the reference exactly so we can match your payment. Faster Payments usually arrive within minutes.</p>
    <p>If you have already paid, you can ignore this email.</p>
  `;
  await sendMail(Email, 'Bank Transfer Details – Helix Law', html);
}

module.exports = {
  sendClientSuccessEmail,
  sendClientFailureEmail,
  sendFeeEarnerEmail,
  sendDebugStuckClientEmail,
  sendBankDetailsEmail,
  sendMail,
  deriveEmail,
  wrapSignature,
  wrapSystemSignature,
  buildClientSuccessBody,
  buildClientFailureBody,
  buildFeeEarnerBody,
  buildAccountsBody,
};