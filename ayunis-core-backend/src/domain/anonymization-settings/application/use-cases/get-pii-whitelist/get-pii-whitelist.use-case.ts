import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { AnonymizationWhitelistRepository } from '../../ports/anonymization-whitelist.repository';
import { UnexpectedAnonymizationSettingsError } from '../../anonymization-settings.errors';
import type { GetPiiWhitelistQuery } from './get-pii-whitelist.query';
import type { AnonymizationWhitelistEntry } from '../../../domain/anonymization-whitelist-entry.entity';

@Injectable()
export class GetPiiWhitelistUseCase {
  private readonly logger = new Logger(GetPiiWhitelistUseCase.name);

  constructor(private readonly repository: AnonymizationWhitelistRepository) {}

  @HandleUnexpectedErrors(UnexpectedAnonymizationSettingsError)
  async execute(
    query: GetPiiWhitelistQuery,
  ): Promise<AnonymizationWhitelistEntry[]> {
    this.logger.debug('Getting PII whitelist', { orgId: query.orgId });

    return this.repository.findByOrgId(query.orgId);
  }
}
