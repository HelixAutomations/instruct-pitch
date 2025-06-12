/**
 * Generate a unique instruction reference using the format HLX-[PID]-[RANDOM].
 *
 * @param pid - client or project identifier
 * @returns formatted instruction reference
 */
export function generateInstructionRef(pid: string): string {
  const random = Math.floor(Math.random() * 9000) + 1000; // Generates a 4-digit number between 1000 and 9999
  return `HLX-${pid}-${random}`;
}