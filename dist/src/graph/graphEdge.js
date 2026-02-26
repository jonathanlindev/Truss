"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGraphEdge = createGraphEdge;
/**
 * createGraphEdge()
 * Purpose: Create a GraphEdge between two nodes and connect it to node lists.
 *
 * Input:
 *  - from: source node
 *  - to: target node
 *  - meta: original DependencyEdge data
 *
 * Output:
 *  - GraphEdge
 */
function createGraphEdge(from, to, meta) {
    const edge = { from, to, meta };
    // Connect edge to nodes (adjacency lists).
    from.outgoing.push(edge);
    to.incoming.push(edge);
    return edge;
}
