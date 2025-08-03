"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInstructionRef = generateInstructionRef;
/**
 * Generate an instruction reference using the format HLX-[PID]-[PASSCODE].
 *
 * @param pid - client or project identifier
 * @param passcode - deal passcode used to validate the instruction
 * @returns formatted instruction reference
 */
function generateInstructionRef(pid, passcode) {
    return `HLX-${pid}-${passcode}`;
}
