import { useState, type ReactNode } from 'react';

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
  type AvailabilityVariant,
  type ContextLayout,
  type EntryVariant,
} from '@/widgets/prototype-journey/model/journey';
import {
  useJourneyNavigate,
  useJourneySearch,
} from '@/widgets/prototype-journey/model/journey-search';

const AVAILABILITY_VARIANTS: {
  value: AvailabilityVariant;
  label: string;
}[] = [
  { value: 'row', label: 'Zeile' },
  { value: 'split', label: 'Zwei' },
  { value: 'dropdowns', label: 'Menüs' },
  { value: 'underInput', label: 'Unter Feld' },
];

const CONTEXT_LAYOUTS: { value: ContextLayout; label: string }[] = [
  { value: 'tree', label: 'Baum' },
  { value: 'flat', label: 'Alles offen' },
  { value: 'tabs', label: 'Unter-Tabs' },
  { value: 'split', label: 'Vorschau fest' },
];

const VARIANTS: { value: EntryVariant; label: string }[] = [
  { value: 'single', label: 'Icon' },
  { value: 'menu', label: 'Menü' },
  { value: 'header', label: 'Beschriftet' },
];

export function JourneyCard() {
  const [isOpen, setIsOpen] = useState(true);
  const {
    step: stepIndex,
    entry: variant,
    avail: availabilityVariant,
    layout,
  } = useJourneySearch();
  const go = useJourneyNavigate();
  const step = JOURNEY[stepIndex];

  function onStepChange(index: number) {
    go({ step: index });
  }

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
          <VariantRow stepId={step.id}>
            {step.id === 'startseite' &&
              AVAILABILITY_VARIANTS.map((entry) => (
                <Button
                  key={entry.value}
                  variant={
                    availabilityVariant === entry.value ? 'secondary' : 'ghost'
                  }
                  size="sm"
                  onClick={() => go({ avail: entry.value })}
                >
                  {entry.label}
                </Button>
              ))}
            {step.id === 'presse-frage' &&
              VARIANTS.map((entry) => (
                <Button
                  key={entry.value}
                  variant={variant === entry.value ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => go({ entry: entry.value })}
                >
                  {entry.label}
                </Button>
              ))}
            {step.id !== 'startseite' &&
              step.id !== 'presse-frage' &&
              CONTEXT_LAYOUTS.map((entry) => (
                <Button
                  key={entry.value}
                  variant={layout === entry.value ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => go({ layout: entry.value })}
                >
                  {entry.label}
                </Button>
              ))}
          </VariantRow>
        </>
      )}
    </Card>
  );
}

function VariantRow({
  children,
}: Readonly<{ stepId: string; children: ReactNode }>) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1">{children}</div>
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
