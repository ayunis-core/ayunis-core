import type { UUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { OparlChunkSource } from 'src/domain/oparl/domain/oparl-chunk-source.enum';
import type { OparlTextObject } from 'src/domain/oparl/application/models/oparl-document';
import {
  OparlDocumentsRepository,
  type OparlObjectChunks,
} from 'src/domain/oparl/application/ports/oparl-documents.repository';
import { OparlChunker } from './oparl-chunker.service';

const BATCH = 500;
const SOURCES: Array<OparlTextObject['source']> = [
  OparlChunkSource.PAPER,
  OparlChunkSource.MEETING,
  OparlChunkSource.AGENDA_ITEM,
];

function changed(entry: OparlObjectChunks): boolean {
  return entry.chunks.length > 0
    ? entry.hash !== entry.object.chunkedHash
    : entry.object.chunkedHash !== null;
}

/**
 * Chunks the text fields of a system's papers, meetings and agenda items;
 * an object whose text did not change keeps its chunks (and vectors).
 */
@Injectable()
export class OparlObjectIndexer {
  constructor(
    private readonly documents: OparlDocumentsRepository,
    private readonly chunker: OparlChunker,
  ) {}

  async index(systemId: UUID, signal: AbortSignal): Promise<void> {
    for (const source of SOURCES) {
      let afterId: UUID | null = null;
      for (;;) {
        signal.throwIfAborted();
        const objects = await this.documents.findTextObjects(
          systemId,
          source,
          afterId,
          BATCH,
        );
        if (objects.length === 0) break;
        const entries = objects
          .map((object) => ({ object, ...this.chunker.objectChunks(object) }))
          .filter(changed);
        await this.documents.replaceObjectChunks(source, entries);
        afterId = objects[objects.length - 1].id;
      }
    }
  }
}
