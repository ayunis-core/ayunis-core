import { Injectable, Logger } from '@nestjs/common';
import { UrlRetrieverResult } from '../../../domain/url-retriever-result.entity';
import { RetrieveUrlCommand } from './retrieve-url.command';
import { UrlRetrieverHandler } from '../../ports/url-retriever.handler';
import {
  UrlRetrieverProviderNotAvailableError,
  UrlRetrieverError,
} from '../../url-retriever.errors';

@Injectable()
export class RetrieveUrlUseCase {
  private readonly logger = new Logger(RetrieveUrlUseCase.name);

  constructor(private readonly handler: UrlRetrieverHandler) {}

  async execute(command: RetrieveUrlCommand): Promise<UrlRetrieverResult> {
    this.logger.debug(`Retrieving URL: ${command.url}`);

    try {
      return await this.handler.retrieveUrl({
        url: command.url,
        options: command.options,
      });
    } catch (error) {
      // Just rethrow if it's already a domain error
      if (error instanceof UrlRetrieverError) {
        throw error;
      }

      // Otherwise log and convert to appropriate domain error
      this.logger.error(
        `URL retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : 'Unknown error',
      );

      throw new UrlRetrieverProviderNotAvailableError(
        this.handler.constructor.name,
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          url: command.url,
        },
      );
    }
  }
}
