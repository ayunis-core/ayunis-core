import { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import type { TranscriptSegment } from 'src/domain/transcriptions/domain/recording-transcript';
import {
  formatTurn,
  toTranscriptTurns,
} from 'src/domain/transcriptions/domain/transcript-turns';

/** Same size as the document splitter's chunks; a longer single turn stays whole. */
const MAX_CHUNK_CHARACTERS = 2000;

/**
 * Marks the chunks of a transcript's summary, which are indexed under the
 * same source as its transcript chunks; those carry a time range instead.
 */
export const TRANSCRIPT_SUMMARY_CHUNK_KIND = 'summary';

export type TranscriptSummaryChunkMeta = {
  kind: typeof TRANSCRIPT_SUMMARY_CHUNK_KIND;
};

/** Where a transcript chunk lies in the recording, kept in the chunk's meta. */
export interface TranscriptChunkMeta {
  fileName: string;
  /** Seconds from the start of the recording. */
  start: number;
  end: number;
  /** The provider's speaker labels of the turns in the chunk. */
  speakers: string[];
}

/**
 * Groups whole speaker turns into searchable chunks, so every match can be
 * traced to its time range in the recording. Lines read like the transcript
 * text: `[start - end] Speaker N: text`.
 */
export function transcriptChunks(
  segments: TranscriptSegment[],
  fileName: string,
): TextSourceContentChunk[] {
  const chunks: TextSourceContentChunk[] = [];
  let lines: string[] = [];
  let meta: TranscriptChunkMeta | null = null;
  const flush = () => {
    if (meta)
      chunks.push(
        new TextSourceContentChunk({
          content: lines.join('\n'),
          meta: { ...meta },
        }),
      );
    lines = [];
    meta = null;
  };
  for (const turn of toTranscriptTurns(segments)) {
    const line = formatTurn(turn);
    const length = lines.reduce((sum, current) => sum + current.length + 1, 0);
    if (meta && length + line.length > MAX_CHUNK_CHARACTERS) flush();
    meta ??= { fileName, start: turn.start, end: turn.end, speakers: [] };
    meta.end = Math.max(meta.end, turn.end);
    if (turn.speakerId !== undefined && !meta.speakers.includes(turn.speakerId))
      meta.speakers.push(turn.speakerId);
    lines.push(line);
  }
  flush();
  return chunks;
}
