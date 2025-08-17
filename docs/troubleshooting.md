# Troubleshooting Completion State

When visiting `/pitch/<instructionRef>` the client fetches the instruction record. The completion banner only appears when the API responds with `Stage` equal to `completed`.

In `HomePage.tsx` the stage is checked:

```
          if (stage === 'completed') {
            setInstructionCompleted(true);
            if (data.InternalStatus === 'paid') {
              const fname = rest.FirstName || '';
              const hr = new Date().getHours();
              const greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
              setCompletionGreeting(`${greet}, ${fname}.`);
            }
            setInstructionReady(true);
          }
```

The backend exposes `/api/instruction/complete` which updates the record via `markCompleted()`:

```
app.post('/api/instruction/complete', async (req, res) => {
  const { instructionRef } = req.body;
  ...
  const record = await markCompleted(instructionRef);
  ...
});
```

`markCompleted` sets `Stage='completed'` in the database:

```
async function markCompleted(ref) {
  const pool = await getSqlPool();
  const result = await pool.request()
    .input('ref', sql.NVarChar, ref)
    .query(`
      UPDATE Instructions SET Stage='completed'
      WHERE InstructionRef=@ref;
      SELECT * FROM Instructions WHERE InstructionRef=@ref;
    `);
  return result.recordset[0];
}
```

Ensure the client calls `/api/instruction/complete` once the user has uploaded any required documents and confirms the instruction. This endpoint marks the instruction as completed **and** closes the associated deal so no further payments can be taken. Without this call the server continues to return `Stage: 'in_progress'` even if payment succeeded, so the UI will not display the completed state.

## Payments temporarily disabled

Symptoms
- Payment endpoints return HTTP 503
- Clients do not receive payment-related emails

Checks
- Ensure DISABLE_PAYMENTS or PAYMENT_DISABLED is set in the backend environment
- Review logs for:
  - "🛑 /pitch/get-shasign blocked: payments disabled"
  - "🛑 /pitch/confirm-payment blocked: payments disabled"
  - "✉️  Client emails suppressed (payments disabled)"

Resolution
- This is expected while the freeze is in place. Remove/disable the flag to restore card payments and client emails.

## Development Environment Issues

For comprehensive troubleshooting of local development setup, Key Vault configuration, and git safety issues, see:
- [Development Fixes - August 15, 2025](./development-fixes-2025-08-15.md)

Common development issues:
- **Azure Functions "Key Vault not specified" errors**: Check `decoupled-functions/local.settings.json` for placeholder values
- **Documents step not visible**: Ensure using mock server (port 4000) or correct URL format with Vite
- **Git safety**: Review .gitignore updates to prevent committing sensitive files

## Legacy prefill failures

Symptoms
- Instruction page loads but no prefill data appears
- Logs show `Legacy prefill skipped: no fetchInstructionData secret`

Checks
- Confirm the Key Vault contains a secret named `fetchInstructionDataLegacy-code` (or set `FETCH_INSTRUCTION_DATA_SECRET` to a different name).
- Ensure the backend has permission to access the Key Vault specified by `KEY_VAULT_NAME`.
- Verify the legacy function URL `https://legacy-fetch-v2.azurewebsites.net/api/fetchInstructionData` is reachable from the web app.

Resolution
- Create/update the secret in Key Vault or point `FETCH_INSTRUCTION_DATA_SECRET` to the correct secret name. Deploy again so the backend loads the secret on startup.
