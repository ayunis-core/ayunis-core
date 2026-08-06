import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { GlobalAnonymizationWhitelistRepository } from '../../ports/global-anonymization-whitelist.repository';
import { UnexpectedGlobalAnonymizationWhitelistError } from '../../anonymization-settings.errors';
import type { GlobalAnonymizationWhitelistWord } from 'src/domain/anonymization-settings/domain/global-anonymization-whitelist-word.entity';

@Injectable()
export class GetGlobalPiiWhitelistUseCase {
  private readonly logger = new Logger(GetGlobalPiiWhitelistUseCase.name);

  constructor(
    private readonly repository: GlobalAnonymizationWhitelistRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedGlobalAnonymizationWhitelistError)
  async execute(): Promise<GlobalAnonymizationWhitelistWord[]> {
    this.logger.debug('Getting global PII whitelist');

    return await this.repository.findAll();
  }
}
