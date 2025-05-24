const express = require('express');
const multer = require('multer');
const { DefaultAzureCredential } = require('@azure/identity');
const { BlobServiceClient } = require('@azure/storage-blob');

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

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
    const { clientId, instructionId } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    if (!clientId || !instructionId) {
      return res.status(400).json({ error: 'Missing clientId or instructionId' });
    }
    const blobName = `${clientId}/${instructionId}/${req.file.originalname}`;
    const blockBlob = containerClient.getBlockBlobClient(blobName);
    await blockBlob.uploadData(req.file.buffer);
    res.json({ blobName, url: blockBlob.url });
  } catch (err) {
    console.error('❌ Upload error', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;