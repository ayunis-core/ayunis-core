import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { ChevronDown, ArrowRight, Lock } from 'lucide-react';
import { Button } from '@/shared/ui/shadcn/button';
import { Checkbox } from '@/shared/ui/shadcn/checkbox';
import { cn } from '@/shared/lib/shadcn/utils';
import { getHelpCenterUrl } from '@/shared/lib/help-center';
import { useOnboardingTour } from '@/features/onboarding-tour';
import {
  TOUR_TARGET,
  ACTION_TYPE,
  SECONDARY_ACTION_TYPE,
  type OnboardingStep,
  type TourTargetName,
} from '@/shared/config/onboarding';
import { setPendingStep } from '@/features/onboarding-progress';
import {
  useKnowledgeBasesControllerFindAll,
  useSkillsControllerFindAll,
} from '@/shared/api/generated/ayunisCoreAPI';

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
  const { launchTour } = useOnboardingTour();
  const origin = location.pathname;
  const [expanded, setExpanded] = useState(defaultExpanded);
  const isAddDocumentsStep = step.id === 'addDocuments';
  const { data: kbResponse } = useKnowledgeBasesControllerFindAll({
    query: { enabled: isAddDocumentsStep && !locked },
  });
  const firstKnowledgeBase = kbResponse?.data[0];

  const isPinSkillStep = step.id === 'useSkillInChat';
  const { data: skills } = useSkillsControllerFindAll({
    query: { enabled: isPinSkillStep && !locked },
  });
  const hasPersonalSkill = skills?.some((skill) => !skill.isShared) ?? false;

  const prompt =
    step.action?.type === ACTION_TYPE.prompt
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

  // A couple of steps resolve their spotlight at runtime, since the configured
  // target only exists once the user has the relevant data:
  // - addDocuments: deep-link into the first knowledge base if one exists,
  //   otherwise open the list and spotlight "create knowledge base".
  // - useSkillInChat (pin): if there's no personal skill to pin yet, spotlight
  //   "create skill" instead of the (absent) pin button.
  // Every other link uses its configured target.
  const resolveLinkTarget = (
    to: string,
    spotlight?: TourTargetName,
  ): { to: string; spotlight?: TourTargetName } => {
    if (isAddDocumentsStep && firstKnowledgeBase) {
      return { to: `/knowledge-bases/${firstKnowledgeBase.id}`, spotlight };
    }
    if (isAddDocumentsStep) {
      return { to, spotlight: TOUR_TARGET.createKnowledgeBase };
    }
    if (isPinSkillStep && !hasPersonalSkill) {
      return { to, spotlight: TOUR_TARGET.createSkill };
    }
    return { to, spotlight };
  };

  const handleAction = () => {
    const action = step.action;
    if (!action) return;

    if (action.type === ACTION_TYPE.external) {
      window.open(action.url, '_blank', 'noopener,noreferrer');
      return;
    }

    if (action.type === ACTION_TYPE.prompt) {
      setPendingStep(step.id, '/chat', origin);
      void navigate({
        to: '/chat',
        search: { prompt: prompt ?? undefined, attachment: action.attachment },
      });
      return;
    }

    // link
    const { to, spotlight } = resolveLinkTarget(action.to, action.spotlight);
    setPendingStep(step.id, to, origin);
    void navigate({ to }).then(() => {
      if (spotlight) triggerSpotlight(spotlight);
    });
  };

  const handleSecondaryAction = () => {
    const secondary = step.secondaryAction;
    if (!secondary) return;
    const url =
      secondary.type === SECONDARY_ACTION_TYPE.helpCenter
        ? getHelpCenterUrl(secondary.path)
        : secondary.url;
    window.open(url, '_blank', 'noopener,noreferrer');
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
                  onClick={handleSecondaryAction}
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
