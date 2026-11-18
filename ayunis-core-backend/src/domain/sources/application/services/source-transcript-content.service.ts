import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import { SourceTranscriptRepository } from 'src/domain/sources/application/ports/source-transcript.repository';
import type { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import type { TextSource } from 'src/domain/sources/domain/sources/text-source.entity';
import type { TranscriptSegment } from 'src/domain/transcriptions/domain/recording-transcript';

/**
 * Stores a recording's transcript text, chunks and segments together, under
 * the same guard as other processed content: nothing is written once the
 * source was deleted or is no longer processing.
 */
@Injectable()
export class SourceTranscriptContentService {
  constructor(
    private readonly sources: SourceRepository,
    private readonly transcripts: SourceTranscriptRepository,
  ) {}

  @Transactional()
  async save(
    source: TextSource,
    content: { text: string; chunks: TextSourceContentChunk[] },
    segments: TranscriptSegment[],
  ): Promise<boolean> {
    if (!(await this.sources.saveProcessingTextSourceContent(source, content)))
      return false;
    await this.transcripts.replace(source.id, segments);
    return true;
  }
}
