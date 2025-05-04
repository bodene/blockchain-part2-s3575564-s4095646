import { n } from './pkg.js';
import { signForNode } from './inventoryNode.js';

// List of inventory Node identifiers
const nodes = ['A', 'B', 'C', 'D'];

/**
 * Runs the multi-signature process: queries each inventory node,
 * collects partial signatures, checks consistency, and aggregates.
 */
export async function aggregateSignatures(itemId) {
    // Query each node parallel
    const results = await Promise.all(
        nodes.map(nodeId => signForNode(nodeId, itemId))
    );

    // Check that all quantities match
    const quantities = results.map(r => r.quantity);
    const firstQuantity = quantities[0];
    if (!quantities.every(q => q === firstQuantity)) {
        throw new Error('Quantities  do not match across nodes');
    }
    const quantity = firstQuantity;

    // Prepare partial signatures map
    const partialSigs = results.map(({ nodeId, quantity, partialSig }) => ({
        nodeId,
        quantity,
        partialSig: partialSig.toString()
    }));

    // Compute aggregated signature = product of partials mod n
    const agg = partialSigs.reduce((acc, { partialSig }) => {
        return (acc * BigInt(partialSig)) % n;
    }, 1n);

    return { partialSigs,
    aggSig: agg.toString(),
    quantity: firstQuantity };
}


