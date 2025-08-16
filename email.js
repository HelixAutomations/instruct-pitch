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
    <p>Instruction reference <strong>${record.InstructionRef}</strong> has been submitted.</p>
    <p><strong>Client:</strong> ${name}<br/>Email: ${record.Email || 'N/A'}<br/>Phone: ${record.Phone || 'N/A'}</p>
    <p><strong>Payment:</strong> £${amount} for ${product} – ${method}</p>
    <p>Uploaded documents:</p>
    <ul>${docList}</ul>
    <p>Please review and contact the client.</p>
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
  await sendMail(to, `New Instruction – ${record.InstructionRef}`, body);
}

async function sendAccountsEmail(record) {
  if (record.PaymentMethod !== 'bank') return;
  const docs = await getDocumentsForInstruction(record.InstructionRef);
  const body = buildAccountsBody(record, docs);
  await sendMail(FROM_ADDRESS, `Pending Bank Transfer – ${record.InstructionRef}`, body);
}

module.exports = {
  sendClientSuccessEmail,
  sendClientFailureEmail,
  sendFeeEarnerEmail,
  sendAccountsEmail,
  deriveEmail,
  wrapSignature,
  buildClientSuccessBody,
  buildClientFailureBody,
  buildFeeEarnerBody,
  buildAccountsBody,
};