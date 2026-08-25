import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { cn } from '@ayunis/ui/lib/cn';
import {
  JOURNEY,
  type EntryVariant,
} from '@/pages/chat-context-prototype/model/journey';

const VARIANTS: { value: EntryVariant; label: string }[] = [
  { value: 'single', label: 'Ein Icon' },
  { value: 'menu', label: 'Icon mit Menü' },
  { value: 'header', label: 'Beide oben rechts' },
];

interface JourneyBarProps {
  stepIndex: number;
  variant: EntryVariant;
  onStepChange: (index: number) => void;
  onVariantChange: (variant: EntryVariant) => void;
}

export function JourneyBar({
  stepIndex,
  variant,
  onStepChange,
  onVariantChange,
}: Readonly<JourneyBarProps>) {
  const step = JOURNEY[stepIndex];

  return (
    <div className="mb-2 flex flex-col gap-2 rounded-lg border border-dashed bg-muted/30 px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-medium">
            {stepIndex + 1}. {step.label}
          </span>
          <span className="text-xs text-muted-foreground">{step.hint}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
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
      <div className="flex flex-wrap items-center gap-3">
        <StepDots stepIndex={stepIndex} onStepChange={onStepChange} />
        <div className="flex items-center gap-1">
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
      </div>
    </div>
  );
}

function StepDots({
  stepIndex,
  onStepChange,
}: Readonly<{ stepIndex: number; onStepChange: (index: number) => void }>) {
  return (
    <div className="flex items-center gap-1">
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
