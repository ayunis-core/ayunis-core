import { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import {
  TRANSCRIPT_SUMMARY_CHUNK_KIND,
  transcriptChunkPosition,
  transcriptChunks,
} from './transcript-chunks';

describe('transcriptChunkPosition', () => {
  it('numbers the speakers of a transcript chunk as the transcript text does, not by the provider labels', () => {
    const [chunk] = transcriptChunks(
      [
        { speakerId: 'speaker_7', start: 0.2, end: 1.4, text: 'Willkommen.' },
        { speakerId: 'speaker_3', start: 1.6, end: 2.8, text: 'Danke.' },
        { speakerId: 'speaker_7', start: 3, end: 3.9, text: 'Beschlossen.' },
      ],
      'sitzung.mp3',
    );

    expect(transcriptChunkPosition(chunk)).toEqual({
      kind: 'transcript',
      start: 0.2,
      end: 3.9,
      speakerNumbers: [1, 2],
    });
  });

  it('marks a chunk of the summary', () => {
    const chunk = new TextSourceContentChunk({
      content: '## Beschlüsse\n- Der Haushalt 2026 ist beschlossen.',
      meta: { kind: TRANSCRIPT_SUMMARY_CHUNK_KIND },
    });

    expect(transcriptChunkPosition(chunk)).toEqual({ kind: 'summary' });
  });
});
