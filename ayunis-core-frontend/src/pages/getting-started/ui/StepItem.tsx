import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { ChevronDown, ArrowRight, Lock } from 'lucide-react';
import { Button } from '@/shared/ui/shadcn/button';
import { Checkbox } from '@/shared/ui/shadcn/checkbox';
import { cn } from '@/shared/lib/shadcn/utils';
import { getHelpCenterUrl } from '@/shared/lib/help-center';
import { requestSpotlight } from '@/shared/lib/spotlight';
import type { GettingStartedStep } from '@/shared/lib/getting-started/types';

interface StepItemProps {
  step: GettingStartedStep;
  completed: boolean;
  locked: boolean;
  defaultExpanded?: boolean;
  onComplete: (stepId: string) => void;
}

export default function StepItem({
  step,
  completed,
  locked,
  defaultExpanded = false,
  onComplete,
}: Readonly<StepItemProps>) {
  const { t } = useTranslation('getting-started');
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(defaultExpanded);

  const prompt =
    step.action?.type === 'prompt'
      ? t(`steps.${step.translationKey}.prompt`)
      : null;

  const handleAction = () => {
    if (!step.action) return;
    if (step.action.type === 'prompt') {
      sessionStorage.setItem('getting-started-pending-step', step.id);
      sessionStorage.setItem('getting-started-target-path', '/chat');
      void navigate({ to: '/chat', search: { prompt: prompt ?? undefined } });
    } else if (step.action.type === 'link') {
      sessionStorage.setItem('getting-started-pending-step', step.id);
      sessionStorage.setItem('getting-started-target-path', step.action.to);
      void navigate({ to: step.action.to });
      if (step.action.spotlight) {
        const title = t(`steps.${step.translationKey}.spotlightTitle`, '');
        const desc = t(`steps.${step.translationKey}.spotlightDescription`, '');
        let payload = step.action.spotlight;
        if (title) payload += `::${title}`;
        if (title && desc) payload += `::${desc}`;
        setTimeout(() => requestSpotlight(payload), 300);
      }
    } else {
      window.open(step.action.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className={cn('py-2.5', (completed || locked) && 'opacity-60')}>
      <div className="flex items-center gap-3">
        {locked ? (
          <div className="flex items-center justify-center size-5 shrink-0">
            <Lock className="size-3.5 text-muted-foreground" />
          </div>
        ) : (
          <Checkbox
            checked={completed}
            onCheckedChange={() => onComplete(step.id)}
            aria-label={completed ? 'Completed' : 'Mark as complete'}
          />
        )}

        <button
          type="button"
          onClick={() => !locked && setExpanded(!expanded)}
          className={cn(
            'flex-1 min-w-0 flex items-center justify-between text-left',
            locked && 'cursor-default',
          )}
        >
          <span
            className={cn(
              'text-sm font-medium',
              completed && 'line-through text-muted-foreground',
              locked && 'text-muted-foreground',
            )}
          >
            {t(`steps.${step.translationKey}.title`)}
          </span>
          {!locked && (
            <ChevronDown
              className={cn(
                'size-3.5 text-muted-foreground transition-transform shrink-0',
                expanded && 'rotate-180',
              )}
            />
          )}
        </button>
      </div>

      {expanded && !locked && (
        <div className="ml-7 mt-1 mb-1 space-y-2">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t(`steps.${step.translationKey}.description`)}
          </p>
          {(step.action ?? step.secondaryAction) && (
            <div className="flex items-center gap-2">
              {step.action && (
                <Button size="sm" onClick={handleAction}>
                  {t(`steps.${step.translationKey}.action`)}
                  <ArrowRight className="size-3" />
                </Button>
              )}
              {step.secondaryAction && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const url =
                      step.secondaryAction!.type === 'help-center'
                        ? getHelpCenterUrl(step.secondaryAction!.path)
                        : step.secondaryAction!.url;
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }}
                >
                  {t(`steps.${step.translationKey}.secondaryAction`)}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
