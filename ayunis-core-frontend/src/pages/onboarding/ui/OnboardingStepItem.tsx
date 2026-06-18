import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { ChevronDown, ArrowRight, Lock } from 'lucide-react';
import { Button } from '@/shared/ui/shadcn/button';
import { Checkbox } from '@/shared/ui/shadcn/checkbox';
import { cn } from '@/shared/lib/shadcn/utils';
import { getHelpCenterUrl } from '@/shared/lib/help-center';
import { launchTour } from '@/features/onboarding-tour';
import { TOUR_TARGET, type OnboardingStep } from '@/entities/onboarding';
import { setPendingStep } from '@/features/onboarding-progress';
import { useKnowledgeBasesControllerFindAll } from '@/shared/api/generated/ayunisCoreAPI';

interface OnboardingStepItemProps {
  step: OnboardingStep;
  completed: boolean;
  locked: boolean;
  defaultExpanded?: boolean;
  onComplete: (stepId: string) => void;
}

export default function OnboardingStepItem({
  step,
  completed,
  locked,
  defaultExpanded = false,
  onComplete,
}: Readonly<OnboardingStepItemProps>) {
  const { t } = useTranslation('getting-started');
  const navigate = useNavigate();
  const location = useLocation();
  const origin = location.pathname;
  const [expanded, setExpanded] = useState(defaultExpanded);
  const isAddDocumentsStep = step.id === 'addDocuments';
  const { data: kbResponse } = useKnowledgeBasesControllerFindAll({
    query: { enabled: isAddDocumentsStep && !locked },
  });
  const firstKnowledgeBase = kbResponse?.data[0];

  const prompt =
    step.action?.type === 'prompt'
      ? t(`steps.${step.translationKey}.prompt`)
      : null;

  const triggerSpotlight = (spotlight: string) => {
    const title = t(`steps.${step.translationKey}.spotlightTitle`, '');
    const desc = t(`steps.${step.translationKey}.spotlightDescription`, '');
    launchTour({
      target: spotlight,
      title: title || undefined,
      description: desc || undefined,
      dismissLabel: t('spotlightDismiss'),
    });
  };

  const handleAction = () => {
    if (!step.action) return;
    if (step.action.type === 'prompt') {
      setPendingStep(step.id, '/chat', origin);
      void navigate({
        to: '/chat',
        search: {
          prompt: prompt ?? undefined,
          attachment: step.action.attachment,
        },
      });
      return;
    }
    if (step.action.type === 'external') {
      window.open(step.action.url, '_blank', 'noopener,noreferrer');
      return;
    }
    // type === 'link'
    const spotlight = step.action.spotlight;
    if (isAddDocumentsStep && firstKnowledgeBase) {
      // Deep-link straight into the first KB and highlight the upload area.
      const target = `/knowledge-bases/${firstKnowledgeBase.id}`;
      setPendingStep(step.id, target, origin);
      void navigate({ to: target }).then(() => {
        if (spotlight) triggerSpotlight(spotlight);
      });
      return;
    }
    if (isAddDocumentsStep && !firstKnowledgeBase) {
      // No KB exists yet — nudge the user to create one first by spotlighting
      // the create button on the empty KB list page.
      setPendingStep(step.id, step.action.to, origin);
      void navigate({ to: step.action.to }).then(() => {
        triggerSpotlight(TOUR_TARGET.createKnowledgeBase);
      });
      return;
    }
    setPendingStep(step.id, step.action.to, origin);
    void navigate({ to: step.action.to }).then(() => {
      if (spotlight) triggerSpotlight(spotlight);
    });
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
              {(() => {
                const secondary = step.secondaryAction;
                if (!secondary) return null;
                return (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const url =
                        secondary.type === 'help-center'
                          ? getHelpCenterUrl(secondary.path)
                          : secondary.url;
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    {t(`steps.${step.translationKey}.secondaryAction`)}
                  </Button>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
