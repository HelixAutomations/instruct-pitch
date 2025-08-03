/**
 * Generate an instruction reference using the format HLX-[PID]-[PASSCODE].
 *
 * @param pid - client or project identifier
 * @param passcode - deal passcode used to validate the instruction
 * @returns formatted instruction reference
 */
export function generateInstructionRef(pid: string, passcode: string): string {
  return `HLX-${pid}-${passcode}`;
}