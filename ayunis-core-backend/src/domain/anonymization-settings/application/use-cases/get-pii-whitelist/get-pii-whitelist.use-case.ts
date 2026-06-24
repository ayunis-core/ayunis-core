import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { AnonymizationWhitelistRepository } from '../../ports/anonymization-whitelist.repository';
import { UnexpectedAnonymizationSettingsError } from '../../anonymization-settings.errors';
import type { GetPiiWhitelistQuery } from './get-pii-whitelist.query';
import type { AnonymizationWhitelistEntry } from '../../../domain/anonymization-whitelist-entry.entity';

@Injectable()
export class GetPiiWhitelistUseCase {
  private readonly logger = new Logger(GetPiiWhitelistUseCase.name);

  constructor(private readonly repository: AnonymizationWhitelistRepository) {}

  async execute(
    query: GetPiiWhitelistQuery,
  ): Promise<AnonymizationWhitelistEntry[]> {
    this.logger.debug('Getting PII whitelist', { orgId: query.orgId });

    try {
      return await this.repository.findByOrgId(query.orgId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;

      this.logger.error('Failed to get PII whitelist', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId: query.orgId,
      });

      throw new UnexpectedAnonymizationSettingsError('get', {
        orgId: query.orgId,
        ...(error instanceof Error && { originalError: error.message }),
      });
    }
  }
}
