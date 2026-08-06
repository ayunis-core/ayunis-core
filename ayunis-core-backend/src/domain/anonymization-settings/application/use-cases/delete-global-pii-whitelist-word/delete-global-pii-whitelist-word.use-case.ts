import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { GlobalAnonymizationWhitelistRepository } from '../../ports/global-anonymization-whitelist.repository';
import {
  GlobalWhitelistWordNotFoundError,
  UnexpectedGlobalAnonymizationWhitelistError,
} from '../../anonymization-settings.errors';
import type { DeleteGlobalPiiWhitelistWordCommand } from './delete-global-pii-whitelist-word.command';

@Injectable()
export class DeleteGlobalPiiWhitelistWordUseCase {
  private readonly logger = new Logger(
    DeleteGlobalPiiWhitelistWordUseCase.name,
  );

  constructor(
    private readonly repository: GlobalAnonymizationWhitelistRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedGlobalAnonymizationWhitelistError)
  async execute(command: DeleteGlobalPiiWhitelistWordCommand): Promise<void> {
    this.logger.log('Deleting global PII whitelist word', {
      wordId: command.wordId,
    });

    const deleted = await this.repository.delete(command.wordId);
    if (!deleted) {
      throw new GlobalWhitelistWordNotFoundError(command.wordId);
    }
  }
}
