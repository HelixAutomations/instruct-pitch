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
  const pool = await getSqlPool();
  const result = await pool.request()
    .input('ref', sql.NVarChar, ref)
    .query('SELECT FileName, BlobUrl FROM Documents WHERE InstructionRef=@ref');
  return result.recordset || [];
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
        <img src="https://helix-law.co.uk/wp-content/uploads/2025/01/50px-logo.png" alt="Helix Law Logo" style="height:50px; display:block; margin:15px 0;" />
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

async function getGraphCredentials() {
  if (!cachedClientId || !cachedClientSecret) {
    const [id, secret] = await Promise.all([
      secretClient.getSecret(clientIdSecret),
      secretClient.getSecret(clientSecretSecret),
    ]);
    cachedClientId = id.value;
    cachedClientSecret = secret.value;
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
  const payload = {
    message: {
      subject,
      body: { contentType: "HTML", content: html },
      toRecipients: [{ emailAddress: { address: to } }],
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
  const html = wrapSignature(bodyHtml);
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
  const name = formatName(record);
  const greeting = name ? `Dear ${name},` : 'Dear client,';
  const amount = record.PaymentAmount != null ? Number(record.PaymentAmount).toFixed(2) : '';
  const product = record.PaymentProduct || 'your matter';
  return `
    <p>${greeting}</p>
    <p>We confirm receipt of your instruction <strong>${record.InstructionRef}</strong> and payment of £${amount} for ${product}.</p>
    <p>We will be in touch shortly to confirm the next steps.</p>
  `;
}

function buildClientFailureBody(record) {
  const name = formatName(record);
  const greeting = name ? `Dear ${name},` : 'Dear client,';
  const amount = record.PaymentAmount != null ? Number(record.PaymentAmount).toFixed(2) : '';
  const product = record.PaymentProduct || 'your matter';
  return `
    <p>${greeting}</p>
    <p>We received your instruction <strong>${record.InstructionRef}</strong> but your payment of £${amount} for ${product} was unsuccessful.</p>
    <p>Your documents have been saved. We will contact you to arrange payment and discuss how to proceed.</p>
  `;
}

function buildFeeEarnerBody(record, docs) {
  const name = formatName(record) || 'Client';
  const amount = record.PaymentAmount != null ? Number(record.PaymentAmount).toFixed(2) : '';
  const product = record.PaymentProduct || '';
  const status = record.PaymentResult === 'successful' ? 'Succeeded' : (record.PaymentResult || '');
  const method = record.PaymentMethod === 'bank' ? 'Bank transfer confirmed by client' : `Card payment ${status}`;
  const docList = buildDocList(docs || []);
  
  return `
    <div style="font-family:Segoe UI,Arial,sans-serif;color:#111">
      <h2>✅ New Instruction Completed</h2>
      <p><strong>Status:</strong> <span style="color:#22c55e;font-weight:600;">COMPLETED</span> - Client has finished the instructions process</p>
      
      <h3>Instruction Details</h3>
      <table style="border-collapse:collapse;border:1px solid #ddd;margin:12px 0">
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Instruction Reference</td><td style="padding:8px;border:1px solid #ddd">${record.InstructionRef}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Client</td><td style="padding:8px;border:1px solid #ddd">${name}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Email</td><td style="padding:8px;border:1px solid #ddd">${record.Email || 'N/A'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Phone</td><td style="padding:8px;border:1px solid #ddd">${record.Phone || 'N/A'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Payment</td><td style="padding:8px;border:1px solid #ddd">£${amount} for ${product}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Payment Method</td><td style="padding:8px;border:1px solid #ddd">${method}</td></tr>
      </table>
      
      <h3>Uploaded Documents</h3>
      <ul style="line-height:1.6">${docList}</ul>
      
      <h3>Next Steps</h3>
      <ul style="line-height:1.6;color:#374151">
        <li>Review client details and uploaded documents</li>
        <li>Contact the client to proceed with the matter</li>
        <li>Add to your case management system as needed</li>
      </ul>
      
      <p style="margin-top:16px;padding:12px;background:#f0f9ff;border-left:4px solid #0ea5e9;color:#0c4a6e">
        <strong>Action Required:</strong> Please review and contact the client to proceed with their instruction.
      </p>
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
  await sendMail(record.Email, 'Instruction Received – Thank You', body);
}

async function sendClientFailureEmail(record) {
  if (!record.Email) return;
  const body = buildClientFailureBody(record);
  await sendMail(record.Email, 'Payment Issue – Instruction Received', body);
}

async function sendFeeEarnerEmail(record) {
  const to = deriveEmail(record.HelixContact);
  const docs = await getDocumentsForInstruction(record.InstructionRef);
  const body = buildFeeEarnerBody(record, docs);
  const amount = record.PaymentAmount != null ? `£${Number(record.PaymentAmount).toFixed(2)}` : 'N/A';
  const service = record.PaymentProduct || 'Unknown service';
  await sendMail(to, `✅ New Instruction Complete: ${service} (${amount}) - ${record.InstructionRef}`, body);
}

async function sendAccountsEmail(record) {
  if (record.PaymentMethod !== 'bank') return;
  const docs = await getDocumentsForInstruction(record.InstructionRef);
  const body = buildAccountsBody(record, docs);
  await sendMail(FROM_ADDRESS, `Pending Bank Transfer – ${record.InstructionRef}`, body);
}

// Send bank details to client upon request from failure page
async function sendBankDetailsEmail({ Email, InstructionRef, Amount }) {
  if (!Email) return;
  const amountStr = Amount != null ? Number(Amount).toFixed(2) : '';
  const html = `
    <p>Dear Client,</p>
    <p>As requested, here are the bank transfer details to complete your payment for instruction <strong>${InstructionRef}</strong>.</p>
    <table style="border-collapse:collapse; margin:16px 0; width:100%; max-width:480px;">
      <tr><td style="padding:8px; border:1px solid #e2e8f0; font-weight:600; width:40%">Account Name</td><td style="padding:8px; border:1px solid #e2e8f0;">Helix Law General Client Account</td></tr>
      <tr><td style="padding:8px; border:1px solid #e2e8f0; font-weight:600;">Bank</td><td style="padding:8px; border:1px solid #e2e8f0;">Barclays Bank, Eastbourne</td></tr>
      <tr><td style="padding:8px; border:1px solid #e2e8f0; font-weight:600;">Sort Code</td><td style="padding:8px; border:1px solid #e2e8f0;">20-27-91</td></tr>
      <tr><td style="padding:8px; border:1px solid #e2e8f0; font-weight:600;">Account Number</td><td style="padding:8px; border:1px solid #e2e8f0;">9347 2434</td></tr>
      <tr><td style="padding:8px; border:1px solid #e2e8f0; font-weight:600;">Reference</td><td style="padding:8px; border:1px solid #e2e8f0;">HLX-${InstructionRef}</td></tr>
      ${amountStr ? `<tr><td style="padding:8px; border:1px solid #e2e8f0; font-weight:600;">Amount (GBP)</td><td style="padding:8px; border:1px solid #e2e8f0;">£${amountStr}</td></tr>` : ''}
    </table>
    <p>Please use the reference exactly so we can match your payment. Faster Payments usually arrive within minutes.</p>
    <p>If you have already paid, you can ignore this email.</p>
  `;
  await sendMail(Email, 'Bank Transfer Details – Helix Law', html);
}

// Send admin monitoring email when client accesses instructions app
async function sendInstructionsAccessedEmail(dealData, instructionRef) {
  const to = 'lz@helix-law.com';
  const feeEarnerEmail = deriveEmail(dealData.PitchedBy);
  
  const formatCurrency = (amount) => {
    if (!amount) return 'N/A';
    return `£${Number(amount).toFixed(2)}`;
  };

  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;color:#111">
      <h2>🔄 Client Accessing Instructions App</h2>
      <p><strong>Status:</strong> <span style="color:#3b82f6;font-weight:600;">IN PROGRESS</span> - Client has loaded instructions app with deal data</p>
      
      <h3>Deal Information</h3>
      <table style="border-collapse:collapse;border:1px solid #ddd;margin:12px 0">
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Instruction Ref</td><td style="padding:8px;border:1px solid #ddd">${instructionRef || 'N/A'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Deal ID</td><td style="padding:8px;border:1px solid #ddd">${dealData.DealId || 'N/A'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Service</td><td style="padding:8px;border:1px solid #ddd">${dealData.ServiceDescription || 'N/A'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Amount</td><td style="padding:8px;border:1px solid #ddd">${formatCurrency(dealData.Amount)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Area of Work</td><td style="padding:8px;border:1px solid #ddd">${dealData.AreaOfWork || 'N/A'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Pitched By</td><td style="padding:8px;border:1px solid #ddd">${dealData.PitchedBy || 'N/A'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Prospect ID</td><td style="padding:8px;border:1px solid #ddd">${dealData.ProspectId || 'N/A'}</td></tr>
      </table>
      
      <h3>Next Steps</h3>
      <ul style="line-height:1.6">
        <li>Client will complete identity verification</li>
        <li>Payment processing will begin</li>
        <li>Documents will be uploaded</li>
        <li>Fee earner will receive completion notification</li>
      </ul>
      
      <p style="margin-top:16px;color:#666;font-size:12px">
        📧 Delivered to: lz@helix-law.com${feeEarnerEmail ? ` | CC: ${feeEarnerEmail}` : ''} — this message is for monitoring only.
      </p>
    </div>
  `;

  try {
    await sendMail(to, `🔄 Instructions Started: ${dealData.ServiceDescription || 'Unknown'} (${formatCurrency(dealData.Amount)})`, html);
    
    // Also CC the fee earner if we have their email
    if (feeEarnerEmail && feeEarnerEmail !== to) {
      await sendMail(feeEarnerEmail, `Client Started Instructions: ${dealData.ServiceDescription || 'Unknown'} (${formatCurrency(dealData.Amount)})`, html);
    }
  } catch (error) {
    console.error('Failed to send instructions accessed email:', error);
  }
}

module.exports = {
  sendClientSuccessEmail,
  sendClientFailureEmail,
  sendFeeEarnerEmail,
  sendAccountsEmail,
  sendBankDetailsEmail,
  sendInstructionsAccessedEmail,
  sendMail,
  deriveEmail,
  wrapSignature,
  buildClientSuccessBody,
  buildClientFailureBody,
  buildFeeEarnerBody,
  buildAccountsBody,
};