/**
 * Calculates the expiration date for an invite based on a duration string.
 *
 * @param inviteExpiresIn - Duration string in format: number + d/h/m/s (e.g., "7d", "24h", "60m", "3600s")
 * @returns Date object representing the expiration time
 * @throws Error if the format is invalid
 */
export function getInviteExpiresAt(inviteExpiresIn: string): Date {
  // Parse duration like "7d", "24h", "60m", "3600s"
  const match = inviteExpiresIn.match(/^(\d+)([dhms])$/);

  if (!match) {
    throw new Error(
      `Invalid invite expires in format: ${inviteExpiresIn}. Expected format: number + d/h/m/s (e.g., "7d", "24h")`,
    );
  }

  const [, amountStr, unit] = match;
  const amount = parseInt(amountStr, 10);

  let multiplier: number;
  switch (unit) {
    case 'd':
      multiplier = 24 * 60 * 60 * 1000; // days to milliseconds
      break;
    case 'h':
      multiplier = 60 * 60 * 1000; // hours to milliseconds
      break;
    case 'm':
      multiplier = 60 * 1000; // minutes to milliseconds
      break;
    case 's':
      multiplier = 1000; // seconds to milliseconds
      break;
    default:
      throw new Error(`Unsupported time unit: ${unit}`);
  }

  return new Date(Date.now() + amount * multiplier);
}
