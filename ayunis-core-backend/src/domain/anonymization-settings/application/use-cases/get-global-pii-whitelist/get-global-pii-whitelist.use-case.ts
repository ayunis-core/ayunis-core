import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { GlobalAnonymizationWhitelistRepository } from '../../ports/global-anonymization-whitelist.repository';
import { UnexpectedGlobalAnonymizationWhitelistError } from '../../anonymization-settings.errors';
import type { GlobalAnonymizationWhitelistWord } from 'src/domain/anonymization-settings/domain/global-anonymization-whitelist-word.entity';

@Injectable()
export class GetGlobalPiiWhitelistUseCase {
  constructor(
    @InjectPinoLogger(GetGlobalPiiWhitelistUseCase.name)
    private readonly logger: PinoLogger,
    private readonly repository: GlobalAnonymizationWhitelistRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedGlobalAnonymizationWhitelistError)
  async execute(): Promise<GlobalAnonymizationWhitelistWord[]> {
    this.logger.debug('Getting global PII whitelist');

    return await this.repository.findAll();
  }
}
