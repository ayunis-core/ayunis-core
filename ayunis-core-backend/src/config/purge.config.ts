import { registerAs } from '@nestjs/config';

const DEFAULT_INVITE_GRACE_DAYS = 30;
const DEFAULT_API_KEY_GRACE_DAYS = 30;

function parseGraceDays(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  // A negative or non-numeric value would purge records early (or immediately),
  // which is dangerous for a destructive job — fall back to the safe default.
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

export interface PurgeConfig {
  /**
   * When true, the nightly purge jobs log how many expired invites / API keys
   * *would* be deleted but do not delete anything. Intended for safely
   * validating the purge on the first production rollouts. Defaults to false.
   */
  dryRun: boolean;
  /**
   * Grace period (in days) kept after an invite's `expiresAt` before it is
   * purged. The window keeps recently-expired invites available for the
   * "resend expired invite" flow and for admin visibility. Defaults to 30.
   */
  inviteGraceDays: number;
  /**
   * Grace period (in days) kept after an API key's `expiresAt` before it is
   * purged. Bounds how long expired credentials linger for audit visibility
   * instead of being retained indefinitely. Defaults to 30.
   */
  apiKeyGraceDays: number;
}

export const purgeConfig = registerAs(
  'purge',
  (): PurgeConfig => ({
    dryRun: process.env.PURGE_DRY_RUN === 'true',
    inviteGraceDays: parseGraceDays(
      process.env.PURGE_INVITE_GRACE_DAYS,
      DEFAULT_INVITE_GRACE_DAYS,
    ),
    apiKeyGraceDays: parseGraceDays(
      process.env.PURGE_API_KEY_GRACE_DAYS,
      DEFAULT_API_KEY_GRACE_DAYS,
    ),
  }),
);
