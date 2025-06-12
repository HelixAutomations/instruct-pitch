/**
 * Generate a unique instruction reference using the format HLX-[PID]-[RANDOM].
 *
 * @param pid - client or project identifier
 * @returns formatted instruction reference
 */
export function generateInstructionRef(pid: string): string {
  const random = Math.random().toString(36).slice(2, 8); // e.g. "4f92xa"
  return `HLX-${pid}-${random}`;
}