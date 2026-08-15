import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { GlobalAnonymizationWhitelistRepository } from '../../ports/global-anonymization-whitelist.repository';
import {
  GlobalWhitelistWordNotFoundError,
  UnexpectedGlobalAnonymizationWhitelistError,
} from '../../anonymization-settings.errors';
import type { DeleteGlobalPiiWhitelistWordCommand } from './delete-global-pii-whitelist-word.command';

@Injectable()
export class DeleteGlobalPiiWhitelistWordUseCase {
  constructor(
    @InjectPinoLogger(DeleteGlobalPiiWhitelistWordUseCase.name)
    private readonly logger: PinoLogger,
    private readonly repository: GlobalAnonymizationWhitelistRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedGlobalAnonymizationWhitelistError)
  async execute(command: DeleteGlobalPiiWhitelistWordCommand): Promise<void> {
    this.logger.info(
      {
        wordId: command.wordId,
      },
      'Deleting global PII whitelist word',
    );

    const deleted = await this.repository.delete(command.wordId);
    if (!deleted) {
      throw new GlobalWhitelistWordNotFoundError(command.wordId);
    }
  }
}
