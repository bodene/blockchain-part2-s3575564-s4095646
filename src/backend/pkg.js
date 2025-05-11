import {p, q, e, inventoryIDs } from '../data/keys.js';

// Compute RSA Modulus and totient
export const n = p * q;
const phi = (p - 1n) * (q - 1n);

/*
 * Finds the greatest common divisor (g) of a and b,
 * and computes coefficients x and y such that:
 * a*x + b*y = g
 */
export function egcd(a, b) {
    if (b === 0n) {
        // Base case: gcd(a, 0) = a
        return { g: a, x: 1n, y: 0n };
    }
    // Recurse on smaller problem
    const { g, x: x1, y: y1 } = egcd(b, a % b);
    // Back-substitute to get current coefficients
    return {
        g,
        x: y1,
        y: x1 - (a / b) * y1
    };
}

// Compute modular Inverse: x^(-1) mod m
export function modInverse(x, m) {
    const { g, x: inv } = egcd(x, m);
    if (g !== 1n) throw new Error("No modular inverse exists");
    return (inv % m + m) % m;
}

// Compute PKG's private key
export const d = modInverse(e, phi);

export function modPow(base, exponent, modulus) {
    if (modulus === 1n) return 0n;
    let result = 1n;
    base = base % modulus;
    while (exponent > 0n) {
        if (exponent & 1n) result = (result * base) % modulus;
        exponent >>= 1n;
        base = (base * base) % modulus;
    }
    return result;
}

// Display Logs for Set up
export const setupLogs = [
    `p = ${p}`,
    `q = ${q}`,
    `e = ${e}`,
    `n = p * q = ${p} * ${q} = ${n}`,
    `φ = (p - 1) * (q - 1) = ${p - 1n} * ${q - 1n} = ${phi}`,
    `d = e⁻¹ mod φ = ${d}`
];

// Derive node-specific secret keys (identity-based)
export function extractPrivateKey(nodeId) {
    const idNum = BigInt(nodeId);
    return modPow(idNum, d, n);
}

// Derive and export map  of nodes secret keys for inventories
export const nodePrivateKeys = {
    A: extractPrivateKey(inventoryIDs.A),
    B: extractPrivateKey(inventoryIDs.B),
    C: extractPrivateKey(inventoryIDs.C),
    D: extractPrivateKey(inventoryIDs.D),
};