import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { FindAllOrgIdsUseCase } from 'src/iam/orgs/application/use-cases/find-all-org-ids/find-all-org-ids.use-case';
import { ObjectStoragePort } from '../../ports/object-storage.port';
import type { StorageObjectSummary } from '../../ports/object-storage.port';
import { PurgeOrgStorageUseCase } from '../purge-org-storage/purge-org-storage.use-case';
import { PurgeOrgStorageCommand } from '../purge-org-storage/purge-org-storage.command';
import { extractOrgIdFromKey } from '../../../domain/org-storage-layout';

/**
 * How old the newest blob under an org's prefixes must be before the sweeper
 * will purge them. Guards against a race with org creation: a brand-new org may
 * write blobs before (or concurrently with) the org-id snapshot this sweep took,
 * so anything recently touched is left for the next run rather than purged.
 */
export const ORPHAN_STORAGE_SAFETY_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface SweepOrphanStorageResult {
  storageOrgCount: number;
  orphanOrgCount: number;
  purgedOrgCount: number;
  skippedRecentOrgCount: number;
  deletedObjectCount: number;
  failedObjectCount: number;
}

/**
 * Periodic sweep that purges object-storage (MinIO) blobs left behind by orgs
 * that no longer exist.
 *
 * Org deletion purges blobs only *after* the row delete succeeds (leak-not-loss,
 * AYC-470). If that deferred purge fails or the process dies in the window, the
 * blobs belong to a nonexistent org and nothing else ever reaches them — an
 * unbounded leak. This sweep closes that gap: it resolves the org ids embedded
 * in storage prefixes against the live org set and purges those with no row,
 * skipping any org whose blobs were touched inside the safety window.
 */
@Injectable()
export class SweepOrphanStorageUseCase {
  private readonly logger = new Logger(SweepOrphanStorageUseCase.name);

  constructor(
    private readonly objectStorage: ObjectStoragePort,
    private readonly findAllOrgIdsUseCase: FindAllOrgIdsUseCase,
    private readonly purgeOrgStorageUseCase: PurgeOrgStorageUseCase,
  ) {}

  async execute(): Promise<SweepOrphanStorageResult> {
    this.logger.log('Starting orphan storage sweep');

    const existingOrgIds = new Set<string>(
      await this.findAllOrgIdsUseCase.execute(),
    );
    const summaries = await this.objectStorage.listObjectsWithMetadata();
    const newestByOrg = this.groupNewestByOrg(summaries);

    const cutoff = Date.now() - ORPHAN_STORAGE_SAFETY_WINDOW_MS;
    const result: SweepOrphanStorageResult = {
      storageOrgCount: newestByOrg.size,
      orphanOrgCount: 0,
      purgedOrgCount: 0,
      skippedRecentOrgCount: 0,
      deletedObjectCount: 0,
      failedObjectCount: 0,
    };

    for (const [orgId, newest] of newestByOrg) {
      if (existingOrgIds.has(orgId)) {
        continue;
      }
      result.orphanOrgCount++;
      if (newest > cutoff) {
        result.skippedRecentOrgCount++;
        continue;
      }
      await this.purgeOrphan(orgId as UUID, result);
    }

    this.logger.log('Finished orphan storage sweep', { ...result });
    return result;
  }

  private async purgeOrphan(
    orgId: UUID,
    result: SweepOrphanStorageResult,
  ): Promise<void> {
    this.logger.warn('Purging storage of nonexistent org', { orgId });
    const purge = await this.purgeOrgStorageUseCase.execute(
      new PurgeOrgStorageCommand(orgId),
    );
    result.purgedOrgCount++;
    result.deletedObjectCount += purge.deletedCount;
    result.failedObjectCount += purge.failedCount;
  }

  /**
   * Maps each org id present in storage to the epoch-ms of its newest blob.
   * A blob whose last-modified time is unknown counts as "now" so an org is
   * never purged on the strength of a missing timestamp.
   */
  private groupNewestByOrg(
    summaries: StorageObjectSummary[],
  ): Map<string, number> {
    const now = Date.now();
    const newestByOrg = new Map<string, number>();
    for (const summary of summaries) {
      const orgId = extractOrgIdFromKey(summary.objectName);
      if (!orgId) {
        continue;
      }
      const modified = summary.lastModified?.getTime() ?? now;
      const current = newestByOrg.get(orgId);
      if (current === undefined || modified > current) {
        newestByOrg.set(orgId, modified);
      }
    }
    return newestByOrg;
  }
}
