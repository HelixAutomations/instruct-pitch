const express = require('express');
const multer = require('multer');
const { generateInstructionRef } = require('./dist/generateInstructionRef');
const { DefaultAzureCredential } = require('@azure/identity');
const { BlobServiceClient } = require('@azure/storage-blob');
const sql = require('mssql');
const { getSqlPool } = require('./sqlClient');
const { getDealByPasscode } = require('./instructionDb');

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
const credential = new DefaultAzureCredential();
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
      instructionRef = generateInstructionRef(clientId);
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

    const pool = await getSqlPool();
    await pool.request()
        .input('InstructionRef', sql.NVarChar, instructionRef)
        .input('FileName', sql.NVarChar, req.file.originalname)
        .input('BlobUrl', sql.NVarChar, blockBlob.url)
        .query('INSERT INTO Documents (InstructionRef, FileName, BlobUrl) VALUES (@InstructionRef, @FileName, @BlobUrl)');

    res.json({ blobName, url: blockBlob.url });
  } catch (err) {
    console.error('❌ Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;
