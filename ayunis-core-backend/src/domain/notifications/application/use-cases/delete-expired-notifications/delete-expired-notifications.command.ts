import type { UUID } from 'crypto';

export class DeleteExpiredNotificationsCommand {
  readonly orgId: UUID;
  readonly createdBefore: Date;
  /** Counts what would be deleted without deleting it. */
  readonly dryRun: boolean;

  constructor(params: { orgId: UUID; createdBefore: Date; dryRun: boolean }) {
    this.orgId = params.orgId;
    this.createdBefore = params.createdBefore;
    this.dryRun = params.dryRun;
  }
}
