import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { GlobalAnonymizationWhitelistRepository } from '../../ports/global-anonymization-whitelist.repository';
import {
  DuplicateGlobalWhitelistWordError,
  EmptyGlobalWhitelistWordError,
  UnexpectedGlobalAnonymizationWhitelistError,
} from '../../anonymization-settings.errors';
import { GlobalAnonymizationWhitelistWord } from 'src/domain/anonymization-settings/domain/global-anonymization-whitelist-word.entity';
import type { AddGlobalPiiWhitelistWordCommand } from './add-global-pii-whitelist-word.command';

@Injectable()
export class AddGlobalPiiWhitelistWordUseCase {
  private readonly logger = new Logger(AddGlobalPiiWhitelistWordUseCase.name);

  constructor(
    private readonly repository: GlobalAnonymizationWhitelistRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedGlobalAnonymizationWhitelistError)
  async execute(
    command: AddGlobalPiiWhitelistWordCommand,
  ): Promise<GlobalAnonymizationWhitelistWord> {
    this.logger.log('Adding global PII whitelist word', {
      category: command.category,
    });

    const word = command.word.trim();
    if (word.length === 0) {
      throw new EmptyGlobalWhitelistWordError({ category: command.category });
    }

    const existing = await this.repository.findByCategoryAndWord(
      command.category,
      word,
    );
    if (existing) {
      throw new DuplicateGlobalWhitelistWordError(command.category, word);
    }

    return await this.repository.create(
      new GlobalAnonymizationWhitelistWord({
        category: command.category,
        word,
        createdByUserId: command.createdByUserId,
      }),
    );
  }
}
