import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
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

  async execute(
    command: UpdatePiiWhitelistCommand,
  ): Promise<AnonymizationWhitelistEntry[]> {
    this.logger.debug('Updating PII whitelist', {
      orgId: command.orgId,
      entryCount: command.entries.length,
    });

    try {
      this.validateEntries(command.entries);
      const entities = command.entries.map((entry) =>
        this.toEntity(command.orgId, entry),
      );
      return await this.repository.replaceForOrg(command.orgId, entities);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;

      this.logger.error('Failed to update PII whitelist', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId: command.orgId,
      });

      throw new UnexpectedAnonymizationSettingsError('update', {
        orgId: command.orgId,
        ...(error instanceof Error && { originalError: error.message }),
      });
    }
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
