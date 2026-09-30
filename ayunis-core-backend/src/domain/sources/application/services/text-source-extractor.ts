import type { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';

export interface ExtractedTextSourceContent {
  text: string;
  chunks: TextSourceContentChunk[];
  /** Replaces the source's name when set, e.g. with a crawled page title. */
  name?: string;
}

/**
 * Turns one text source type's job input into the text and chunks that
 * `SourceIngestionService` indexes. Adding a source type means adding an
 * extractor, not changing the ingestion lifecycle.
 */
export abstract class TextSourceExtractor<TInput> {
  abstract extract(input: TInput): Promise<ExtractedTextSourceContent>;

  /**
   * Called once the run is settled — ingested, skipped or finally failed —
   * and never before a retry, which still needs the input. Must not throw.
   */
  release?(input: TInput): Promise<void>;
}
