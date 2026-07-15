import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { InternetSearchHandler } from '../../ports/internet-search.handler';
import { InternetSearchResult } from '../../../domain/internet-search-result.entity';
import { SearchWebCommand } from './search-web.command';
import { UnexpectedInternetSearchError } from '../../internet-search.errors';

@Injectable()
export class SearchWebUseCase {
  private readonly logger = new Logger(SearchWebUseCase.name);

  constructor(private readonly internetSearchHandler: InternetSearchHandler) {}

  @HandleUnexpectedErrors(UnexpectedInternetSearchError)
  async execute(command: SearchWebCommand): Promise<InternetSearchResult[]> {
    this.logger.debug(`Searching web for: ${command.query}`);

    return this.internetSearchHandler.search(command.query);
  }
}
