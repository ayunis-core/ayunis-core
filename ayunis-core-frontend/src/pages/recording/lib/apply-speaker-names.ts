import type { RecordingTranscriptTurnDto } from '@ayunis/api-client/schemas';
import type { SpeakerNames } from '@/pages/recording/model/useSpeakerNames';

export function applySpeakerNames(
  text: string,
  names: SpeakerNames,
  labelOf: (speakerNumber: number) => string,
): string {
  return text.replace(
    /\b(?:Speaker|Sprecher) (\d+)\b/g,
    (_, number: string) =>
      names[Number(number)]?.trim() || labelOf(Number(number)),
  );
}

export function speakerNumbersOf(
  turns: RecordingTranscriptTurnDto[],
): number[] {
  return [
    ...new Set(
      turns
        .map((turn) => turn.speakerNumber)
        .filter((number) => number !== undefined),
    ),
  ].sort((a, b) => a - b);
}
