import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { AnonymizeTextUseCase } from 'src/common/anonymization/application/use-cases/anonymize-text/anonymize-text.use-case';
import { AnonymizeTextCommand } from 'src/common/anonymization/application/use-cases/anonymize-text/anonymize-text.command';
import { PiiWhitelistEntry } from 'src/common/anonymization/domain/pii-whitelist-entry';
import type { AnonymizationResult } from 'src/common/anonymization/application/ports/anonymization.port';
import { AnonymizationWhitelistRepository } from '../../ports/anonymization-whitelist.repository';
import { UnexpectedAnonymizationSettingsError } from '../../anonymization-settings.errors';
import type { AnonymizeTextForOrgCommand } from './anonymize-text-for-org.command';

/**
 * Anonymizes text while honoring the org's PII whitelist. Errors from the
 * anonymization engine (AnonymizationFailedError) propagate unchanged so
 * callers keep their fail-safe handling.
 */
@Injectable()
export class AnonymizeTextForOrgUseCase {
  private readonly logger = new Logger(AnonymizeTextForOrgUseCase.name);

  constructor(
    private readonly repository: AnonymizationWhitelistRepository,
    private readonly anonymizeTextUseCase: AnonymizeTextUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAnonymizationSettingsError)
  async execute(
    command: AnonymizeTextForOrgCommand,
  ): Promise<AnonymizationResult> {
    this.logger.debug('Anonymizing text for org', { orgId: command.orgId });

    const entries = await this.repository.findByOrgId(command.orgId);
    const whitelist = entries.map(
      (entry) => new PiiWhitelistEntry(entry.category, entry.pattern),
    );

    return this.anonymizeTextUseCase.execute(
      new AnonymizeTextCommand(command.text, undefined, whitelist),
    );
  }
}
