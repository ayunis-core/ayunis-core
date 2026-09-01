import { useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { Card } from '@ayunis/ui/components/card';
import { cn } from '@ayunis/ui/lib/cn';
import {
  JOURNEY,
  type EntryVariant,
} from '@/pages/chat-context-prototype/model/journey';

const VARIANTS: { value: EntryVariant; label: string }[] = [
  { value: 'single', label: 'Icon' },
  { value: 'menu', label: 'Menü' },
  { value: 'header', label: 'Beschriftet' },
];

interface JourneyCardProps {
  stepIndex: number;
  variant: EntryVariant;
  onStepChange: (index: number) => void;
  onVariantChange: (variant: EntryVariant) => void;
}

export function JourneyCard({
  stepIndex,
  variant,
  onStepChange,
  onVariantChange,
}: Readonly<JourneyCardProps>) {
  const [isOpen, setIsOpen] = useState(true);
  const step = JOURNEY[stepIndex];

  return (
    <Card className="fixed bottom-4 left-4 z-50 w-80 gap-0 p-3 shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-medium">
            {stepIndex + 1}/{JOURNEY.length} · {step.label}
          </span>
          {isOpen && (
            <span className="mt-0.5 text-xs text-muted-foreground">
              {step.hint}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={isOpen ? 'Einklappen' : 'Ausklappen'}
          onClick={() => setIsOpen((current) => !current)}
        >
          {isOpen ? <ChevronDown /> : <ChevronUp />}
        </Button>
      </div>
      {isOpen && (
        <>
          <div className="mt-3 flex items-center justify-between gap-2">
            <StepDots stepIndex={stepIndex} onStepChange={onStepChange} />
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Vorheriger Schritt"
                disabled={stepIndex === 0}
                onClick={() => onStepChange(stepIndex - 1)}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Nächster Schritt"
                disabled={stepIndex === JOURNEY.length - 1}
                onClick={() => onStepChange(stepIndex + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1">
            {VARIANTS.map((entry) => (
              <Button
                key={entry.value}
                variant={variant === entry.value ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => onVariantChange(entry.value)}
              >
                {entry.label}
              </Button>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

function StepDots({
  stepIndex,
  onStepChange,
}: Readonly<{ stepIndex: number; onStepChange: (index: number) => void }>) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {JOURNEY.map((step, index) => (
        <button
          key={step.id}
          type="button"
          aria-label={step.label}
          onClick={() => onStepChange(index)}
          className={cn(
            'size-2 rounded-full transition-colors',
            index === stepIndex ? 'bg-brand' : 'bg-border hover:bg-primary/40',
          )}
        />
      ))}
    </div>
  );
}
