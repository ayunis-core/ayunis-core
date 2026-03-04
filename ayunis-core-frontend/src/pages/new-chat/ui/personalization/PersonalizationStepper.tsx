import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { cn } from '@/shared/lib/shadcn/utils';

interface PersonalizationStepperProps {
  currentStep: number;
}

const STEP_LABEL_KEYS = [
  'newChat.personalization.stepperName',
  'newChat.personalization.stepperStyle',
  'newChat.personalization.stepperContext',
] as const;

export const PERSONALIZATION_TOTAL_STEPS = STEP_LABEL_KEYS.length;

export function PersonalizationStepper({
  currentStep,
}: Readonly<PersonalizationStepperProps>) {
  const totalSteps = STEP_LABEL_KEYS.length;
  const { t } = useTranslation('chat');

  return (
    <div className="flex items-center justify-center gap-0">
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNumber = i + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;

        return (
          <div key={stepNumber} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors',
                  isCompleted &&
                    'border-primary bg-primary text-primary-foreground',
                  isCurrent && 'border-primary text-primary',
                  !isCompleted &&
                    !isCurrent &&
                    'border-muted-foreground/30 text-muted-foreground/50',
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : stepNumber}
              </div>
              <span
                className={cn(
                  'text-xs',
                  isCurrent
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground',
                )}
              >
                {t(STEP_LABEL_KEYS[i])}
              </span>
            </div>
            {stepNumber < totalSteps && (
              <div
                className={cn(
                  'mx-2 mb-5 h-0.5 w-12',
                  isCompleted ? 'bg-primary' : 'bg-muted-foreground/20',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
