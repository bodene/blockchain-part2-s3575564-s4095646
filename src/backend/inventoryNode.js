import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { n } from './pkg.js';
import { modPow } from './utils.js'
import {
    e,
    randomNoInventoryA,
    randomNoInventoryB,
    randomNoInventoryC,
    randomNoInventoryD,
    inventoryIDs
} from '../data/keys.js';

const randomMap = {
    A: randomNoInventoryA,
    B: randomNoInventoryB,
    C: randomNoInventoryC,
    D: randomNoInventoryD
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Fetch and verify that all inventories report the same quantity for a given itemId.
 * Logs consistency or discrepancies, and throws if mismatch detected.
 */
export async function fetchAndVerifyQuantities(itemId, log) {
    const nodeIds = Object.keys(inventoryIDs);
    const results = [];

    // Load each node's quantity
    for (const nodeId of nodeIds) {
        const dataPath = path.join(
            __dirname,
            `../../src/data/inventory${nodeId}Records.json`
        );
        const records = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        const record = records.find(r => r.itemId === itemId);
        if (!record) {
            log(`<b>[INCONSISTENCY]</b> Item ${itemId} not found in inventory ${nodeId}`);
            throw new Error(`Item ${itemId} not found in inventory ${nodeId}`);
        }
        results.push({ nodeId, quantity: record.itemQty });
    }

    // Check all quantities match
    const quantities = results.map(r => r.quantity);
    const firstQty = quantities[0];
    const allEqual = quantities.every(q => q === firstQty);
    if (!allEqual) {
        results.forEach(r =>
            log(`<b>[INCONSISTENCY]</b> Node ${r.nodeId} reports quantity=${r.quantity}`)
        );
        throw new Error('Inventory data mismatch detected—aborting signature');
    }

  //  log(`<b>[FETCH QUANTITY]</b> All nodes agree on quantity=${firstQty}`);
    return firstQty;
}

/**
 * Sign for a single node: compute its partial signature values.
 * @param {string} nodeId
 * @param {string} itemId
 * @param {function} log - logging callback
 * @returns {object} { nodeId, quantity, r_i, t_i }
 */
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

    // 3. Pull the node’s random nonce
    const r_i = randomMap[nodeId];

    // 4. Compute t_i = r_i^e mod n
    const t_i = modPow(r_i, e, n);

    // 5. Log each step
    log(`<b>[SIGN][Node ${nodeId}] r_${nodeId}</b> = ${r_i}`);
    log(`<b>[SIGN][Node ${nodeId}] t_${nodeId} = r_i^(e) mod n </b>= ${r_i}^${e} mod ${n} = ${t_i}`);
    log(`<b>[SEND][Node ${nodeId}] sends t_${nodeId} to other Inventories</b>`);

    return { nodeId, quantity, r_i, t_i };
}

/**
 * Confirm consensus for a node: log receipt of the aggregated signature bundle.
 * @param {string} nodeId
 * @param {string} itemId
 * @param {object} multiSig - { t: BigInt, s: BigInt }
 * @param {function} log - logging callback
 * @returns {object} acknowledgment
 */
export async function confirmConsensus(nodeId, itemId, multiSig, log) {
    const safeBundle = {
        t: multiSig.t.toString(),
        s: multiSig.s.toString()
    };
    log(
        `<b>[CONSENSUS][Node ${nodeId}] received bundle for item ${itemId}]</b> ` +
        `${JSON.stringify(safeBundle)}`
    );
    return { nodeId, status: 'ACK' };
}