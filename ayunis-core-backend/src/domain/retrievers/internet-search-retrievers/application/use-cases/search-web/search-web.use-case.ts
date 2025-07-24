import { Injectable, Logger } from '@nestjs/common';
import { InternetSearchHandler } from '../../ports/internet-search.handler';
import { InternetSearchResult } from '../../../domain/internet-search-result.entity';
import { SearchWebCommand } from './search-web.command';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedInternetSearchError } from '../../internet-search.errors';

@Injectable()
export class SearchWebUseCase {
  private readonly logger = new Logger(SearchWebUseCase.name);

  constructor(private readonly internetSearchHandler: InternetSearchHandler) {}

  async execute(command: SearchWebCommand): Promise<InternetSearchResult[]> {
    try {
      this.logger.debug(`Searching web for: ${command.query}`);

      return this.internetSearchHandler.search(command.query);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(
        `Unexpected error searching web for: ${command.query}`,
        error,
      );
      throw new UnexpectedInternetSearchError(error as Error);
    }
  }
}
