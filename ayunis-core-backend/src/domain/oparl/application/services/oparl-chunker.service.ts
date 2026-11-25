import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { extractHtmlDocumentText } from 'src/common/util/html-text-extraction';
import { SplitTextCommand } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.command';
import { SplitTextUseCase } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.use-case';
import { SplitterType } from 'src/domain/rag/splitters/domain/splitter-type.enum';
import { oparlObjectText } from 'src/domain/oparl/domain/oparl-object-text';
import type {
  OparlChunkText,
  OparlFilePage,
  OparlTextObject,
} from 'src/domain/oparl/application/models/oparl-document';

// The size of the knowledge bases' child chunks: passages short enough to
// match one topic, with an overlap so a sentence is not lost at a cut.
const CHUNKING = { chunkSize: 1000, chunkOverlap: 200 };

// Some RIS put HTML into result and resolution texts.
const HTML_TAG = /<\/?[a-z][^>]*>/i;

function plainText(part: string | null): string | null {
  if (part === null || !HTML_TAG.test(part)) return part;
  return extractHtmlDocumentText(cheerio.load(part));
}

/** Cuts file pages and object texts into chunks, page by page for files. */
@Injectable()
export class OparlChunker {
  constructor(private readonly splitText: SplitTextUseCase) {}

  fileChunks(pages: OparlFilePage[]): OparlChunkText[] {
    const chunks: OparlChunkText[] = [];
    for (const page of pages) {
      for (const text of this.split(page.text)) {
        chunks.push({ text, ordinal: chunks.length, pageNumber: page.number });
      }
    }
    return chunks;
  }

  /**
   * The object's chunks (none without text) and a hash of what they carry:
   * the text, date and meeting, so a change to any replaces them.
   */
  objectChunks(object: OparlTextObject): {
    hash: string;
    chunks: OparlChunkText[];
  } {
    const text = oparlObjectText(object.parts.map(plainText));
    const carried = JSON.stringify([text, object.date, object.meetingId]);
    return {
      hash: createHash('sha256').update(carried).digest('hex'),
      chunks: this.split(text).map((chunk, ordinal) => ({
        text: chunk,
        ordinal,
        pageNumber: null,
      })),
    };
  }

  private split(text: string): string[] {
    if (text.trim().length === 0) return [];
    return this.splitText
      .execute(new SplitTextCommand(text, SplitterType.RECURSIVE, CHUNKING))
      .chunks.map((chunk) => chunk.text)
      .filter((chunk) => chunk.trim().length > 0);
  }
}
