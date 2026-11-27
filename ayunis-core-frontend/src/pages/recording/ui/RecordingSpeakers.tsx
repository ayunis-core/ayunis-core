import type { RecordingTranscriptTurnDto } from '@ayunis/api-client/schemas';
import { speakerNumbersOf } from '@/pages/recording/lib/apply-speaker-names';
import type { SpeakerNamesState } from '@/pages/recording/model/useSpeakerNames';
import { SpeakerNameFields, type SpeakerHints } from './SpeakerNameFields';

export function RecordingSpeakers({
  turns,
  speakers,
  hints,
}: Readonly<{
  turns: RecordingTranscriptTurnDto[];
  speakers: SpeakerNamesState;
  hints: SpeakerHints;
}>) {
  const speakerNumbers = speakerNumbersOf(turns);

  if (speakerNumbers.length === 0) return null;

  return (
    <section className="border-b pb-6" data-testid="recording-speaker-names">
      <SpeakerNameFields
        speakerNumbers={speakerNumbers}
        speakerNames={speakers.names}
        onRenameSpeaker={speakers.rename}
        hints={hints}
      />
    </section>
  );
}
