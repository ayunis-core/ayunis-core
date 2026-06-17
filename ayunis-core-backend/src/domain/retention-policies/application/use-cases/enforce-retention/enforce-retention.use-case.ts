import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { DeleteThreadUseCase } from 'src/domain/threads/application/use-cases/delete-thread/delete-thread.use-case';
import { DeleteThreadCommand } from 'src/domain/threads/application/use-cases/delete-thread/delete-thread.command';
import {
  FindExpiredThreadRefsByOrgUseCase,
  type ExpiredThreadRef,
} from 'src/domain/threads/application/use-cases/find-expired-thread-refs-by-org/find-expired-thread-refs-by-org.use-case';
import { FindExpiredThreadRefsByOrgQuery } from 'src/domain/threads/application/use-cases/find-expired-thread-refs-by-org/find-expired-thread-refs-by-org.query';
import { RetentionPoliciesRepository } from '../../ports/retention-policies.repository';
import type { OrgRetentionPolicy } from '../../../domain/org-retention-policy.entity';
import type {
  EnforceRetentionResult,
  OrgRetentionResult,
} from './enforce-retention.result';

/** Number of expired threads fetched and processed per page. */
export const BATCH_SIZE = 100;
/** Safety cap on pages per org, guarding against a pathological loop. */
export const MAX_BATCHES_PER_ORG = 10_000;

/**
 * Deletes conversation data that has aged past each org's retention window.
 * Opt-in: only orgs with an enabled policy are touched. Threads are deleted
 * one at a time through DeleteThreadUseCase (which also purges storage objects
 * and cascades messages/artifacts/images) rather than via bulk SQL. Failures
 * are isolated per thread so one bad thread can't abort the run.
 */
@Injectable()
export class EnforceRetentionUseCase {
  private readonly logger = new Logger(EnforceRetentionUseCase.name);

  constructor(
    private readonly retentionPoliciesRepository: RetentionPoliciesRepository,
    private readonly findExpiredThreadRefsByOrg: FindExpiredThreadRefsByOrgUseCase,
    private readonly deleteThreadUseCase: DeleteThreadUseCase,
    private readonly contextService: ContextService,
    private readonly configService: ConfigService,
  ) {}

  async execute(): Promise<EnforceRetentionResult> {
    const dryRun = this.configService.get<boolean>('retention.dryRun') ?? false;
    const policies = await this.retentionPoliciesRepository.findAllEnabled();
    const now = new Date();

    this.logger.log('Starting retention enforcement', {
      enabledOrgs: policies.length,
      dryRun,
    });

    const perOrg: OrgRetentionResult[] = [];
    for (const policy of policies) {
      perOrg.push(await this.enforceForOrg(policy, now, dryRun));
    }

    const result: EnforceRetentionResult = {
      orgsProcessed: perOrg.length,
      totalDeleted: perOrg.reduce((sum, o) => sum + o.deleted, 0),
      totalFailed: perOrg.reduce((sum, o) => sum + o.failed, 0),
      dryRun,
      perOrg,
    };
    this.logger.log('Retention enforcement complete', {
      orgsProcessed: result.orgsProcessed,
      totalDeleted: result.totalDeleted,
      totalFailed: result.totalFailed,
      dryRun,
    });
    return result;
  }

  private async enforceForOrg(
    policy: OrgRetentionPolicy,
    now: Date,
    dryRun: boolean,
  ): Promise<OrgRetentionResult> {
    const cutoff = policy.cutoffFrom(now);
    const result: OrgRetentionResult = {
      orgId: policy.orgId,
      retentionDays: policy.retentionDays as number,
      scanned: 0,
      deleted: 0,
      failed: 0,
      dryRun,
      capReached: false,
    };
    // Should never happen (findAllEnabled excludes disabled), but guards the
    // type narrowing and avoids deleting everything on a null cutoff.
    if (!cutoff) {
      return result;
    }

    result.capReached = await this.drainExpiredThreads(policy, cutoff, result);
    if (result.capReached) {
      this.logger.warn(
        'Retention batch cap reached; expired threads may remain for org',
        { maxBatches: MAX_BATCHES_PER_ORG, ...result },
      );
    }

    this.logger.log('Retention enforced for org', { cutoff, ...result });
    return result;
  }

  /**
   * Pages through an org's expired threads, deleting each page, until the org
   * is drained or the per-org batch cap is hit. Returns true only when work
   * still remains after the cap — an org that drains exactly on the cap
   * boundary returns false so it doesn't raise a spurious "data may remain"
   * warning.
   */
  private async drainExpiredThreads(
    policy: OrgRetentionPolicy,
    cutoff: Date,
    result: OrgRetentionResult,
  ): Promise<boolean> {
    let offset = 0;
    for (let batch = 0; batch < MAX_BATCHES_PER_ORG; batch++) {
      const refs = await this.fetchExpiredPage(
        policy.orgId,
        cutoff,
        offset,
        BATCH_SIZE,
      );
      if (refs.length === 0) {
        return false;
      }
      offset += await this.processBatch(policy.orgId, refs, result);
      if (refs.length < BATCH_SIZE) {
        return false;
      }
    }
    // Ran every batch on full pages — probe once more (cheaply) to learn
    // whether the org genuinely has more expired threads than the cap allows.
    const remaining = await this.fetchExpiredPage(
      policy.orgId,
      cutoff,
      offset,
      1,
    );
    return remaining.length > 0;
  }

  private fetchExpiredPage(
    orgId: UUID,
    cutoff: Date,
    offset: number,
    limit: number,
  ): Promise<ExpiredThreadRef[]> {
    return this.findExpiredThreadRefsByOrg.execute(
      new FindExpiredThreadRefsByOrgQuery(orgId, cutoff, limit, offset),
    );
  }

  /**
   * Processes one page of expired threads, mutating `result` counters.
   * Returns how far the paging offset must advance to make progress on the
   * next page: in dry-run nothing is deleted so the whole page is skipped; in
   * a real run only failed deletions remain, so the offset steps past them.
   */
  private async processBatch(
    orgId: UUID,
    refs: ExpiredThreadRef[],
    result: OrgRetentionResult,
  ): Promise<number> {
    if (result.dryRun) {
      result.scanned += refs.length;
      return refs.length;
    }

    let advance = 0;
    for (const ref of refs) {
      result.scanned += 1;
      try {
        await this.deleteThread(orgId, ref);
        result.deleted += 1;
      } catch (error) {
        result.failed += 1;
        advance += 1;
        this.logger.warn('Failed to delete expired thread', {
          orgId,
          threadId: ref.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    return advance;
  }

  private async deleteThread(
    orgId: UUID,
    ref: ExpiredThreadRef,
  ): Promise<void> {
    // DeleteThreadUseCase reads the owner/org from CLS and verifies ownership,
    // so a per-thread context is established for the background job.
    await this.contextService.run(async () => {
      this.contextService.set('orgId', orgId);
      this.contextService.set('userId', ref.userId);
      await this.deleteThreadUseCase.execute(new DeleteThreadCommand(ref.id));
    });
  }
}
