import '../data/keys.js';
import express from 'express';
import { aggregateSignatures } from '../backend/aggregator.js';
import { encryptDataRSA } from '../backend/rsa.js';
import { decryptDataOfficer, n_PO } from '../backend/officer.js';
import { e_PO } from '../data/keys.js';


const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// In-memory logs
const actionLogs = [];

function renderPage(res, encryptedMessage = null, message = null, decryptedData = null) {
    const itemId = message ? JSON.parse(message)?.item?.itemId || '' : ''; // Default to empty string if message is null

    // Create HTML for action logs
    const logsHtml = actionLogs
        .slice()
        .reverse()
        .map(log => `<li>${log}</li>`)
        .join('');

    // Create HTML for encrypted data
    // Hidden inputs are used to pass data between forms
    const encryptedHtml = encryptedMessage
    ? `<h4>Encrypted Data:</h4>
        <p>${encryptedMessage}</p>
          <input type="hidden" name="encryptedData" value="${encryptedMessage}" />
          <input type="hidden" name="itemId" value="${itemId}" />`
    : '<p>No encrypted data available to decrypt.</p>';
  
    // Create HTML for raw item details (contains itemId and quantity)
    const rawItemHtml = message
        ? `<div class="raw-item">
            <h4>Raw Item Details:</h4>
            <p>Item ID: ${JSON.parse(message)?.item?.itemId}</p>
            <p>Quantity: ${JSON.parse(message)?.item?.quantity}</p>
            <input type="hidden" name="message" value='${message}' />
          </div>`
        : '';

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
    <input id="itemId" name="itemId" placeholder="e.g. 002" value="${itemId}" required />
    <button type="submit">Submit Query</button>
  </form>

  <form action="/encrypt" method="post">
    <h2>Encrypt the Query with Officer's public key (Server Side)</h2>
    ${rawItemHtml}
    <input type="hidden" name="itemId" value="${itemId}" />
    <button type="submit">Encrypt Query</button>
  </form>

  <form action="/decrypt" method="post">
    <h2>Decrypt the Recieved Query with PKG (Officer Side)</h2>
    ${encryptedHtml}
    <input type="hidden" name="message" value='${message}' />
    <input type="hidden" name="encryptedMessage" value="${encryptedMessage}" />
    <input type="hidden" name="itemId" value="${itemId}" />

    <button type="submit">Decrypt Message</button>
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
    let message = null;
    const { itemId } = req.body; // Get message from the request body
    try {
        // Call aggregator and capture result
        const result = await aggregateSignatures(itemId);
        const { quantity, aggSig, partialSigs } = result;

        // console.log('AGG RESULT:', result);
        actionLogs.push(`>> [QUERY] Raw result: ${JSON.stringify(result)}`);

        // Create message object for query
        message = {
          item: {
            itemId: itemId,
            quantity: quantity,
          },
          aggSig: aggSig,
        }

        // Log each partial signature separately (consensus)
        partialSigs.forEach(ps => {
            actionLogs.push(
                `   partial from ${ps.nodeId}: sig=${ps.partialSig}`
            );
        });

        // Log the query and aggregated signature
        actionLogs.push(`[PKG] >> [QUERY] Item ${message.item.itemId}: quantity=${message.item.quantity}, aggSig=${message.aggSig}`); 
    } catch (err) {
        actionLogs.push(`Error during query submission: ${err.message}`);
    }
    // Re-render UI
    renderPage(res, null, message ? JSON.stringify(message) : null, null);
});

// Encrypt endpoint
app.post('/encrypt', async (req, res) => {
    let encryptedMessage = null;
    const { message } = req.body; // Get itemId from the request body
    try {
        // Convert message to string (pulling itemId and quantity)
        const messageStringItem = JSON.parse(message).item;
        const messageString = JSON.stringify(messageStringItem);

        // Encrypt message object from pkg with Officer's public key
        encryptedMessage = encryptDataRSA(messageString, e_PO, n_PO);

        actionLogs.push(`Perfoming RSA encryption on message: ${messageString} with Officer's public key`);
        actionLogs.push(`e=${e_PO}, n=${n_PO}`);

        actionLogs.push(`Encrypted message: ${JSON.stringify(encryptedMessage.toString())}, aggSig=${JSON.parse(message).aggSig}`); // Log the encrypted message
    } catch (err) {
        actionLogs.push(`Error during encryption: ${err.message}`);
    }
    renderPage(res, encryptedMessage.toString(), message, null);
  });

// Decrypt endpoint
app.post('/decrypt', (req, res) => {
    const { message, encryptedMessage } = req.body;

    let encryptedBigInt;
    try {
      encryptedBigInt = BigInt(encryptedMessage); // Convert string to BigInt
    } catch (err) {
      actionLogs.push(`Error converting encryptedMessage to BigInt: ${err.message}`);
      return renderPage(res, encryptedMessage, message, 'Decryption failed');
    }

    let decryptedData = null;
    try {
        // Decrypt the encrypted data using Officer's private key
        decryptedData = decryptDataOfficer(encryptedBigInt);

        if (!decryptedData) {
          throw new Error('Decryption failed: No data returned');
        }

        actionLogs.push(`[DECRYPTED] >> [QUERY] Item ${decryptedData.itemId}: quantity=${decryptedData.quantity}, aggSig=${JSON.parse(message).aggSig}`);
    } catch (err) {
        actionLogs.push(`Error during decryption: ${err.message}`);
    }

    // Send the decrypted data to UI
  renderPage(res, encryptedMessage, message, decryptedData ? JSON.stringify(decryptedData) : 'Decryption failed');
  });

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
