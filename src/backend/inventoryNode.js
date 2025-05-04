import crypto from 'crypto';

import { modPow, n, extractPrivateKey } from './pkg.js';
import { inventoryIDs } from '../data/keys.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function signForNode(nodeId, itemId) {
    // 1) Load this node's full ledger
    const dataPath = path.join(
        __dirname,
        `../../src/data/inventory${nodeId}Records.json`
    );
    const inventoryRecords = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    // 2) Find the record and alias itemQty to quantity
    const record = inventoryRecords.find(r => r.itemId === itemId);
    if (!record) {
        throw new Error(`Item ${itemId} not found in inventory ${nodeId}`);
    }
    const quantity = record.itemQty;

    // 3) Hash and sign
    const msg = `${itemId}:${quantity}`;
    const h   = BigInt('0x' + crypto.createHash('sha256').update(msg).digest('hex'));
    const sk  = extractPrivateKey(inventoryIDs[nodeId]);
    const partialSig = modPow(h, sk, n);

    return { nodeId, quantity, partialSig };
}