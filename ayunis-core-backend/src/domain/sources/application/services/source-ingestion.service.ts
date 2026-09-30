import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import type { PreparedTextSourceContent } from 'src/domain/sources/application/models/prepared-text-source-content';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { TextSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { SourceContentReplacementService } from './source-content-replacement.service';
import { SourceProcessingHelper } from './source-processing-helper.service';
import type { TextSourceExtractor } from './text-source-extractor';

export interface IngestionFailureOutcome {
  /** No further attempt will run, so the source must be settled as FAILED. */
  final: boolean;
  /** What to rethrow, or null to end the attempt without an error. */
  rethrow: Error | null;
}

export interface TextSourceIngestionRun<TInput> {
  sourceId: UUID;
  orgId: UUID;
  extractor: TextSourceExtractor<TInput>;
  input: TInput;
  /** Supplied by the queue, which alone knows whether a retry follows. */
  classifyFailure: (error: unknown) => IngestionFailureOutcome;
}

/**
 * Runs one ingestion attempt of a PROCESSING text source: claim, extract,
 * embed, commit the content against a fresh read, mark ready — or settle
 * the source as FAILED once no retry follows.
 */
@Injectable()
export class SourceIngestionService {
  private readonly logger = new Logger(SourceIngestionService.name);

  constructor(
    private readonly sourceRepository: SourceRepository,
    private readonly contentReplacement: SourceContentReplacementService,
    private readonly helper: SourceProcessingHelper,
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
      if (final) {
        await this.helper.markFailed(sourceId, error);
        await this.helper.cleanupIndex(sourceId);
      }
      if (rethrow) throw rethrow;
    } finally {
      if (settled) await extractor.release?.(input);
    }
  }

  private async runAttempt<TInput>(
    run: TextSourceIngestionRun<TInput>,
  ): Promise<void> {
    const { sourceId, orgId, extractor, input } = run;
    if (!(await this.claim(sourceId))) return;

    const extracted = await extractor.extract(input);
    const content = await this.contentReplacement.prepare({
      sourceId,
      orgId,
      text: extracted.text,
      chunks: extracted.chunks,
    });
    if (!(await this.commit(sourceId, extracted.name, content))) return;
    await this.markReady(sourceId);

    this.logger.log(
      { sourceId, chunks: extracted.chunks.length },
      'Ingestion complete',
    );
  }

  private async claim(sourceId: UUID): Promise<boolean> {
    const source = await this.sourceRepository.findById(sourceId);
    if (source?.status !== SourceStatus.PROCESSING) {
      this.logger.warn(
        { sourceId, found: !!source },
        'Source missing or no longer processing, skipping',
      );
      return false;
    }
    if (!(source instanceof TextSource)) {
      throw new Error(`Source ${sourceId} is not a TextSource`);
    }

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
      source.status !== SourceStatus.PROCESSING
    ) {
      this.logger.warn(
        { sourceId, found: !!source },
        'Source deleted or status changed mid-ingestion',
      );
      return false;
    }

    if (name) source.name = name;
    if (await this.contentReplacement.commit(source, content)) return true;

    this.logger.warn({ sourceId }, 'Source deleted before commit, skipping');
    return false;
  }

  private async markReady(sourceId: UUID): Promise<void> {
    const updated = await this.sourceRepository.updateStatusConditionally(
      sourceId,
      SourceStatus.PROCESSING,
      SourceStatus.READY,
      { processingError: null },
    );
    if (!updated) {
      this.logger.warn(
        { sourceId },
        'Conditional update to READY failed — source was deleted or status changed',
      );
      await this.helper.cleanupIndex(sourceId);
    }
  }
}
