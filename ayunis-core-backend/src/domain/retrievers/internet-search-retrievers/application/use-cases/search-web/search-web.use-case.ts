import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { InternetSearchHandler } from 'src/domain/retrievers/internet-search-retrievers/application/ports/internet-search.handler';
import { InternetSearchResult } from 'src/domain/retrievers/internet-search-retrievers/domain/internet-search-result.entity';
import { SearchWebCommand } from './search-web.command';
import { UnexpectedInternetSearchError } from 'src/domain/retrievers/internet-search-retrievers/application/internet-search.errors';

@Injectable()
export class SearchWebUseCase {
  private readonly logger = new Logger(SearchWebUseCase.name);

  constructor(private readonly internetSearchHandler: InternetSearchHandler) {}

  @HandleUnexpectedErrors(UnexpectedInternetSearchError)
  async execute(command: SearchWebCommand): Promise<InternetSearchResult[]> {
    this.logger.debug({ input: command.query }, 'Searching web');
    const { query, signal, allowedDomains } = command;
    if (!allowedDomains) {
      return this.internetSearchHandler.search(query, signal);
    }
    const results = await this.internetSearchHandler.search(
      query,
      signal,
      allowedDomains.entries,
    );
    return results.filter((result) => allowedDomains.allowsUrl(result.url));
  }
}
