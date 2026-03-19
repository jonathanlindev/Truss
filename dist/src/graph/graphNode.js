"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGraphNode = createGraphNode;
/**
 * createGraphNode()
 * Purpose: Create a GraphNode for a file.
 *
 * Input:
 *  - file: repo-relative file path
 *
 * Output:
 *  - GraphNode with empty outgoing/incoming lists
 */
function createGraphNode(file) {
    return {
        file,
        outgoing: [],
        incoming: [],
    };
}
