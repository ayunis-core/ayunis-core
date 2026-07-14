import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { AnonymizationWhitelistRepository } from '../../ports/anonymization-whitelist.repository';
import {
  DuplicateCategoryError,
  InvalidPatternError,
  UnexpectedAnonymizationSettingsError,
} from '../../anonymization-settings.errors';
import type {
  UpdatePiiWhitelistCommand,
  UpdatePiiWhitelistEntryInput,
} from './update-pii-whitelist.command';
import { AnonymizationWhitelistEntry } from '../../../domain/anonymization-whitelist-entry.entity';
import { validatePattern } from '../../../domain/validate-pattern';
import type { UUID } from 'crypto';

@Injectable()
export class UpdatePiiWhitelistUseCase {
  private readonly logger = new Logger(UpdatePiiWhitelistUseCase.name);

  constructor(private readonly repository: AnonymizationWhitelistRepository) {}

  @HandleUnexpectedErrors(UnexpectedAnonymizationSettingsError)
  async execute(
    command: UpdatePiiWhitelistCommand,
  ): Promise<AnonymizationWhitelistEntry[]> {
    this.logger.debug('Updating PII whitelist', {
      orgId: command.orgId,
      entryCount: command.entries.length,
    });

    this.validateEntries(command.entries);
    const entities = command.entries.map((entry) =>
      this.toEntity(command.orgId, entry),
    );
    return this.repository.replaceForOrg(command.orgId, entities);
  }

  private validateEntries(entries: UpdatePiiWhitelistEntryInput[]): void {
    const seen = new Set<string>();
    for (const entry of entries) {
      if (seen.has(entry.category)) {
        throw new DuplicateCategoryError(entry.category);
      }
      seen.add(entry.category);

      if (entry.pattern !== null) {
        const validationError = validatePattern(entry.pattern);
        if (validationError) {
          throw new InvalidPatternError(entry.category, validationError);
        }
      }
    }
  }

  private toEntity(
    orgId: UUID,
    entry: UpdatePiiWhitelistEntryInput,
  ): AnonymizationWhitelistEntry {
    return new AnonymizationWhitelistEntry({
      orgId,
      category: entry.category,
      pattern: entry.pattern,
    });
  }
}
