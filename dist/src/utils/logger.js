"use strict";
// src/utils/logger.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
/**
 * Small logger utility for Truss.
 * Keeps logging in one place instead of calling console directly everywhere.
 */
exports.logger = {
    /**
     * General info messages.
     * Use for normal progress logs.
     */
    info(message) {
        console.log(message);
    },
    /**
     * Warning messages.
     * Use when something is unusual but not fatal.
     */
    warn(message) {
        console.warn(message);
    },
    /**
     * Error messages.
     * Use for failures and important problems.
     */
    error(message) {
        console.error(message);
    },
    /**
     * Debug messages.
     * Useful during development.
     * Can be turned on only when DEBUG=true.
     */
    debug(message) {
        if (process.env.DEBUG === "true") {
            console.debug(message);
        }
    },
};
