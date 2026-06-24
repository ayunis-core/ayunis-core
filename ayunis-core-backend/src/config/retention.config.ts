import { registerAs } from '@nestjs/config';

export interface RetentionConfig {
  /**
   * When true, the nightly enforcement job logs which threads *would* be
   * deleted per org but does not delete anything. Intended for safely
   * validating retention on the first production rollouts. Defaults to false.
   */
  dryRun: boolean;
}

export const retentionConfig = registerAs(
  'retention',
  (): RetentionConfig => ({
    dryRun: process.env.RETENTION_DRY_RUN === 'true',
  }),
);
