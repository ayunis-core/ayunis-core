import { Injectable, Logger } from '@nestjs/common';
import { InternetSearchHandler } from '../../ports/internet-search.handler';
import { InternetSearchResult } from '../../../domain/internet-search-result.entity';
import { SearchWebCommand } from './search-web.command';

@Injectable()
export class SearchWebUseCase {
  private readonly logger = new Logger(SearchWebUseCase.name);

  constructor(private readonly internetSearchHandler: InternetSearchHandler) {}

  async execute(command: SearchWebCommand): Promise<InternetSearchResult[]> {
    this.logger.debug(`Searching web for: ${command.query}`);

    return this.internetSearchHandler.search(command.query);
  }
}
