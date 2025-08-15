const express = require('express');
const multer = require('multer');
const { generateInstructionRef } = require('./dist/generateInstructionRef');
const { DefaultAzureCredential } = require('@azure/identity');
const { BlobServiceClient } = require('@azure/storage-blob');
const sql = require('mssql');
const { getSqlPool } = require('./sqlClient');
const { getDealByPasscode } = require('./instructionDb');
const { sendEmail } = require('./email');

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTS = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'txt', 'zip', 'rar', 'jpg', 'jpeg', 'png', 'mp3', 'mp4',
]);

const account = process.env.AZURE_STORAGE_ACCOUNT;
const container = process.env.UPLOAD_CONTAINER;
if (!account || !container) {
  console.warn('⚠️  AZURE_STORAGE_ACCOUNT or UPLOAD_CONTAINER not set');
}

const storageKey = process.env.AZURE_STORAGE_KEY;
const { StorageSharedKeyCredential } = require('@azure/storage-blob');
const credential = storageKey 
  ? new StorageSharedKeyCredential(account, storageKey)
  : new DefaultAzureCredential();
const serviceClient = new BlobServiceClient(
  `https://${account}.blob.core.windows.net`,
  credential
);
const containerClient = serviceClient.getContainerClient(container);

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!account || !container) {
      throw new Error('Missing storage account or container');
    }

    let { clientId, passcode, instructionRef } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    if (!clientId || !passcode) {
      return res.status(400).json({ error: 'Missing clientId or passcode' });
    }
    try {
      const deal = await getDealByPasscode(String(passcode), Number(clientId));
      if (!deal) {
        return res.status(403).json({ error: 'Invalid passcode' });
      }
    } catch (err) {
      console.error('Deal lookup failed:', err);
      return res.status(500).json({ error: 'Verification failed' });
    }
    // If not provided, generate one
    if (!instructionRef) {
      instructionRef = generateInstructionRef(clientId, passcode);
    }

    const { originalname, size } = req.file;
    const ext = originalname.split('.').pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTS.has(ext)) {
      return res.status(400).json({ error: 'Unsupported file type' });
    }
    if (size > MAX_FILE_SIZE) {
      return res.status(400).json({ error: 'File size exceeds 10MB limit' });
    }

    const blobName = `${clientId}/${instructionRef}/${req.file.originalname}`;
    console.log(`⬆️  Uploading ${blobName}`);

    const blockBlob = containerClient.getBlockBlobClient(blobName);
    await blockBlob.uploadData(req.file.buffer);

    console.log(`✅ Uploaded ${blobName}`);

    // Generate explicit DocumentId since the database column is not an identity column
    const { randomUUID } = require('crypto');
    const documentId = randomUUID();

    const pool = await getSqlPool();
    await pool.request()
        .input('DocumentId', sql.UniqueIdentifier, documentId)
        .input('InstructionRef', sql.NVarChar, instructionRef)
        .input('FileName', sql.NVarChar, req.file.originalname)
        .input('BlobUrl', sql.NVarChar, blockBlob.url)
        .query('INSERT INTO Documents (DocumentId, InstructionRef, FileName, BlobUrl) VALUES (@DocumentId, @InstructionRef, @FileName, @BlobUrl)');

    // Send monitoring email to admin
    try {
      await sendEmail({
        to: 'lz@helix.law',
        subject: `Document uploaded: ${req.file.originalname}`,
        html: `
          <p>A document has been uploaded:</p>
          <ul>
            <li><strong>File:</strong> ${req.file.originalname}</li>
            <li><strong>Client ID:</strong> ${clientId}</li>
            <li><strong>Instruction Ref:</strong> ${instructionRef}</li>
            <li><strong>Size:</strong> ${(size / 1024).toFixed(1)} KB</li>
            <li><strong>Blob URL:</strong> <a href="${blockBlob.url}">${blockBlob.url}</a></li>
          </ul>
        `
      });
    } catch (emailErr) {
      console.warn('⚠️  Failed to send monitoring email:', emailErr.message);
    }

    res.json({ blobName, url: blockBlob.url });
  } catch (err) {
    console.error('❌ Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;
