import { nanoid } from 'nanoid';

/**
 * Generate a unique instruction reference using the format HLX-[PID]-[RANDOM].
 *
 * @param pid - client or project identifier
 * @returns formatted instruction reference
 */
export function generateInstructionRef(pid: string): string {
  const random = nanoid(6); // e.g. "aB3xYz"
  return `HLX-${pid}-${random}`;
}
