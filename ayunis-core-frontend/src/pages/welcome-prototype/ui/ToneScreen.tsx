import { useState } from 'react';
import { Card } from '@ayunis/ui/components/card';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { cn } from '@ayunis/ui/lib/cn';
import { ORG_INSTRUCTION } from '@/pages/welcome-prototype/model/welcome-prototype';
import { ScreenShell } from './ScreenShell';

const TONES: ReadonlyArray<{
  value: string;
  label: string;
  description: string;
}> = [
  {
    value: 'formal',
    label: 'Förmlich und genau',
    description: 'Sachlich, mit rechtlicher Grundlage',
  },
  {
    value: 'friendly',
    label: 'Freundlich und klar',
    description: 'Verständlich, ohne Fachbegriffe',
  },
  {
    value: 'short',
    label: 'Kurz und direkt',
    description: 'Auf den Punkt, mit nächstem Schritt',
  },
];

export function ToneScreen({
  onDone,
  onBack,
}: Readonly<{ onDone: () => void; onBack: () => void }>) {
  const [tone, setTone] = useState('friendly');

  return (
    <ScreenShell
      title="Wie spricht Ihre Verwaltung Bürgerinnen und Bürger an?"
      hint="Daraus entsteht eine Anweisung, die in allen Chats gilt."
      onNext={onDone}
      onBack={onBack}
    >
      <div className="flex w-[36rem] max-w-full flex-col gap-2">
        {TONES.map((option) => (
          <Item
            key={option.value}
            variant="outline"
            size="sm"
            className={cn(
              'wp-mode-item bg-background text-left',
              tone === option.value && 'is-selected',
            )}
            asChild
          >
            <button
              type="button"
              aria-pressed={tone === option.value}
              onClick={() => setTone(option.value)}
            >
              <ItemContent>
                <ItemTitle>{option.label}</ItemTitle>
                <ItemDescription>{option.description}</ItemDescription>
              </ItemContent>
            </button>
          </Item>
        ))}
        <Card
          key={tone}
          className="bg-muted/50 wp-fade-in mt-2 gap-1 px-5 py-4 text-left text-sm shadow-none"
        >
          <span className="text-muted-foreground text-xs">
            Organisationsanweisung
          </span>
          {ORG_INSTRUCTION[tone]}
        </Card>
      </div>
    </ScreenShell>
  );
}
