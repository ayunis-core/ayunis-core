import {
  formatTranscript,
  restoreTranscript,
} from './recording-transcript.helpers';

const audio = {
  path: '/recording.mp3',
  start: 600,
  duration: 600,
  mimeType: 'audio/mpeg',
  fileName: 'part-1.mp3',
};

describe('readable recording transcripts', () => {
  it('retains speaker identities through checkpoints and sorts overlapping segments', () => {
    const result = restoreTranscript(
      JSON.stringify({
        text: 'Council discussion',
        segments: [
          { text: 'Agreed.', start: 4, end: 6, speakerId: 'speaker_1' },
          {
            text: 'Approve the budget.',
            start: 1,
            end: 5,
            speakerId: 'speaker_0',
          },
        ],
      }),
      600,
    );
    expect(formatTranscript(result, audio)).toEqual([
      '[00:10:01.000 - 00:10:05.000] Speaker 1: Approve the budget.',
      '[00:10:04.000 - 00:10:06.000] Speaker 2: Agreed.',
    ]);
  });

  it('clamps provider timestamps past the probed duration instead of failing', () => {
    const transcript = restoreTranscript(
      JSON.stringify({
        text: 'Ende',
        segments: [{ text: 'Ende', start: 598, end: 604.5, speakerId: 'a' }],
      }),
      600,
    );

    expect(transcript.segments).toEqual([
      { text: 'Ende', speakerId: 'a', start: 598, end: 600 },
    ]);
    expect(() =>
      restoreTranscript(
        JSON.stringify({
          text: 'x',
          segments: [{ text: 'x', start: 5, end: 4 }],
        }),
        600,
      ),
    ).toThrow('Invalid transcription end time');
  });

  it('keeps readable plain text when the provider omits segments', () => {
    const result = restoreTranscript(
      JSON.stringify({
        text: 'The council approved the budget.',
        segments: [],
      }),
      600,
    );
    expect(formatTranscript(result, audio)).toEqual([
      'The council approved the budget.',
    ]);
  });

  it('keeps timestamps without inventing speakers when speaker ids are absent', () => {
    const result = restoreTranscript(
      JSON.stringify({
        text: 'Approved.',
        segments: [{ text: 'Approved.', start: 1, end: 2 }],
      }),
      600,
    );
    expect(formatTranscript(result, audio)).toEqual([
      '[00:10:01.000 - 00:10:02.000] Approved.',
    ]);
  });
});
