/**
 * Generate an instruction identifier using the format HLX-[PID]-[DDMM].
 * PID is supplied by the caller and DDMM is the current UTC day and month.
 *
 * @param pid - client or project identifier
 * @returns formatted instruction ID
 */
export function generateInstructionId(pid: string): string {
  const now = new Date();
  const day = String(now.getUTCDate()).padStart(2, '0');
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `HLX-${pid}-${day}${month}`;
}