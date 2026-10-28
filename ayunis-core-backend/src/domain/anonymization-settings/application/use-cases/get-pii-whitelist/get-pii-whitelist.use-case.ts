import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { AnonymizationWhitelistRepository } from 'src/domain/anonymization-settings/application/ports/anonymization-whitelist.repository';
import { UnexpectedAnonymizationSettingsError } from 'src/domain/anonymization-settings/application/anonymization-settings.errors';
import type { GetPiiWhitelistQuery } from './get-pii-whitelist.query';
import type { AnonymizationWhitelistEntry } from 'src/domain/anonymization-settings/domain/anonymization-whitelist-entry.entity';

@Injectable()
export class GetPiiWhitelistUseCase {
  private readonly logger = new Logger(GetPiiWhitelistUseCase.name);

  constructor(private readonly repository: AnonymizationWhitelistRepository) {}

  async execute(
    query: GetPiiWhitelistQuery,
  ): Promise<AnonymizationWhitelistEntry[]> {
    this.logger.debug({ orgId: query.orgId }, 'Getting PII whitelist');

    try {
      return await this.repository.findByOrgId(query.orgId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;

      this.logger.error(
        {
          err: error as Error,
          orgId: query.orgId,
        },
        'Failed to get PII whitelist',
      );

      throw new UnexpectedAnonymizationSettingsError('get', {
        orgId: query.orgId,
        ...(error instanceof Error && { originalError: error.message }),
      });
    }
  }
}
