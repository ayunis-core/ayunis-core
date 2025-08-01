import { Injectable } from '@nestjs/common';
import { FileRetrieverHandler } from './ports/file-retriever.handler';
import { FileRetrieverProviderNotAvailableError } from './file-retriever.errors';
import { FileRetrieverType } from '../domain/value-objects/file-retriever-type.enum';

@Injectable()
export class FileRetrieverRegistry {
  private readonly handlers = new Map<
    FileRetrieverType,
    FileRetrieverHandler
  >();

  registerHandler(
    provider: FileRetrieverType,
    handler: FileRetrieverHandler,
  ): void {
    this.handlers.set(provider, handler);
  }

  getHandler(provider: FileRetrieverType): FileRetrieverHandler {
    const handler = this.handlers.get(provider);
    if (!handler) {
      throw new FileRetrieverProviderNotAvailableError(provider);
    }
    return handler;
  }

  hasHandler(provider: FileRetrieverType): boolean {
    return this.handlers.has(provider);
  }

  getSupportedProviders(): FileRetrieverType[] {
    return Array.from(this.handlers.keys());
  }
}
