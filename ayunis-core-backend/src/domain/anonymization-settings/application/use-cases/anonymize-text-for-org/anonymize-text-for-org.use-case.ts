import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApplicationError } from 'src/common/errors/base.error';
import { AnonymizeTextUseCase } from 'src/common/anonymization/application/use-cases/anonymize-text/anonymize-text.use-case';
import { AnonymizeTextCommand } from 'src/common/anonymization/application/use-cases/anonymize-text/anonymize-text.command';
import { PiiWhitelistEntry } from 'src/common/anonymization/domain/pii-whitelist-entry';
import type { AnonymizationResult } from 'src/common/anonymization/application/ports/anonymization.port';
import { AnonymizationWhitelistRepository } from '../../ports/anonymization-whitelist.repository';
import { UnexpectedAnonymizationSettingsError } from '../../anonymization-settings.errors';
import { GetGlobalPiiWhitelistUseCase } from '../get-global-pii-whitelist/get-global-pii-whitelist.use-case';
import { toWhitelistEntry } from '../../../domain/global-word-whitelist-entry';
import type { AnonymizeTextForOrgCommand } from './anonymize-text-for-org.command';

/**
 * Anonymizes text while honoring the org's PII whitelist. Errors from the
 * anonymization engine (AnonymizationFailedError) propagate unchanged so
 * callers keep their fail-safe handling.
 */
@Injectable()
export class AnonymizeTextForOrgUseCase {
  constructor(
    @InjectPinoLogger(AnonymizeTextForOrgUseCase.name)
    private readonly logger: PinoLogger,
    private readonly repository: AnonymizationWhitelistRepository,
    private readonly getGlobalPiiWhitelistUseCase: GetGlobalPiiWhitelistUseCase,
    private readonly anonymizeTextUseCase: AnonymizeTextUseCase,
  ) {}

  async execute(
    command: AnonymizeTextForOrgCommand,
  ): Promise<AnonymizationResult> {
    this.logger.debug({ orgId: command.orgId }, 'Anonymizing text for org');

    try {
      const entries = await this.repository.findByOrgId(command.orgId);
      const globalWords = await this.getGlobalPiiWhitelistUseCase.execute();
      const whitelist = [
        ...entries.map(
          (entry) => new PiiWhitelistEntry(entry.category, entry.pattern),
        ),
        ...globalWords.map(toWhitelistEntry),
      ];

      return await this.anonymizeTextUseCase.execute(
        new AnonymizeTextCommand(command.text, undefined, whitelist),
      );
    } catch (error) {
      if (error instanceof ApplicationError) throw error;

      this.logger.error(
        {
          err: error as Error,
          orgId: command.orgId,
        },
        'Failed to anonymize text for org',
      );

      throw new UnexpectedAnonymizationSettingsError('anonymize', {
        orgId: command.orgId,
        ...(error instanceof Error && { originalError: error.message }),
      });
    }
  }
}
