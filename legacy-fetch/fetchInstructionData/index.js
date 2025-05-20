const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');
const sql = require('mssql');

const vaultUrl = "https://helix-keys-v1.vault.azure.net/";
const credential = new DefaultAzureCredential();
const secretClient = new SecretClient(vaultUrl, credential);

const dbUser = 'helix-database-server';
const dbServer = 'helix-database-server.database.windows.net';
const dbName = 'helix-core-data';

module.exports = async function (context, req) {
    context.log('fetchInstructionData HTTP trigger - Key Vault + SQL demo');

    // 1. Get CID from query string
    const cid = req.query.cid;
    if (!cid) {
        context.res = { status: 400, body: { error: 'Missing cid in query' } };
        return;
    }

    try {
        // 2. Get db password from Key Vault
        const dbSecret = await secretClient.getSecret('database-password');
        const dbPassword = dbSecret.value;

        // 3. Connect to Azure SQL DB
        const pool = await sql.connect({
            user: dbUser,
            password: dbPassword,
            server: dbServer,
            database: dbName,
            options: {
                encrypt: true // Azure requires this
            }
        });

        // 4. Query the record
        const result = await pool.request()
            .input('id', sql.NVarChar, cid)
            .query('SELECT * FROM enquiries WHERE ID = @id');

        // 5. Respond
        context.res = {
            status: 200,
            body: result.recordset[0] || null
        };
        await pool.close();
    } catch (err) {
        context.log.error('Failed to fetch from SQL:', err.message);
        context.res = {
            status: 500,
            body: { error: 'Could not fetch from SQL', detail: err.message }
        };
    }
};
