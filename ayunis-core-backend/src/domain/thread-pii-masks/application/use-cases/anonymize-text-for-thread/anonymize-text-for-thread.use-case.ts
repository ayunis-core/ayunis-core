import { Injectable, Logger } from '@nestjs/common';
import { AnonymizeTextUseCase } from 'src/common/anonymization/application/use-cases/anonymize-text/anonymize-text.use-case';
import { AnonymizeTextCommand } from 'src/common/anonymization/application/use-cases/anonymize-text/anonymize-text.command';
import { PiiWhitelistEntry } from 'src/common/anonymization/domain/pii-whitelist-entry';
import type { AnonymizationResult } from 'src/common/anonymization/application/ports/anonymization.port';
import { GetPiiWhitelistUseCase } from 'src/domain/anonymization-settings/application/use-cases/get-pii-whitelist/get-pii-whitelist.use-case';
import { GetPiiWhitelistQuery } from 'src/domain/anonymization-settings/application/use-cases/get-pii-whitelist/get-pii-whitelist.query';
import { GetGlobalPiiWhitelistUseCase } from 'src/domain/anonymization-settings/application/use-cases/get-global-pii-whitelist/get-global-pii-whitelist.use-case';
import { toWhitelistEntry } from 'src/domain/anonymization-settings/domain/global-word-whitelist-entry';
import { ThreadPiiMaskRepository } from 'src/domain/thread-pii-masks/application/ports/thread-pii-mask.repository';
import { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';
import { toUnmaskedWhitelistEntry } from 'src/domain/thread-pii-masks/domain/unmasked-mask-whitelist';
import {
  ThreadPiiMaskAnonymizationError,
  type ThreadPiiMaskAnonymizationStage,
} from 'src/domain/thread-pii-masks/application/thread-pii-masks.errors';
import type { AnonymizeTextForThreadCommand } from './anonymize-text-for-thread.command';

export interface ThreadAnonymizationResult extends AnonymizationResult {
  /** The thread's full mask dictionary including masks created by this call. */
  masks: ThreadPiiMask[];
}

/**
 * Anonymizes text with stable `{{pii:CATEGORY_n}}` tokens scoped to one
 * thread, honoring the org's PII whitelist. New masks are persisted before
 * the result is returned, so anonymized text never circulates without its
 * dictionary entries. Engine failures (AnonymizationFailedError) propagate
 * unchanged so callers keep their fail-safe handling; lookup, build, and
 * persistence failures are wrapped in ThreadPiiMaskAnonymizationError.
 */
@Injectable()
export class AnonymizeTextForThreadUseCase {
  private readonly logger = new Logger(AnonymizeTextForThreadUseCase.name);

  constructor(
    private readonly repository: ThreadPiiMaskRepository,
    private readonly getPiiWhitelistUseCase: GetPiiWhitelistUseCase,
    private readonly getGlobalPiiWhitelistUseCase: GetGlobalPiiWhitelistUseCase,
    private readonly anonymizeTextUseCase: AnonymizeTextUseCase,
  ) {}

  async execute(
    command: AnonymizeTextForThreadCommand,
  ): Promise<ThreadAnonymizationResult> {
    const logContext = this.logContext(command);
    this.logger.debug(logContext, 'Anonymizing text for thread');

    const { entries, globalWords, existing } = await this.loadContext(
      command,
      logContext,
    );
    const whitelist = [
      ...entries.map(
        (entry) => new PiiWhitelistEntry(entry.category, entry.pattern),
      ),
      ...globalWords.map(toWhitelistEntry),
      // Keep manually unmasked rows in `existing` so historical mask tokens
      // stay stable while their current values remain exempt for this thread.
      ...existing.filter((mask) => mask.unmasked).map(toUnmaskedWhitelistEntry),
    ];
    const result = await this.anonymizeTextUseCase.execute(
      new AnonymizeTextCommand(
        command.text,
        undefined,
        whitelist,
        existing.map((mask) => mask.toPiiMask()),
      ),
    );
    const created = await this.runStage('new_masks_build', logContext, () =>
      result.newMasks.map((mask) =>
        ThreadPiiMask.fromPiiMask(command.threadId, mask),
      ),
    );
    if (created.length > 0) {
      await this.runStage(
        'new_masks_persistence',
        {
          ...logContext,
          existingMaskCount: existing.length,
          newMaskCount: created.length,
        },
        () => this.repository.saveMany(created),
      );
    }
    return { ...result, masks: [...existing, ...created] };
  }

  private async loadContext(
    command: AnonymizeTextForThreadCommand,
    logContext: Record<string, unknown>,
  ) {
    const entries = await this.runStage(
      'org_whitelist_lookup',
      logContext,
      () =>
        this.getPiiWhitelistUseCase.execute(
          new GetPiiWhitelistQuery(command.orgId),
        ),
    );
    const globalWords = await this.runStage(
      'global_whitelist_lookup',
      logContext,
      () => this.getGlobalPiiWhitelistUseCase.execute(),
    );
    const existing = await this.runStage(
      'existing_masks_lookup',
      logContext,
      () => this.repository.findByThreadId(command.threadId),
    );
    return { entries, globalWords, existing };
  }

  private logContext(command: AnonymizeTextForThreadCommand) {
    return {
      orgId: command.orgId,
      threadId: command.threadId,
      textLength: command.text.length,
    };
  }

  private async runStage<T>(
    stage: ThreadPiiMaskAnonymizationStage,
    metadata: Record<string, unknown>,
    operation: () => T | Promise<T>,
  ): Promise<T> {
    try {
      return await operation();
    } catch (cause) {
      const error = new ThreadPiiMaskAnonymizationError(stage, metadata, cause);
      this.logger.error(
        { errorCode: error.code, ...error.metadata },
        'Failed to anonymize text for thread',
      );
      throw error;
    }
  }
}
