import express from 'express';
import { aggregateSignature, verifySignature } from '../backend/aggregator.js';
import { encryptDataRSA } from '../backend/rsa.js';
import { decryptDataOfficer, n_PO, d_PO } from '../backend/officer.js';
import { actionLogs as pkgLogs, pkgPublicKey } from '../backend/pkg.js';
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
            <p>Item ID: ${JSON.parse(message)?.m?.itemId}</p>
            <p>Quantity: ${JSON.parse(message)?.m?.quantity}</p>
            <input type="hidden" name="message" value='${message}' />
          </div>`
        : '';

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>User Query Submission</title>
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

pkgLogs.forEach(log => actionLogs.push(log));

app.post('/query', async (req, res) => {
    const { itemId } = req.body;
    let message = null;

    try {
        const { actionLogs: aggLogs, multiSignature, fullMessage } =
            await aggregateSignature(itemId);
        aggLogs.forEach(line => actionLogs.push(line));

        const { m: { itemId: id, quantity }, t, s } = fullMessage;
        const payload = { m: { itemId: id, quantity }, t: t.toString(), s: s.toString() };
        message = JSON.stringify(payload);
    } catch (err) {
        actionLogs.push(`<b>Error during query submission:</b> ${err.message}`);
    }

    renderPage(res, null, message, null);
});

// Handle encryption (only encrypt the message m)
app.post('/encrypt', async (req, res) => {
    const { message } = req.body;
    let encryptedM = null;

    try {
        // Extract only m from the payload
        const { m } = JSON.parse(message);
        const mString = JSON.stringify(m);

        encryptedM = encryptDataRSA(mString, e_PO, n_PO);
        actionLogs.push(`<b>[ENCRYPT]</b> Encrypting m only: ${mString}`);
        actionLogs.push(`<b>[ENCRYPT]</b> Ciphertext: ${encryptedM.toString()}`);
    } catch (err) {
        actionLogs.push(`<b>Error during encryption:</b> ${err.message}`);
    }

    // Pass encrypted m and original message for decryption step
    renderPage(res, encryptedM ? encryptedM.toString() : null, message, null);
});

// Handle decryption and verification (Server Side)
app.post('/decrypt', async (req, res) => {
    const { message, encryptedMessage } = req.body;
    let decryptedM = null;

    try {
        // Decrypt the encrypted m using Officer's private key
        const encryptedBigInt = BigInt(encryptedMessage);
        decryptedM = decryptDataOfficer(encryptedBigInt);
        actionLogs.push(
            `<b>[DECRYPT]</b> Decrypted m: {${decryptedM.itemId}, ${decryptedM.quantity}}`
        );
    } catch (err) {
        actionLogs.push(`<b>Error during decryption:</b> ${err.message}`);
        return renderPage(res, encryptedMessage, message, 'Decryption failed');
    }

    // Parse the original payload to extract multi-signature
    let parsed = {};
    try {
        parsed = JSON.parse(message);
    } catch (_) {}
    const { t, s } = parsed;
    actionLogs.push(`<b>[DECRYPT]</b> Received multiSig bundle: {${t}, ${s}}`);

    // Verify the aggregate signature
    try {
        const { verification, verificationLogs } = verifySignature(
            { t: BigInt(t), s: BigInt(s) },
            { m: { itemId: decryptedM.itemId, quantity: decryptedM.quantity }, t: BigInt(t), s: BigInt(s) }
        );
        verificationLogs.forEach(log => actionLogs.push(log));
        actionLogs.push(
            `<b>[VERIFY RESULT]</b> signature is ${verification ? 'valid' : 'INVALID'}`
        );
    } catch (err) {
        actionLogs.push(`<b>Error during verification:</b> ${err.message}`);
    }

    // Re-render with the decrypted data shown
    renderPage(
        res,
        encryptedMessage,
        message,
        JSON.stringify({ itemId: decryptedM.itemId, quantity: decryptedM.quantity })
    );
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));


// // Convert message to string (pulling itemId and quantity)
// const messageStringItem = JSON.parse(message).item;
// const messageString = JSON.stringify(messageStringItem);

// // Encrypt message object from pkg with Officer's public key
// encryptedMessage = encryptDataRSA(messageString, e_PO, n_PO);

// actionLogs.push(`Perfoming RSA encryption on message: ${messageString} with Officer's public key`);
// actionLogs.push(`e=${e_PO}, n=${n_PO}`);

// actionLogs.push(`Encrypted message: ${JSON.stringify(encryptedMessage.toString())}, aggSig=${JSON.parse(message).aggSig}`); // Log the encrypted message
