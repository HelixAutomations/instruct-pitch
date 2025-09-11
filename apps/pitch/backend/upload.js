const express = require('express');
const multer = require('multer');
let DefaultAzureCredential;
try {
  ({ DefaultAzureCredential } = require('@azure/identity'));
} catch (err) {
  console.warn('⚠️  @azure/identity not available:', err.message);
}
const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob');
const sql = require('mssql');
const { getSqlPool } = require('./sqlClient');
const { sendEmail } = require('./email');

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTS = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'txt', 'zip', 'rar', 'jpg', 'jpeg', 'png', 'mp3', 'mp4',
  'msg', 'eml',
]);

const account = process.env.AZURE_STORAGE_ACCOUNT;
const container = process.env.UPLOAD_CONTAINER;
if (!account || !container) {
  console.warn('⚠️  AZURE_STORAGE_ACCOUNT or UPLOAD_CONTAINER not set');
}

const storageKey = process.env.AZURE_STORAGE_KEY;
const credential = storageKey
  ? new StorageSharedKeyCredential(account, storageKey)
  : DefaultAzureCredential
    ? new DefaultAzureCredential()
    : null;
const serviceClient = credential
  ? new BlobServiceClient(`https://${account}.blob.core.windows.net`, credential)
  : null;
const containerClient = serviceClient ? serviceClient.getContainerClient(container) : null;

// Health check endpoint to test storage configuration
router.get('/upload/health', async (req, res) => {
  try {
    const config = {
      account: account || 'NOT_SET',
      container: container || 'NOT_SET',
      hasCredential: !!credential,
      credentialType: credential?.constructor?.name || 'none',
      hasServiceClient: !!serviceClient,
      hasContainerClient: !!containerClient
    };

    if (!containerClient) {
      return res.json({ 
        status: 'unhealthy', 
        reason: 'Storage client not initialized',
        config 
      });
    }

    // Test if container exists and is accessible
    const exists = await containerClient.exists();
    res.json({ 
      status: exists ? 'healthy' : 'container-missing', 
      config,
      containerExists: exists
    });
  } catch (err) {
    res.json({ 
      status: 'error', 
      error: err.message,
      code: err.code,
      config: {
        account: account || 'NOT_SET',
        container: container || 'NOT_SET',
        hasCredential: !!credential,
        credentialType: credential?.constructor?.name || 'none'
      }
    });
  }
});

router.post('/upload', upload.single('file'), async (req, res) => {
  const started = Date.now();
  const marks = [];
  const mark = (label) => {
    const now = Date.now();
    const delta = now - started;
    marks.push({ label, t: delta });
    console.log(`⏱  upload:${label} +${delta}ms`);
  };

  try {
    mark('route-entry');
    if (!account || !container) {
      throw new Error('Missing storage account or container');
    }
    if (!containerClient) {
      return res.status(503).json({ error: 'Storage client not initialized' });
    }

    // Multer has parsed the file at this point
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    mark('file-received');

    let { instructionRef, debugMode } = req.body;
    if (!instructionRef) {
      return res.status(400).json({ error: 'Missing instructionRef' });
    }

    // Optional fast-path for debugging (no DB / blob). Pass debugMode=skip to isolate client issues.
    if (debugMode === 'skip') {
      mark('debug-skip-before-response');
      return res.json({
        debug: true,
        skipped: true,
        originalName: req.file.originalname,
        size: req.file.size,
        timings: marks
      });
    }

    // Verify instruction exists
    const instReq = new sql.Request();
    instReq.input('InstructionRef', sql.NVarChar, instructionRef);
    const instResult = await instReq.query('SELECT InstructionRef FROM Instructions WHERE InstructionRef = @InstructionRef');
    mark('instruction-checked');
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
    mark('validation-complete');

    const pool = await getSqlPool();
    mark('pool-ready');
    const transaction = new sql.Transaction(pool);
    try {
      await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
      mark('tx-begin');
      const trReq = new sql.Request(transaction);
      trReq.input('InstructionRef', sql.NVarChar, instructionRef);
      const countRes = await trReq.query('SELECT COUNT(*) AS cnt FROM Documents WHERE InstructionRef = @InstructionRef');
      mark('doc-counted');
      const seq = (countRes && countRes.recordset && countRes.recordset[0] && countRes.recordset[0].cnt ? Number(countRes.recordset[0].cnt) : 0) + 1;
      const seqPadded = String(seq).padStart(3, '0');

      const blobName = `${instructionRef}/${seqPadded}-${req.file.originalname}`;
      console.log(`⬆️  Uploading ${blobName}`);
      mark('blob-prepare');
      const blockBlob = containerClient.getBlockBlobClient(blobName);

      try {
        console.log(`🔧 Storage account: ${account}, container: ${container}`);
        console.log(`🔧 Credential type: ${credential?.constructor?.name || 'none'}`);
        console.log(`🔧 File size: ${req.file.buffer.length} bytes, mimetype: ${req.file.mimetype}`);
        
        await blockBlob.uploadData(req.file.buffer, {
          blobHTTPHeaders: { blobContentType: req.file.mimetype }
        });
        mark('blob-uploaded');
        console.log(`✅ Uploaded ${blobName}`);
      } catch (blobErr) {
        mark('blob-failed');
        console.error(`❌ Blob upload failed:`, {
          error: blobErr.message,
          code: blobErr.code,
          statusCode: blobErr.statusCode,
          details: blobErr.details,
          blobName,
          account,
          container
        });
        throw new Error(`Blob upload failed: ${blobErr.message}`);
      }

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
      mark('db-inserted');
      const insertedId = insertRes && insertRes.recordset && insertRes.recordset[0] ? insertRes.recordset[0].DocumentId : null;
      await transaction.commit();
      mark('tx-commit');

      // Background email (do not block response). Fire and log.
      (async () => {
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
              </ul>`
          });
          console.log('📧 monitoring-email-sent');
        } catch (emailErr) {
          console.warn('⚠️  monitoring-email-failed:', emailErr.message);
        }
      })();

      mark('response-sent');
      res.json({ blobName, url: blockBlob.url, documentId: insertedId, timings: marks });
    } catch (txErr) {
      try { await transaction.rollback(); mark('tx-rollback'); } catch (rErr) { console.warn('⚠️  rollback-failed', rErr.message); }
      throw txErr;
    }
  } catch (err) {
    mark('error');
    console.error('❌ Upload error:', err);
    res.status(500).json({ error: 'Upload failed', timings: marks });
  }
});

module.exports = router;
