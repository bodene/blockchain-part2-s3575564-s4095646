// Extended GCD
export function egcd(a, b) {
    return b === 0n
        ? { g: a, x: 1n, y: 0n }
        : (() => {
            const { g, x: x1, y: y1 } = egcd(b, a % b);
            return { g, x: y1, y: x1 - (a / b) * y1 };
        })();
}

// Modular inverse of e modulo φ
export function modInverse(e, phi) {
    const { g, x } = egcd(e, phi);
    if (g !== 1n) throw new Error('modInverse: not coprime');
    return (x % phi + phi) % phi;
}

// modular exponentiation
export function modPow(base, exp, mod) {
    let result = 1n;
    let b = base % mod;
    let e = exp;
    while (e > 0n) {
        if (e & 1n) result = (result * b) % mod;
        b = (b * b) % mod;
        e >>= 1n;
    }
    return result;
}