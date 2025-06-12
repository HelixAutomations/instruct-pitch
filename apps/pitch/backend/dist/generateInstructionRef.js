"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInstructionRef = generateInstructionRef;
/**
 * Generate a unique instruction reference using the format HLX-[PID]-[RANDOM].
 *
 * @param pid - client or project identifier
 * @returns formatted instruction reference
 */
function generateInstructionRef(pid) {
    const random = Math.random().toString(36).slice(2, 8); // e.g. "4f92xa"
    return `HLX-${pid}-${random}`;
}
