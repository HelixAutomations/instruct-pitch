const express = require('express');
const multer = require('multer');
const { DefaultAzureCredential } = require('@azure/identity');
const { BlobServiceClient } = require('@azure/storage-blob');
const sql = require('mssql');
const { getSqlPool } = require('./sqlClient');
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

    let { instructionRef } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    if (!instructionRef) {
      return res.status(400).json({ error: 'Missing instructionRef' });
    }
    
    // Verify instruction exists
    const instReq = new sql.Request();
    instReq.input('InstructionRef', sql.NVarChar, instructionRef);
    const instResult = await instReq.query('SELECT InstructionRef FROM Instructions WHERE InstructionRef = @InstructionRef');
    if (!instResult.recordset || instResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Instruction not found' });
    }

    const { originalname, size } = req.file;
    const ext = originalname.split('.').pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTS.has(ext)) {
      return res.status(400).json({ error: 'Unsupported file type' });
    }
    if (size > MAX_FILE_SIZE) {
      return res.status(400).json({ error: 'File size exceeds 10MB limit' });
    }

    // Compute document sequence per deal and build a deterministic blob name
    // Format: <DealId>-<ProspectId>-<NNN>-<originalname>
    const pool = await getSqlPool();
    // Start a SERIALIZABLE transaction to avoid race conditions when
    // computing the per-instruction document count.
    const transaction = new sql.Transaction(pool);
    try {
      await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
      const trReq = new sql.Request(transaction);
      trReq.input('InstructionRef', sql.NVarChar, instructionRef);
      // Count existing documents for this instruction
      const countRes = await trReq.query('SELECT COUNT(*) AS cnt FROM Documents WHERE InstructionRef = @InstructionRef');
      const seq = (countRes && countRes.recordset && countRes.recordset[0] && countRes.recordset[0].cnt ? Number(countRes.recordset[0].cnt) : 0) + 1;
      const seqPadded = String(seq).padStart(3, '0');

      // Simple blob naming: instructionRef/sequence-filename
      const blobName = `${instructionRef}/${seqPadded}-${req.file.originalname}`;
      console.log(`⬆️  Uploading ${blobName}`);

      const blockBlob = containerClient.getBlockBlobClient(blobName);
      // Upload while transaction is open to ensure seq uniqueness
      await blockBlob.uploadData(req.file.buffer, {
        blobHTTPHeaders: { blobContentType: req.file.mimetype }
      });

      console.log(`✅ Uploaded ${blobName}`);

      // Insert DB record and return auto-generated DocumentId
      const insertReq = new sql.Request(transaction);
      insertReq.input('InstructionRef', sql.NVarChar, instructionRef)
        .input('FileName', sql.NVarChar, req.file.originalname)
        .input('BlobUrl', sql.NVarChar, blockBlob.url)
        .input('FileSizeBytes', sql.Int, size)
        .input('UploadedAt', sql.DateTime2, new Date());
      
      const insertRes = await insertReq.query(`
        INSERT INTO Documents (InstructionRef, FileName, BlobUrl, FileSizeBytes, UploadedAt) 
        OUTPUT INSERTED.DocumentId 
        VALUES (@InstructionRef, @FileName, @BlobUrl, @FileSizeBytes, @UploadedAt)
      `);
      const insertedId = insertRes && insertRes.recordset && insertRes.recordset[0] ? insertRes.recordset[0].DocumentId : null;      await transaction.commit();

      // Send monitoring email to admin
      try {
        await sendEmail({
          to: 'lz@helix.law',
          subject: `Document uploaded: ${req.file.originalname}`,
          html: `
          <p>A document has been uploaded:</p>
          <ul>
            <li><strong>File:</strong> ${req.file.originalname}</li>
            <li><strong>Instruction Ref:</strong> ${instructionRef}</li>
            <li><strong>Size:</strong> ${(size / 1024).toFixed(1)} KB</li>
            <li><strong>Blob URL:</strong> <a href="${blockBlob.url}">${blockBlob.url}</a></li>
            <li><strong>DocumentId:</strong> ${insertedId}</li>
          </ul>
        `
        });
      } catch (emailErr) {
        console.warn('⚠️  Failed to send monitoring email:', emailErr.message);
      }

      res.json({ blobName, url: blockBlob.url, documentId: insertedId });
    } catch (txErr) {
      try { await transaction.rollback(); } catch (rErr) { /* ignore */ }
      throw txErr;
    }
  } catch (err) {
    console.error('❌ Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;
