"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInstructionRef = generateInstructionRef;
/**
 * Generate an instruction reference using the format HLX-[PID]-[DDMM].
 * PID is supplied by the caller and DDMM is the current UTC day and month.
 * @param pid - client or project identifier
 * @returns formatted instruction reference
 */
function generateInstructionRef(pid) {
    const now = new Date();
    const day = String(now.getUTCDate()).padStart(2, '0');
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `HLX-${pid}-${day}${month}`;
}
