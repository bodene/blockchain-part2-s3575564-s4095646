import { modInverse, modPow } from './utils.js';
import { inventoryIDs, p, q, e } from '../data/keys.js';

const actionLogs = [];

// Key Generation
const n = p * q;
const phi = (p - 1n) * (q - 1n);
const d = modInverse(e, phi);

// Logging setup
export const setupLogs = [
    `<b>[SETUP PKG GENERATION] p </b>= ${p}`,
    `<b>[SETUP PKG GENERATION] q </b>= ${q}`,
    `<b>[SETUP PKG GENERATION] e </b>= ${e}`,
    `<b>[SETUP PKG GENERATION] n = p * q =</b> ${p} * ${q} = ${n}`,
    `<b>[SETUP PKG GENERATION] φ = (p - 1) * (q - 1) =</b> ${p-1n} * ${q-1n} = ${phi}`,
    `<b>[SETUP PKG GENERATION] d = e⁻¹ mod φ </b>= ${e}^-1 mod ${phi} = ${d}`,
    `<b>[PKG PUBLIC KEY] (e, n) =</b> (${e}, ${n}`,
    `<b>[PKG PRIVATE KEY] (d, n) =</b> (${d}, ${n}`,
];
setupLogs.forEach(line => actionLogs.push(line));

// Generate secret keys (g-values)
const g = {};
for (const node in inventoryIDs) {
    g[node] = modPow(inventoryIDs[node], d, n);
    actionLogs.push(
        `<b>[PKG SIGNS SIGNER IDENTITY FOR SECRET KEY][Node ${node}] g_${node} = i_${node} ^ (d) mod n </b> = ${inventoryIDs[node]}^${d} mod ${n} = ${g[node]}`,
        `<b>[SEND] PKG sends ${node} Secret Key (g)</b>`
    );
}

// Public/private keys of PKG
const pkgPublicKey = { e, n };
const pkgPrivateKey = { d, n };

export { n, pkgPublicKey, pkgPrivateKey, g, actionLogs };
