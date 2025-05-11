import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { modPow, n } from './pkg.js';
import {
    e,
    randomNoInventoryA,
    randomNoInventoryB,
    randomNoInventoryC,
    randomNoInventoryD
} from '../data/keys.js';

const randomMap = {
    A: randomNoInventoryA,
    B: randomNoInventoryB,
    C: randomNoInventoryC,
    D: randomNoInventoryD
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function signForNode(nodeId, itemId, log) {
    // 1. Load this node's full ledger
    const dataPath = path.join(
        __dirname,
        `../../src/data/inventory${nodeId}Records.json`
    );
    const inventoryRecords = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    // 2. Find the record and alias itemQty to quantity
    const record = inventoryRecords.find(r => r.itemId === itemId);
    if (!record) {
        throw new Error(`Item ${itemId} not found in inventory ${nodeId}`);
    }
    const quantity = record.itemQty;

    // 3. Pull the node’s random
    const r_i = randomMap[nodeId];

    // 4. Compute t_i = r_i^e mod n
    const t_i = modPow(r_i, e, n);

    // 5. log every step
    log(`[SIGN][Node ${nodeId}] r_i = ${r_i}`);
    log(`[SIGN][Node ${nodeId}] t_i = r_i^(e) mod n = ${r_i}^${e} mod ${n} = ${t_i}`);
    log(`[SEND][Node ${nodeId}] sends t_i to other Inventories`);

    return { nodeId, quantity, r_i, t_i };
}

export async function confirmConsensus(nodeId, itemId, multiSig, log) {
    // turn the bundle into an all‐string object
    const safeBundle = {
        t: multiSig.t.toString(),
        s: multiSig.s.toString()
    };
    log(
        `[CONSENSUS][Node ${nodeId}] received bundle for item ${itemId}: ` +
        `${JSON.stringify(safeBundle)}`
    );
    return { nodeId, status: 'ACK' };
}