import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { ArrowRight, Lock } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/ui/shadcn/accordion';
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
  const { launchTour } = useOnboardingTour();
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

  const triggerSpotlight = (spotlight: string, withTooltip = true) => {
    const title = withTooltip
      ? t(`steps.${step.translationKey}.spotlightTitle`, '')
      : '';
    const desc = withTooltip
      ? t(`steps.${step.translationKey}.spotlightDescription`, '')
      : '';
    launchTour({
      target: spotlight,
      title: title || undefined,
      description: desc || undefined,
      dismissLabel: t('spotlightDismiss'),
    });
  };

  // A couple of steps resolve their spotlight at runtime, since the configured
  // target only exists once the user has the relevant data:
  // - addDocuments: when there's no knowledge base yet, open the list and
  //   spotlight "create knowledge base" (the existing-KB deep-link is handled
  //   directly in handleAction, since it needs a typed param route).
  // - useSkillInChat (pin): if there's no personal skill to pin yet, spotlight
  //   "create skill" instead of the (absent) pin button.
  // Every other link uses its configured target.
  const resolveLinkTarget = (
    to: string,
    spotlight?: TourTargetName,
  ): { to: string; spotlight?: TourTargetName } => {
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
      void navigate({
        to: '/chat',
        search: {
          prompt: prompt ?? undefined,
          attachmentUrl: action.attachmentUrl,
        },
      }).then(() => triggerSpotlight(TOUR_TARGET.sendMessage, false));
      return;
    }

    // Deep-link into an existing knowledge base. Navigate via the typed param
    // route, like the rest of the app.
    if (isAddDocumentsStep && firstKnowledgeBase) {
      void navigate({
        to: '/knowledge-bases/$id',
        params: { id: firstKnowledgeBase.id },
      }).then(() => {
        if (action.spotlight) triggerSpotlight(action.spotlight);
      });
      return;
    }

    // link
    const { to, spotlight } = resolveLinkTarget(action.to, action.spotlight);
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
    <Accordion
      type="single"
      collapsible
      defaultValue={defaultExpanded && !locked ? step.id : undefined}
    >
      <AccordionItem
        value={step.id}
        disabled={locked}
        className={cn('border-b-0', (completed || locked) && 'opacity-60')}
      >
        <div className="flex items-center gap-3 py-2.5 [&>h3]:flex-1 [&>h3]:min-w-0">
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

          <AccordionTrigger
            className={cn(
              'py-0 items-center hover:no-underline [&>svg]:size-3.5',
              locked && 'disabled:opacity-100 [&>svg]:hidden',
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
          </AccordionTrigger>
        </div>

        <AccordionContent className="ml-7 space-y-2 pb-2.5 pt-0">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t(`steps.${step.translationKey}.description`)}
          </p>
          {(step.action ?? step.secondaryAction) && (
            <div className="flex items-center gap-2">
              {step.action && (
                <Button size="sm" onClick={handleAction} disabled={completed}>
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
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
