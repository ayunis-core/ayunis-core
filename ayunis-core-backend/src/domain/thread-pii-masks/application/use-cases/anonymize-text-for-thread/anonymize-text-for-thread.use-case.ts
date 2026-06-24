import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { AnonymizeTextUseCase } from 'src/common/anonymization/application/use-cases/anonymize-text/anonymize-text.use-case';
import { AnonymizeTextCommand } from 'src/common/anonymization/application/use-cases/anonymize-text/anonymize-text.command';
import { PiiWhitelistEntry } from 'src/common/anonymization/domain/pii-whitelist-entry';
import type { AnonymizationResult } from 'src/common/anonymization/application/ports/anonymization.port';
import { GetPiiWhitelistUseCase } from 'src/domain/anonymization-settings/application/use-cases/get-pii-whitelist/get-pii-whitelist.use-case';
import { GetPiiWhitelistQuery } from 'src/domain/anonymization-settings/application/use-cases/get-pii-whitelist/get-pii-whitelist.query';
import { ThreadPiiMaskRepository } from '../../ports/thread-pii-mask.repository';
import { ThreadPiiMask } from '../../../domain/thread-pii-mask.entity';
import { UnexpectedThreadPiiMasksError } from '../../thread-pii-masks.errors';
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
  private readonly logger = new Logger(AnonymizeTextForThreadUseCase.name);

  constructor(
    private readonly repository: ThreadPiiMaskRepository,
    private readonly getPiiWhitelistUseCase: GetPiiWhitelistUseCase,
    private readonly anonymizeTextUseCase: AnonymizeTextUseCase,
  ) {}

  async execute(
    command: AnonymizeTextForThreadCommand,
  ): Promise<ThreadAnonymizationResult> {
    this.logger.debug('Anonymizing text for thread', {
      orgId: command.orgId,
      threadId: command.threadId,
    });

    try {
      const entries = await this.getPiiWhitelistUseCase.execute(
        new GetPiiWhitelistQuery(command.orgId),
      );
      const whitelist = entries.map(
        (entry) => new PiiWhitelistEntry(entry.category, entry.pattern),
      );
      const existing = await this.repository.findByThreadId(command.threadId);

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

      this.logger.error('Failed to anonymize text for thread', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId: command.orgId,
        threadId: command.threadId,
      });

      throw new UnexpectedThreadPiiMasksError('anonymize', {
        orgId: command.orgId,
        threadId: command.threadId,
        ...(error instanceof Error && { originalError: error.message }),
      });
    }
  }
}
