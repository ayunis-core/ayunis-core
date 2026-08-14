import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InternetSearchHandler } from '../../ports/internet-search.handler';
import { InternetSearchResult } from 'src/domain/retrievers/internet-search-retrievers/domain/internet-search-result.entity';
import { SearchWebCommand } from './search-web.command';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedInternetSearchError } from '../../internet-search.errors';

@Injectable()
export class SearchWebUseCase {
  constructor(
    @InjectPinoLogger(SearchWebUseCase.name)
    private readonly logger: PinoLogger,
    private readonly internetSearchHandler: InternetSearchHandler,
  ) {}

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
