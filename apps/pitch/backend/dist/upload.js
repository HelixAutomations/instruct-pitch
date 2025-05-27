"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const identity_1 = require("@azure/identity");
const storage_blob_1 = require("@azure/storage-blob");
const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf'
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type'));
        }
    }
});
const router = express_1.default.Router();
const account = process.env.AZURE_STORAGE_ACCOUNT;
const container = process.env.UPLOAD_CONTAINER;
if (!account || !container) {
    throw new Error('AZURE_STORAGE_ACCOUNT or UPLOAD_CONTAINER not set');
}
const credential = new identity_1.DefaultAzureCredential();
const serviceClient = new storage_blob_1.BlobServiceClient(`https://${account}.blob.core.windows.net`, credential);
const containerClient = serviceClient.getContainerClient(container);
router.post('/upload', (req, res) => {
    upload.single('file')(req, res, async (err) => {
        if (err) {
            console.error('❌ Upload validation error:', err);
            return res.status(400).json({ error: err.message });
        }
        try {
            const { clientId, instructionId } = req.body;
            const file = req.file;
            if (!file)
                return res.status(400).json({ error: 'No file provided' });
            if (!clientId || !instructionId) {
                return res.status(400).json({ error: 'Missing clientId or instructionId' });
            }
            const blobName = `${clientId}/${instructionId}/${file.originalname}`;
            console.log(`⬆️  Uploading ${blobName}`);
            const blockBlob = containerClient.getBlockBlobClient(blobName);
            await blockBlob.uploadData(file.buffer);
            console.log(`✅ Uploaded ${blobName}`);
            res.json({ blobName, url: blockBlob.url });
        }
        catch (err) {
            console.error('❌ Upload error:', err);
            res.status(500).json({ error: 'Upload failed' });
        }
    });
});
exports.default = router;
