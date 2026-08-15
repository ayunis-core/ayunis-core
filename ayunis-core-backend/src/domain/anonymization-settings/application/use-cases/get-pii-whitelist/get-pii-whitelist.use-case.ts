import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApplicationError } from 'src/common/errors/base.error';
import { AnonymizationWhitelistRepository } from '../../ports/anonymization-whitelist.repository';
import { UnexpectedAnonymizationSettingsError } from '../../anonymization-settings.errors';
import type { GetPiiWhitelistQuery } from './get-pii-whitelist.query';
import type { AnonymizationWhitelistEntry } from 'src/domain/anonymization-settings/domain/anonymization-whitelist-entry.entity';

@Injectable()
export class GetPiiWhitelistUseCase {
  constructor(
    @InjectPinoLogger(GetPiiWhitelistUseCase.name)
    private readonly logger: PinoLogger,
    private readonly repository: AnonymizationWhitelistRepository,
  ) {}

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
