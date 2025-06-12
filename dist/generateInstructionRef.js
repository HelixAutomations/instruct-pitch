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
    const random = Math.floor(Math.random() * 9000) + 1000; // Generates a 4-digit number between 1000 and 9999
    return `HLX-${pid}-${random}`;
}
