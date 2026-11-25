import { useState } from 'react';
import { Badge } from '@ayunis/ui/components/badge';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { cn } from '@ayunis/ui/lib/cn';
import { ModelModeIcon } from '@/widgets/model-select-options';
import { ScreenShell } from './ScreenShell';

type Mode = 'auto' | 'max';

const MODES: ReadonlyArray<{
  value: Mode;
  label: string;
  hint: string;
  description: string;
}> = [
  {
    value: 'auto',
    label: 'Auto',
    hint: 'Beste Balance',
    description:
      'Wählt das Modell mit dem besten Verhältnis aus Leistung, Geschwindigkeit und Verbrauch.',
  },
  {
    value: 'max',
    label: 'Max',
    hint: 'Höchste Leistung',
    description:
      'Wählt das leistungsstärkste Modell für Analysen und lange Dokumente. Der Verbrauch ist höher.',
  },
];

export function ModeScreen({
  onDone,
  onBack,
}: Readonly<{ onDone: () => void; onBack: () => void }>) {
  const [mode, setMode] = useState<Mode>('auto');

  return (
    <ScreenShell
      title="Wie soll Ayunis Core Modelle wählen?"
      hint="Das gilt als Standard für alle. Im Chat lässt es sich jederzeit wechseln."
      onNext={onDone}
      onBack={onBack}
    >
      <div className="flex w-[36rem] max-w-full flex-col gap-2">
        {MODES.map((option) => (
          <Item
            key={option.value}
            variant="outline"
            className={cn(
              'wp-mode-item bg-background text-left',
              mode === option.value && 'is-selected',
            )}
            asChild
          >
            <button
              type="button"
              aria-pressed={mode === option.value}
              onClick={() => setMode(option.value)}
            >
              {option.value === 'max' && (
                <span className="wp-mode-item__pixels" aria-hidden />
              )}
              <ItemMedia variant="icon">
                <ModelModeIcon mode={option.value} />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>
                  {option.label}
                  {option.value === 'max' && (
                    <Badge variant="secondary">{option.hint}</Badge>
                  )}
                </ItemTitle>
                <ItemDescription>{option.description}</ItemDescription>
              </ItemContent>
            </button>
          </Item>
        ))}
      </div>
    </ScreenShell>
  );
}
