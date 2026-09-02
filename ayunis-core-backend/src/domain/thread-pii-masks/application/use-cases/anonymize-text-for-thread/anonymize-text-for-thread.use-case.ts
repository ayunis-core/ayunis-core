import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApplicationError } from 'src/common/errors/base.error';
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
import { UnexpectedThreadPiiMasksError } from 'src/domain/thread-pii-masks/application/thread-pii-masks.errors';
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
 * unchanged so callers keep their fail-safe handling.
 */
@Injectable()
export class AnonymizeTextForThreadUseCase {
  constructor(
    @InjectPinoLogger(AnonymizeTextForThreadUseCase.name)
    private readonly logger: PinoLogger,
    private readonly repository: ThreadPiiMaskRepository,
    private readonly getPiiWhitelistUseCase: GetPiiWhitelistUseCase,
    private readonly getGlobalPiiWhitelistUseCase: GetGlobalPiiWhitelistUseCase,
    private readonly anonymizeTextUseCase: AnonymizeTextUseCase,
  ) {}

  async execute(
    command: AnonymizeTextForThreadCommand,
  ): Promise<ThreadAnonymizationResult> {
    const logContext = { orgId: command.orgId, threadId: command.threadId };
    this.logger.debug(logContext, 'Anonymizing text for thread');

    try {
      const entries = await this.getPiiWhitelistUseCase.execute(
        new GetPiiWhitelistQuery(command.orgId),
      );
      const globalWords = await this.getGlobalPiiWhitelistUseCase.execute();
      const existing = await this.repository.findByThreadId(command.threadId);
      const whitelist = [
        ...entries.map(
          (entry) => new PiiWhitelistEntry(entry.category, entry.pattern),
        ),
        ...globalWords.map(toWhitelistEntry),
        // Manually unmasked values are exempt for this thread; their rows stay
        // in `existing` so index numbering and historical tokens remain stable.
        ...existing
          .filter((mask) => mask.unmasked)
          .map(toUnmaskedWhitelistEntry),
      ];

      const result = await this.anonymizeTextUseCase.execute(
        new AnonymizeTextCommand(
          command.text,
          undefined,
          whitelist,
          existing.map((mask) => mask.toPiiMask()),
        ),
      );

      const created = result.newMasks.map((mask) =>
        ThreadPiiMask.fromPiiMask(command.threadId, mask),
      );
      if (created.length > 0) {
        await this.repository.saveMany(created);
      }

      return { ...result, masks: [...existing, ...created] };
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        { err: error as Error, ...logContext },
        'Failed to anonymize text for thread',
      );
      throw new UnexpectedThreadPiiMasksError('anonymize', {
        orgId: command.orgId,
        threadId: command.threadId,
        ...(error instanceof Error && { originalError: error.message }),
      });
    }
  }
}
