import { useTranslation } from 'react-i18next';
import { Input } from '@ayunis/ui/components/input';
import { Label } from '@ayunis/ui/components/label';
import type { SpeakerNames } from '@/pages/recording/model/useSpeakerNames';

export interface SpeakerHints {
  edited: SpeakerNames;
  recognized: SpeakerNames;
  unclear: SpeakerNames;
}

export function SpeakerNameFields({
  speakerNumbers,
  speakerNames,
  onRenameSpeaker,
  hints,
}: Readonly<{
  speakerNumbers: number[];
  speakerNames: SpeakerNames;
  onRenameSpeaker: (speakerNumber: number, name: string) => void;
  hints: SpeakerHints;
}>) {
  const { t } = useTranslation('recordings');
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {speakerNumbers.map((number) => {
        const id = `recording-speaker-name-${number}`;
        return (
          <div key={number} className="space-y-1.5">
            <Label htmlFor={id}>
              {t('detail.transcript.speaker', { number })}
            </Label>
            <Input
              id={id}
              value={speakerNames[number] ?? ''}
              placeholder={t('detail.transcript.speakers.placeholder')}
              onChange={(event) => onRenameSpeaker(number, event.target.value)}
              data-testid={id}
            />
            <SpeakerHint number={number} hints={hints} />
          </div>
        );
      })}
    </div>
  );
}

function SpeakerHint({
  number,
  hints,
}: Readonly<{ number: number; hints: SpeakerHints }>) {
  const { t } = useTranslation('recordings');
  if (hints.edited[number] !== undefined) return null;
  if (hints.recognized[number]) {
    return (
      <p className="text-xs text-muted-foreground">
        {t('detail.transcript.speakers.recognized')}
      </p>
    );
  }
  if (hints.unclear[number]) {
    return (
      <p className="text-xs text-muted-foreground">
        {t('detail.transcript.speakers.unclear', {
          names: hints.unclear[number],
        })}
      </p>
    );
  }
  return null;
}
