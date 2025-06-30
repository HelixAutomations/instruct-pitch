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
    context.log('Database password ensured');
    const pool = await getSqlPool();
    context.log('SQL pool acquired');
    // Use the "pitchbuilder" schema by default. This allows running
    // locally without setting DB_SCHEMA explicitly while still
    // working with the shared pitchbuilder database.
    const schema = process.env.DB_SCHEMA || 'pitchbuilder';
    context.log(`Processing action: ${action}`);

    switch (action) {
        case "getSnippetBlocks": {
            context.log('Fetching snippet blocks');
            const blocksRes = await pool.request().query(`SELECT * FROM ${schema}.DefaultBlocks ORDER BY BlockId`);
            const blocks = blocksRes.recordset || [];
            for (const b of blocks) {
                const snips = await pool.request()
                    .input("BlockId", sql.Int, b.BlockId)
                    .query(`SELECT * FROM ${schema}.DefaultBlockSnippets WHERE BlockId=@BlockId AND IsApproved=1 ORDER BY SortOrder`);
                b.snippets = snips.recordset || [];

                const phSnips = await pool.request()
                    .input("BlockId", sql.Int, b.BlockId)
                    .query(`SELECT * FROM ${schema}.PlaceholderSnippets WHERE BlockId=@BlockId AND IsApproved=1 ORDER BY Placeholder, SortOrder`);
                b.placeholderSnippets = phSnips.recordset || [];
            }
            context.log(`Fetched ${blocks.length} blocks`);
            return { status: 200, body: JSON.stringify(blocks), headers: { "Content-Type": "application/json" } };
        }
        case "submitSnippetEdit": {
            context.log('Submitting snippet edit');
            let snippetId = payload.snippetId ?? payload.SnippetId;
            const content = payload.proposedContent ?? payload.ProposedContent;
            const label = payload.proposedLabel ?? payload.ProposedLabel;
            const sortOrder = payload.proposedSortOrder ?? payload.ProposedSortOrder;
            const blockId = payload.proposedBlockId ?? payload.ProposedBlockId;
            const isNew = payload.isNew ?? payload.IsNew;
            const proposedBy = payload.proposedBy ?? payload.ProposedBy;

            if (isNew && (snippetId === undefined || snippetId === null)) {
                const insertSnippet = `INSERT INTO ${schema}.DefaultBlockSnippets
                    (BlockId, Label, Content, SortOrder, CreatedBy)
                    OUTPUT INSERTED.SnippetId
                    VALUES (@BlockId, @Label, @Content, @SortOrder, @CreatedBy)`;
                const res = await pool
                    .request()
                    .input("BlockId", sql.Int, blockId)
                    .input("Label", sql.NVarChar(100), label || "")
                    .input("Content", sql.NVarChar(sql.MAX), content)
                    .input("SortOrder", sql.Int, sortOrder ?? 0)
                    .input("CreatedBy", sql.NVarChar(50), proposedBy)
                    .query(insertSnippet);
                snippetId = res.recordset[0].SnippetId;
                context.log(`New snippet created with id ${snippetId}`);
            }
            const q = `INSERT INTO ${schema}.DefaultSnippetEdits
            (SnippetId, ProposedContent, ProposedLabel, ProposedSortOrder, ProposedBlockId, IsNew, ProposedBy)
            VALUES (@SnippetId, @Content, @Label, @SortOrder, @BlockId, @IsNew, @ProposedBy)`;
            await pool
                .request()
                .input("SnippetId", sql.Int, snippetId)
                .input("Content", sql.NVarChar(sql.MAX), content)
                .input("Label", sql.NVarChar(100), label || null)
                .input("SortOrder", sql.Int, sortOrder ?? null)
                .input("BlockId", sql.Int, blockId ?? null)
                .input("IsNew", sql.Bit, isNew ? 1 : 0)
                .input("ProposedBy", sql.NVarChar(50), proposedBy)
                .query(q);
            context.log('Snippet edit inserted');
            return { status: 200, body: JSON.stringify({ ok: true }) };
        }

        case "submitPlaceholderSnippetEdit": {
            context.log('Submitting placeholder snippet edit');
            let psId = payload.placeholderSnippetId ?? payload.PlaceholderSnippetId;
            const content = payload.proposedContent ?? payload.ProposedContent;
            const label = payload.proposedLabel ?? payload.ProposedLabel;
            const sortOrder = payload.proposedSortOrder ?? payload.ProposedSortOrder;
            const blockId = payload.proposedBlockId ?? payload.ProposedBlockId;
            const placeholder = payload.placeholder ?? payload.Placeholder ?? payload.proposedPlaceholder ?? payload.ProposedPlaceholder;
            const isNew = payload.isNew ?? payload.IsNew;
            const proposedBy = payload.proposedBy ?? payload.ProposedBy;

            if (isNew && (psId === undefined || psId === null)) {
                const insert = `INSERT INTO ${schema}.PlaceholderSnippets
                    (BlockId, Placeholder, Label, Content, SortOrder, CreatedBy)
                    OUTPUT INSERTED.PlaceholderSnippetId
                    VALUES (@BlockId, @Placeholder, @Label, @Content, @SortOrder, @CreatedBy)`;
                const res = await pool
                    .request()
                    .input("BlockId", sql.Int, blockId)
                    .input("Placeholder", sql.NVarChar(100), placeholder)
                    .input("Label", sql.NVarChar(100), label || "")
                    .input("Content", sql.NVarChar(sql.MAX), content)
                    .input("SortOrder", sql.Int, sortOrder ?? 0)
                    .input("CreatedBy", sql.NVarChar(50), proposedBy)
                    .query(insert);
                psId = res.recordset[0].PlaceholderSnippetId;
                context.log(`New placeholder snippet created with id ${psId}`);
            }
            const q = `INSERT INTO ${schema}.PlaceholderSnippetEdits
                (PlaceholderSnippetId, ProposedContent, ProposedLabel, ProposedSortOrder, ProposedBlockId, ProposedPlaceholder, IsNew, ProposedBy)
                VALUES (@Id, @Content, @Label, @SortOrder, @BlockId, @Placeholder, @IsNew, @ProposedBy)`;
            await pool
                .request()
                .input("Id", sql.Int, psId)
                .input("Content", sql.NVarChar(sql.MAX), content)
                .input("Label", sql.NVarChar(100), label || null)
                .input("SortOrder", sql.Int, sortOrder ?? null)
                .input("BlockId", sql.Int, blockId ?? null)
                .input("Placeholder", sql.NVarChar(100), placeholder || null)
                .input("IsNew", sql.Bit, isNew ? 1 : 0)
                .input("ProposedBy", sql.NVarChar(50), proposedBy)
                .query(q);
            context.log('Placeholder snippet edit inserted');
            return { status: 200, body: JSON.stringify({ ok: true }) };
        }

        case "approveSnippetEdit": {
            const editId = payload.editId ?? payload.EditId;
            const approvedBy = payload.approvedBy ?? payload.ApprovedBy;
            const reviewNotes = payload.reviewNotes ?? payload.ReviewNotes;
            context.log(`Approving snippet edit ${editId}`);
            const editRes = await pool
                .request()
                .input("EditId", sql.Int, editId)
                .query(`SELECT * FROM ${schema}.DefaultSnippetEdits WHERE EditId=@EditId`);
            const edit = editRes.recordset[0];
            if (!edit) return { status: 404, body: "Edit not found" };

            await pool
                .request()
                .input("SnippetId", sql.Int, edit.SnippetId)
                .input("ApprovedBy", sql.NVarChar(50), approvedBy)
                .query(`
          INSERT INTO ${schema}.DefaultBlockSnippetVersions
            (SnippetId, VersionNumber, Label, Content, SortOrder, BlockId, ApprovedBy, ApprovedAt)
          SELECT SnippetId, Version, Label, Content, SortOrder, BlockId, @ApprovedBy, SYSUTCDATETIME()
          FROM ${schema}.DefaultBlockSnippets WHERE SnippetId=@SnippetId`);

            const update = `UPDATE ${schema}.DefaultBlockSnippets
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
                    `UPDATE ${schema}.DefaultSnippetEdits SET Status='approved', ReviewNotes=@ReviewNotes, ReviewedBy=@ApprovedBy, ReviewedAt=SYSUTCDATETIME() WHERE EditId=@EditId`
                );
            context.log('Snippet edit approved');
            return { status: 200, body: JSON.stringify({ ok: true }) };
        }
        case "approvePlaceholderSnippetEdit": {
            const editId = payload.editId ?? payload.EditId;
            const approvedBy = payload.approvedBy ?? payload.ApprovedBy;
            const reviewNotes = payload.reviewNotes ?? payload.ReviewNotes;
            context.log(`Approving placeholder snippet edit ${editId}`);
            const editRes = await pool
                .request()
                .input("EditId", sql.Int, editId)
                .query(`SELECT * FROM ${schema}.PlaceholderSnippetEdits WHERE EditId=@EditId`);
            const edit = editRes.recordset[0];
            if (!edit) return { status: 404, body: "Edit not found" };

            await pool
                .request()
                .input("Id", sql.Int, edit.PlaceholderSnippetId)
                .input("ApprovedBy", sql.NVarChar(50), approvedBy)
                .query(`
          INSERT INTO ${schema}.PlaceholderSnippetVersions
            (PlaceholderSnippetId, VersionNumber, Label, Content, SortOrder, BlockId, Placeholder, ApprovedBy, ApprovedAt)
          SELECT PlaceholderSnippetId, Version, Label, Content, SortOrder, BlockId, Placeholder, @ApprovedBy, SYSUTCDATETIME()
          FROM ${schema}.PlaceholderSnippets WHERE PlaceholderSnippetId=@Id`);

            const update = `UPDATE ${schema}.PlaceholderSnippets
          SET Content=@Content,
              Label=COALESCE(@Label, Label),
              SortOrder=COALESCE(@SortOrder, SortOrder),
              BlockId=COALESCE(@BlockId, BlockId),
              Placeholder=COALESCE(@Placeholder, Placeholder),
              Version=Version+1,
              IsApproved=1,
              ApprovedBy=@ApprovedBy,
              ApprovedAt=SYSUTCDATETIME()
          WHERE PlaceholderSnippetId=@Id`;
            await pool
                .request()
                .input("Content", sql.NVarChar(sql.MAX), edit.ProposedContent)
                .input("Label", sql.NVarChar(100), edit.ProposedLabel)
                .input("SortOrder", sql.Int, edit.ProposedSortOrder)
                .input("BlockId", sql.Int, edit.ProposedBlockId)
                .input("Placeholder", sql.NVarChar(100), edit.ProposedPlaceholder)
                .input("Id", sql.Int, edit.PlaceholderSnippetId)
                .input("ApprovedBy", sql.NVarChar(50), approvedBy)
                .query(update);

            await pool
                .request()
                .input("EditId", sql.Int, editId)
                .input("ReviewNotes", sql.NVarChar(400), reviewNotes || null)
                .input("ApprovedBy", sql.NVarChar(50), approvedBy)
                .query(
                    `UPDATE ${schema}.PlaceholderSnippetEdits SET Status='approved', ReviewNotes=@ReviewNotes, ReviewedBy=@ApprovedBy, ReviewedAt=SYSUTCDATETIME() WHERE EditId=@EditId`
                );
            context.log('Placeholder snippet edit approved');
            return { status: 200, body: JSON.stringify({ ok: true }) };
        }
        case "deleteSnippetEdit": {
            const editId = payload.editId ?? payload.EditId;
            context.log(`Deleting snippet edit ${editId}`);
            await pool
                .request()
                .input("EditId", sql.Int, editId)
                .query(`DELETE FROM ${schema}.DefaultSnippetEdits WHERE EditId=@EditId`);
            context.log('Snippet edit deleted');
            return { status: 200, body: JSON.stringify({ ok: true }) };
        }

        case "deletePlaceholderSnippetEdit": {
            const editId = payload.editId ?? payload.EditId;
            context.log(`Deleting placeholder snippet edit ${editId}`);
            await pool
                .request()
                .input("EditId", sql.Int, editId)
                .query(`DELETE FROM ${schema}.PlaceholderSnippetEdits WHERE EditId=@EditId`);
            context.log('Placeholder snippet edit deleted');
            return { status: 200, body: JSON.stringify({ ok: true }) };
        }
        default:
            context.log(`Unknown action: ${action}`);
            return { status: 400, body: "Unknown action" };
    }
}

module.exports = async function (context, req) {
    try {
        const result = await actionSnippetHandler(req, context);
        context.res = result;
    } catch (err) {
        context.log.error('actionSnippet handler error:', err);
        context.res = { status: 500, body: 'Internal server error' };
    }
};