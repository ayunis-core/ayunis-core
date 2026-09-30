import type { SourceSubtype } from 'src/domain/sources/application/models/due-source-reindex';
import type { SourceReindexHandler } from './source-reindex-handler';

export class SourceReindexHandlerRegistry {
  private readonly handlers = new Map<SourceSubtype, SourceReindexHandler>();

  constructor(handlers: SourceReindexHandler[]) {
    for (const handler of handlers) this.handlers.set(handler.subtype, handler);
  }

  find(subtype: SourceSubtype): SourceReindexHandler | undefined {
    return this.handlers.get(subtype);
  }
}
