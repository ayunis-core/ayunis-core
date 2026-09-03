import { Injectable, Logger } from '@nestjs/common';
import { InternetSearchHandler } from 'src/domain/retrievers/internet-search-retrievers/application/ports/internet-search.handler';
import { InternetSearchResult } from 'src/domain/retrievers/internet-search-retrievers/domain/internet-search-result.entity';
import { SearchWebCommand } from './search-web.command';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedInternetSearchError } from 'src/domain/retrievers/internet-search-retrievers/application/internet-search.errors';

@Injectable()
export class SearchWebUseCase {
  private readonly logger = new Logger(SearchWebUseCase.name);

  constructor(private readonly internetSearchHandler: InternetSearchHandler) {}

  async execute(command: SearchWebCommand): Promise<InternetSearchResult[]> {
    try {
      this.logger.debug({ input: command.query }, 'Searching web');

      return this.internetSearchHandler.search(command.query);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(
        { err: error as Error, input: command.query },
        'Unexpected error searching web',
      );
      throw new UnexpectedInternetSearchError(error as Error);
    }
  }
}
