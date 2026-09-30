import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { GlobalAnonymizationWhitelistRepository } from 'src/domain/anonymization-settings/application/ports/global-anonymization-whitelist.repository';
import {
  EmptyGlobalWhitelistWordError,
  UnexpectedGlobalAnonymizationWhitelistError,
} from 'src/domain/anonymization-settings/application/anonymization-settings.errors';
import { GlobalAnonymizationWhitelistWord } from 'src/domain/anonymization-settings/domain/global-anonymization-whitelist-word.entity';
import type { AddGlobalPiiWhitelistWordsCommand } from './add-global-pii-whitelist-words.command';
import type { AddGlobalPiiWhitelistWordsResult } from './add-global-pii-whitelist-words.result';

@Injectable()
export class AddGlobalPiiWhitelistWordsUseCase {
  private readonly logger = new Logger(AddGlobalPiiWhitelistWordsUseCase.name);

  constructor(
    private readonly repository: GlobalAnonymizationWhitelistRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedGlobalAnonymizationWhitelistError)
  async execute(
    command: AddGlobalPiiWhitelistWordsCommand,
  ): Promise<AddGlobalPiiWhitelistWordsResult> {
    this.logger.log(
      {
        category: command.category,
        wordCount: command.words.length,
      },
      'Adding global PII whitelist words',
    );

    const words = this.normalize(command.words);
    if (words.length === 0) {
      throw new EmptyGlobalWhitelistWordError({ category: command.category });
    }

    const added = await this.repository.createMany(
      words.map(
        (word) =>
          new GlobalAnonymizationWhitelistWord({
            category: command.category,
            word,
            createdByUserId: command.createdByUserId,
          }),
      ),
    );

    const addedWords = new Set(added.map((word) => word.word.toLowerCase()));
    return {
      added,
      duplicates: words.filter((word) => !addedWords.has(word.toLowerCase())),
    };
  }

  private normalize(words: string[]): string[] {
    const seen = new Set<string>();
    const normalized: string[] = [];

    for (const candidate of words) {
      const word = candidate.trim();
      const key = word.toLowerCase();
      if (word.length === 0 || seen.has(key)) {
        continue;
      }
      seen.add(key);
      normalized.push(word);
    }

    return normalized;
  }
}
