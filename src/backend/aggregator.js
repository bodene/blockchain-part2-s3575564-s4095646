import crypto from 'crypto';
import { fetchAndVerifyQuantities, signForNode, confirmConsensus } from './inventoryNode.js';
import { inventoryIDs } from '../data/keys.js';
import { g, n, e } from './pkg.js';
import { modPow } from './utils.js';

/**
 * Runs the multi-signature aggregation for an itemId.
 */
export async function aggregateSignature(itemId) {
    const logs = [];

    // 1) Fetch and verify quantity
    const quantity = await fetchAndVerifyQuantities(itemId, msg => logs.push(msg));

    // 2) Collect partial signatures
    const nodeIds = Object.keys(inventoryIDs);
    const results = [];
    for (const node of nodeIds) {
        const res = await signForNode(node, itemId, msg => logs.push(msg));
        results.push(res);
    }

    // 3) Aggregate t
    const tFormula = results.map(r => r.t_i.toString()).join(' * ');
    let t = 1n;
    for (const r of results) t = (t * r.t_i) % n;
    logs.push(`<b>[AGGREGATE EACH INVENTORY COMPUTES t] t = (t_A * t_B * t_C * t_D) mod n </b> = ${tFormula} mod ${n} = ${t}`);

    // 4) Compute hash H (for internal s generation)
    const mString = `${itemId}${quantity}`;
    const hashInput = t.toString() + mString;
    const hash = BigInt('0x' + crypto.createHash('sha256').update(hashInput).digest('hex'));

    // 5) Compute partial s_i and log
    const sigs = [];
    for (const r of results) {
        const s_i = (g[r.nodeId] * modPow(r.r_i, hash, n)) % n;
        logs.push(
            `<b>[SIGN SETUP][Node ${r.nodeId}] s_${r.nodeId} = g_i * r_i ^ (Hash(t, m)) mod n </b> = ` +
            `${g[r.nodeId]} * ${r.r_i}^${hash} mod ${n} = ${s_i}`
        );
        sigs.push({ nodeId: r.nodeId, s_i });
    }

    // 6) Aggregate s
    const sFormula = sigs.map(s => s.s_i.toString()).join(' * ');
    let s = 1n;
    for (const sv of sigs) s = (s * sv.s_i) % n;
    logs.push(`<b>[HARN IDENTITY MULTI SIGNATURE SETUP] s = s_1 * s_2 * s_3 * s_4 mod n</b> = ${sFormula} mod ${n} = ${s}`);

    // 7) Log the payload values (m, t, s)
    logs.push(`<b>[MULTI SIGNATURE] (t, s) </b> {${t.toString()}, ${s.toString()}}`);
    logs.push(`<b>[MESSAGE] (m, t, s) </b> {${itemId}, ${quantity}}, ${t.toString()}, ${s.toString()}`);

    // 8) Consensus
    for (const node of nodeIds) {
        await confirmConsensus(node, itemId, { t, s }, msg => logs.push(msg));
    }

    // Return only logs and payload (m, t, s)
    return {
        actionLogs: logs,
        multiSignature: { t, s },
        fullMessage: { m: { itemId, quantity }, t, s }
    };
}

/**
 * Verifies a Harn multi-signature.
 */
export function verifySignature(multiSignature, fullMessage) {
    const logs = [];
    const { t, s } = multiSignature;
    const { itemId, quantity } = fullMessage.m;

    // Recompute hash H
    const mString = `${itemId}${quantity}`;
    const hashInput = t.toString() + mString;
    const hash = BigInt('0x' + crypto.createHash('sha256').update(hashInput).digest('hex'));

    // 1) LHS = s^e mod n
    const v1 = modPow(s, e, n);
    logs.push(`<b>[VERIFICATION 1] s^e mod n </b>= ${s}^${e} mod ${n} = ${v1}`);

    // 2) Compute identity product i1*i2*i3*i4
    const identityProduct = Object.values(inventoryIDs).reduce((acc, val) => (acc * val) % n, 1n);
    logs.push(`<b>[VERIFICATION 2] (i_1 * i_2 * i_3 * i_4) mod n </b>= ${identityProduct}`);

    // 3) Compute t^H mod n
    const tToH = modPow(t, hash, n);
    logs.push(`<b>[VERIFICATION 2] t^H mod n </b>= ${t}^${hash} mod ${n} = ${tToH}`);

    // 4) RHS = identityProduct * t^H mod n
    const v2 = (identityProduct * tToH) % n;
    logs.push(`<b>[VERIFICATION 2] RHS = identityProduct * t^H mod n </b>= (${identityProduct} * ${tToH}) mod ${n} = ${v2}`);

    // 5) Final check
    const valid = v1 === v2;
    logs.push(`<b>[VERIFICATION RESULT]</b> ${valid ? 'SUCCESS' : 'FAILURE'}`);

    return { verification: valid, verificationLogs: logs };
}