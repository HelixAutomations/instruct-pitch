"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInstructionRef = generateInstructionRef;
const nanoid_1 = require("nanoid");
/**
 * Generate a unique instruction reference using the format HLX-[PID]-[RANDOM].
 *
 * @param pid - client or project identifier
 * @returns formatted instruction reference
 */
function generateInstructionRef(pid) {
    const random = (0, nanoid_1.nanoid)(6); // e.g. "aB3xYz"
    return `HLX-${pid}-${random}`;
}
