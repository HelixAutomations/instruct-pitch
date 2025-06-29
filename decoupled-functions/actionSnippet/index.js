// Use the same v3 programming model as other functions
// rather than the newer "app" style to avoid runtime errors
const { DefaultAzureCredential } = require("@azure/identity");
const { SecretClient } = require("@azure/keyvault-secrets");

const sql = require("mssql");
const { getSqlPool } = require("../sqlClient");

const keyVaultName = process.env.KEY_VAULT_NAME;
const vaultUrl = process.env.KEY_VAULT_URL || (keyVaultName ? `https://${keyVaultName}.vault.azure.net/` : null);
const credential = new DefaultAzureCredential();
const secretClient = new SecretClient(vaultUrl, credential);
let passwordPromise;

async function ensureDbPassword() {
    if (process.env.DB_PASSWORD) return process.env.DB_PASSWORD;
    if (!passwordPromise) {
        const secretName = process.env.DB_PASSWORD_SECRET || "instructionsadmin-password";
        passwordPromise = secretClient.getSecret(secretName).then(s => {
            process.env.DB_PASSWORD = s.value;
            return s.value;
        });
    }
    return passwordPromise;
}

async function actionSnippetHandler(req, context) {
    context.log("actionSnippet invoked");

    if (req.method !== "POST") {
        return { status: 405, body: "Method not allowed" };
      }

    const body = req.body;
    if (!body) {
        return { status: 400, body: "Invalid JSON" };
      }

    const { action, payload } = body || {};
    if (!action) {
        return { status: 400, body: "Missing action" };
      }

    await ensureDbPassword();
    const pool = await getSqlPool();

    switch (action) {
        case "getSimplifiedBlocks": {
            const blocksRes = await pool.request().query("SELECT * FROM SimplifiedBlocks ORDER BY BlockId");
            const blocks = blocksRes.recordset || [];
            for (const b of blocks) {
                const snips = await pool.request().input("BlockId", sql.Int, b.BlockId).query(
                    "SELECT * FROM SimplifiedBlockSnippets WHERE BlockId=@BlockId AND IsApproved=1 ORDER BY SortOrder"
                );
                b.snippets = snips.recordset || [];
            }
            return { status: 200, body: JSON.stringify(blocks), headers: { "Content-Type": "application/json" } };
        }
        case "submitSnippetEdit": {
            const q = `INSERT INTO SnippetEdits
            (SnippetId, ProposedContent, ProposedLabel, ProposedSortOrder, ProposedBlockId, IsNew, ProposedBy)
            VALUES (@SnippetId, @Content, @Label, @SortOrder, @BlockId, @IsNew, @ProposedBy)`;
            await pool
                .request()
                .input("SnippetId", sql.Int, payload.snippetId)
                .input("Content", sql.NVarChar(sql.MAX), payload.proposedContent)
                .input("Label", sql.NVarChar(100), payload.proposedLabel || null)
                .input("SortOrder", sql.Int, payload.proposedSortOrder ?? null)
                .input("BlockId", sql.Int, payload.proposedBlockId ?? null)
                .input("IsNew", sql.Bit, payload.isNew ? 1 : 0)
                .input("ProposedBy", sql.NVarChar(50), payload.proposedBy)
                .query(q);
            return { status: 200, body: JSON.stringify({ ok: true }) };    
    }

        case "approveSnippetEdit": {
            const { editId, approvedBy, reviewNotes } = payload;
            const editRes = await pool.request().input("EditId", sql.Int, editId).query("SELECT * FROM SnippetEdits WHERE EditId=@EditId");
            const edit = editRes.recordset[0];
            if (!edit) return { status: 404, body: "Edit not found" };

            await pool.request().input("SnippetId", sql.Int, edit.SnippetId).query(`
          INSERT INTO SimplifiedBlockSnippetVersions
            (SnippetId, VersionNumber, Label, Content, SortOrder, BlockId, ApprovedBy, ApprovedAt)
          SELECT SnippetId, Version, Label, Content, SortOrder, BlockId, @ApprovedBy, SYSUTCDATETIME()
          FROM SimplifiedBlockSnippets WHERE SnippetId=@SnippetId`);

            const update = `UPDATE SimplifiedBlockSnippets
          SET Content=@Content,
              Label=COALESCE(@Label, Label),
              SortOrder=COALESCE(@SortOrder, SortOrder),
              BlockId=COALESCE(@BlockId, BlockId),
              Version=Version+1,
              IsApproved=1,
              ApprovedBy=@ApprovedBy,
              ApprovedAt=SYSUTCDATETIME()
          WHERE SnippetId=@SnippetId`;
            await pool
                .request()
                .input("Content", sql.NVarChar(sql.MAX), edit.ProposedContent)
                .input("Label", sql.NVarChar(100), edit.ProposedLabel)
                .input("SortOrder", sql.Int, edit.ProposedSortOrder)
                .input("BlockId", sql.Int, edit.ProposedBlockId)
                .input("SnippetId", sql.Int, edit.SnippetId)
                .input("ApprovedBy", sql.NVarChar(50), approvedBy)
                .query(update);  

            await pool
                .request()
                .input("EditId", sql.Int, editId)
                .input("ReviewNotes", sql.NVarChar(400), reviewNotes || null)
                .input("ApprovedBy", sql.NVarChar(50), approvedBy)
                .query(
                    "UPDATE SnippetEdits SET Status='approved', ReviewNotes=@ReviewNotes, ReviewedBy=@ApprovedBy, ReviewedAt=SYSUTCDATETIME() WHERE EditId=@EditId"
                );
            return { status: 200, body: JSON.stringify({ ok: true }) };
        }
        default:
            return { status: 400, body: "Unknown action" };
    }
}

module.exports = async function (context, req) {
    const result = await actionSnippetHandler(req, context);
    context.res = result;
};