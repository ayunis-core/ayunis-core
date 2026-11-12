export const INTEGRATION_INSTRUCTIONS_MAX_LENGTH = 10000;

/**
 * The update endpoint keeps the stored text when `instructions` is omitted
 * and removes it on `null`, so an unchanged field must not be sent at all.
 */
export function buildInstructionsUpdate(
  value: string | null | undefined,
  stored: string | null | undefined,
): { instructions?: string | null } {
  const next = (value ?? '').trim();
  if (next === (stored ?? '')) return {};
  return { instructions: next || null };
}

export function buildInstructionsForCreate(value: string | null | undefined): {
  instructions?: string;
} {
  const instructions = (value ?? '').trim();
  return instructions ? { instructions } : {};
}
