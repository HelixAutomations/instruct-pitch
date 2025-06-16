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

Ensure the client calls `/api/instruction/complete` after a successful payment or manual workflow step. Without this call the server continues to return `Stage: 'in_progress'` even if `InternalStatus` is `paid`, so the UI will not display the completed state.
