import '../data/keys.js';
import express from 'express';
import { aggregateSignatures } from '../backend/aggregator.js';

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// In-memory logs
const actionLogs = [];

function renderPage(res) {
    const logsHtml = actionLogs
        .slice()
        .reverse()
        .map(log => `<li>${log}</li>`)
        .join('');

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Step 2: User Query Submission</title>
  <style>
    body { font-family: sans-serif; max-width: 800px; margin: auto; padding: 1em; }
    form { margin-bottom: 2em; padding: 1em; border: 1px solid #ddd;
      display: grid; grid-template-columns: max-content 1fr; gap: 0.5em 1em; align-items: center;
    }
    form h2 { grid-column: 1 / -1; margin-bottom: 0.5em; }
    label { justify-self: end; }
    input, button { width: 100%; padding: 0.5em; }
    button { grid-column: 1 / -1; width: auto; justify-self: start; }
    .logs { background: #f9f9f9; padding: 1em; border: 1px solid #ccc; }
    .logs li { font-family: monospace; margin-bottom: 0.5em; }
  </style>
</head>
<body>
  <h1>Step 2: User Query Submission</h1>

  <form action="/query" method="post">
    <h2>Submit Item ID for Multi-Sig</h2>
    <label for="itemId">Item ID:</label>
    <input id="itemId" name="itemId" placeholder="e.g. 002" required />
    <button type="submit">Submit Query</button>
  </form>

  <h2>Action Logs</h2>
  <ul class="logs">${logsHtml}</ul>
</body>
</html>
`);
}

// GET UI
app.get('/', (req, res) => renderPage(res));

// Handle multi-signature query submission
app.post('/query', async (req, res) => {
    try {
        const { itemId } = req.body;
        // Call aggregator and capture result
        const result = await aggregateSignatures(itemId);
        const { quantity, aggSig, partialSigs } = result;

        console.log('AGG RESULT:', result);
        actionLogs.push(`>> [QUERY] Raw result: ${JSON.stringify(result)}`);

        actionLogs.push(`>> [QUERY] Item ${itemId}: quantity=${quantity}, aggSig=${aggSig}`);
        // Log each partial signature separately
        partialSigs.forEach(ps => {
            actionLogs.push(
                `   partial from ${ps.nodeId}: sig=${ps.partialSig}`
            );
        });
    } catch (err) {
        actionLogs.push(`Error during query submission: ${err.message}`);
    }
    // Re-render UI
    renderPage(res);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
