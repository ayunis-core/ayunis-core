import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import type { PreparedTextSourceContent } from 'src/domain/sources/application/models/prepared-text-source-content';
import { SourceIngestionKind } from 'src/domain/sources/application/models/source-ingestion-kind.enum';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { TextSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { classifySourceProcessingError } from './classify-source-processing-error';
import { SourceContentReplacementService } from './source-content-replacement.service';
import { SourceProcessingHelper } from './source-processing-helper.service';
import { SourceContentDegradationGuard } from './source-content-degradation-guard.service';
import type { TextSourceExtractor } from './text-source-extractor';

export interface IngestionFailureOutcome {
  /** No further attempt will run, so the run's failure must be settled. */
  final: boolean;
  /** What to rethrow, or null to end the attempt without an error. */
  rethrow: Error | null;
}

export interface TextSourceIngestionRun<TInput> {
  sourceId: UUID;
  orgId: UUID;
  kind: SourceIngestionKind;
  extractor: TextSourceExtractor<TInput>;
  input: TInput;
  /** Supplied by the queue, which alone knows whether a retry follows. */
  classifyFailure: (error: unknown) => IngestionFailureOutcome;
}

/**
 * Runs one ingestion attempt of a text source: claim, extract, embed, commit
 * the content against a fresh read. An initial run claims a PROCESSING
 * source and settles it as READY or FAILED. A re-index claims a READY source
 * and never changes its status: the commit swaps content atomically, and a
 * failed run is only recorded, leaving the previous content searchable.
 */
@Injectable()
export class SourceIngestionService {
  private readonly logger = new Logger(SourceIngestionService.name);

  constructor(
    private readonly sourceRepository: SourceRepository,
    private readonly contentReplacement: SourceContentReplacementService,
    private readonly helper: SourceProcessingHelper,
    private readonly degradationGuard: SourceContentDegradationGuard,
  ) {}

  async ingest<TInput>(run: TextSourceIngestionRun<TInput>): Promise<void> {
    const { sourceId, extractor, input } = run;
    let settled = true;
    try {
      await this.runAttempt(run);
    } catch (error) {
      this.logger.error({ sourceId, err: error as Error }, 'Ingestion failed');
      const { final, rethrow } = run.classifyFailure(error);
      settled = final;
      if (final) await this.settleFailure(run.kind, sourceId, error);
      if (rethrow) throw rethrow;
    } finally {
      if (settled) await extractor.release?.(input);
    }
  }

  private async runAttempt<TInput>(
    run: TextSourceIngestionRun<TInput>,
  ): Promise<void> {
    const { sourceId, orgId, kind, extractor, input } = run;
    if (!(await this.claim(sourceId, kind))) return;

    const extracted = await extractor.extract(input);
    if (kind === SourceIngestionKind.REINDEX) {
      await this.degradationGuard.assertNotDegraded(sourceId, extracted.chunks);
    }
    const content = await this.contentReplacement.prepare({
      sourceId,
      orgId,
      text: extracted.text,
      chunks: extracted.chunks,
    });
    if (!(await this.commit(sourceId, kind, extracted.name, content))) return;
    if (kind === SourceIngestionKind.INITIAL) await this.markReady(sourceId);

    this.logger.log(
      { sourceId, kind, chunks: extracted.chunks.length },
      'Ingestion complete',
    );
  }

  private async claim(
    sourceId: UUID,
    kind: SourceIngestionKind,
  ): Promise<boolean> {
    const source = await this.sourceRepository.findById(sourceId);
    if (source?.status !== claimableStatus(kind)) {
      this.logger.warn(
        { sourceId, kind, found: !!source, status: source?.status },
        'Source missing or not in the status this run claims, skipping',
      );
      return false;
    }
    if (!(source instanceof TextSource)) {
      throw new Error(`Source ${sourceId} is not a TextSource`);
    }
    // A re-index keeps the source READY, so the stale-processing cleanup —
    // and with it the heartbeat — never applies to it.
    if (kind === SourceIngestionKind.REINDEX) return true;

    // Resets processingStartedAt on every attempt so the stale-cleanup cron
    // doesn't race with retries of long-running jobs. UPDATE-only: saving
    // this copy would overwrite concurrent changes to the row.
    if (!(await this.sourceRepository.refreshProcessingHeartbeat(sourceId))) {
      this.logger.warn({ sourceId }, 'Source deleted mid-load, skipping');
      return false;
    }
    return true;
  }

  /** Returns false, having written nothing, when the source is gone. */
  private async commit(
    sourceId: UUID,
    kind: SourceIngestionKind,
    name: string | undefined,
    content: PreparedTextSourceContent,
  ): Promise<boolean> {
    // Save against a fresh read, never the claimed copy: the
    // Add*ToKnowledgeBase use cases assign the knowledge base only after
    // enqueueing. The re-check and the commit's own row lock keep a deleted
    // source from being resurrected.
    const source = await this.sourceRepository.findById(sourceId);
    if (
      !(source instanceof TextSource) ||
      source.status !== claimableStatus(kind)
    ) {
      this.logger.warn(
        { sourceId, found: !!source },
        'Source deleted or status changed mid-ingestion',
      );
      return false;
    }

    if (name) source.name = name;
    // Written with the content, so a re-index's new content and its run
    // state go live together. An initial run stamps it with the READY flip.
    if (kind === SourceIngestionKind.REINDEX) source.recordIndexed(new Date());
    if (await this.contentReplacement.commit(source, content)) return true;

    this.logger.warn({ sourceId }, 'Source deleted before commit, skipping');
    return false;
  }

  private async markReady(sourceId: UUID): Promise<void> {
    const updated = await this.sourceRepository.updateStatusConditionally(
      sourceId,
      SourceStatus.PROCESSING,
      SourceStatus.READY,
      { processingError: null, lastIndexedAt: new Date() },
    );
    if (!updated) {
      this.logger.warn(
        { sourceId },
        'Conditional update to READY failed — source was deleted or status changed',
      );
      await this.helper.cleanupIndex(sourceId);
    }
  }

  private async settleFailure(
    kind: SourceIngestionKind,
    sourceId: UUID,
    error: unknown,
  ): Promise<void> {
    if (kind === SourceIngestionKind.REINDEX) {
      await this.recordRunFailure(sourceId, error);
      return;
    }
    await this.helper.markFailed(sourceId, error);
    // The commit is atomic, so a failure before or inside it leaves no index
    // entries; this clears the ones a commit left when marking the source
    // READY failed afterwards, so a FAILED source is never searchable.
    await this.helper.cleanupIndex(sourceId);
  }

  private async recordRunFailure(
    sourceId: UUID,
    error: unknown,
  ): Promise<void> {
    try {
      const recorded = await this.sourceRepository.recordRunFailure(sourceId, {
        failedAt: new Date(),
        error:
          error instanceof Error ? error.message : 'Unknown processing error',
        errorCode: classifySourceProcessingError(error),
      });
      if (!recorded) {
        this.logger.warn(
          { sourceId },
          'Source deleted or no longer ready, run failure not recorded',
        );
      }
    } catch (err) {
      this.logger.error(
        { sourceId, err: err as Error },
        'Failed to record re-index failure',
      );
    }
  }
}

function claimableStatus(kind: SourceIngestionKind): SourceStatus {
  return kind === SourceIngestionKind.REINDEX
    ? SourceStatus.READY
    : SourceStatus.PROCESSING;
}
