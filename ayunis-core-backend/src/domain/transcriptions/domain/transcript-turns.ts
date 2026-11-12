import type { TranscriptSegment } from './recording-transcript';

export interface TranscriptTurn extends TranscriptSegment {
  /** Speakers numbered in order of first appearance, as in the transcript text. */
  speakerNumber?: number;
}

/**
 * Merges consecutive segments of one speaker into readable turns. Overlapping
 * segments stay separate, and a turn is closed before it grows past 2,000
 * characters.
 */
export function speakerTurns(
  segments: TranscriptSegment[],
): TranscriptSegment[] {
  const turns: TranscriptSegment[] = [];
  for (const segment of segments) {
    const previous = turns.at(-1);
    if (
      previous &&
      previous.speakerId === segment.speakerId &&
      previous.end <= segment.start &&
      previous.text.length + segment.text.length < 2000
    ) {
      previous.text += ` ${segment.text.trim()}`;
      previous.end = segment.end;
    } else turns.push({ ...segment });
  }
  return turns;
}

export function toTranscriptTurns(
  segments: TranscriptSegment[],
): TranscriptTurn[] {
  const speakers = new Map<string, number>();
  return speakerTurns(segments)
    .filter((turn) => turn.text.trim())
    .map((turn) => {
      const text = turn.text.trim().replace(/\s+/g, ' ');
      if (turn.speakerId === undefined) return { ...turn, text };
      if (!speakers.has(turn.speakerId))
        speakers.set(turn.speakerId, speakers.size + 1);
      return { ...turn, text, speakerNumber: speakers.get(turn.speakerId) };
    });
}

export function formatTimestamp(seconds: number): string {
  const milliseconds = Math.round(seconds * 1000);
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor(milliseconds / 60_000) % 60;
  const secs = Math.floor(milliseconds / 1000) % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(milliseconds % 1000).padStart(3, '0')}`;
}

/** One transcript line as in the text: `[start - end] Speaker N: text`. */
export function formatTurn(turn: TranscriptTurn): string {
  const label =
    turn.speakerNumber === undefined ? '' : `Speaker ${turn.speakerNumber}: `;
  return `[${formatTimestamp(turn.start)} - ${formatTimestamp(turn.end)}] ${label}${turn.text}`;
}

const TURN_SPEAKER_PATTERN = /^\[[^\]\n]*\] Speaker (\d+): /gm;

/** The speaker numbers of the lines `formatTurn` wrote, in order of first appearance. */
export function speakerNumbersIn(text: string): number[] {
  const numbers = [...text.matchAll(TURN_SPEAKER_PATTERN)].map((match) =>
    Number(match[1]),
  );
  return [...new Set(numbers)];
}
