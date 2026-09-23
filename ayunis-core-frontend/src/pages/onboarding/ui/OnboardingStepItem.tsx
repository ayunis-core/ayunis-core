import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { ArrowRight, Lock } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@ayunis/ui/components/accordion';
import { Button } from '@ayunis/ui/components/button';
import { Checkbox } from '@ayunis/ui/components/checkbox';
import TooltipIf from '@/widgets/tooltip-if/ui/TooltipIf';
import { cn } from '@ayunis/ui/lib/cn';
import { getHelpCenterUrl } from '@/shared/lib/help-center';
import {
  useOnboardingTour,
  TOUR_TARGET,
  type TourTargetName,
  ACTION_TYPE,
  SECONDARY_ACTION_TYPE,
  type OnboardingStep,
  type OnboardingStepId,
  findPinTourWorkspace,
  isTourTargetVisible,
} from '@/widgets/onboarding';
import {
  useKnowledgeBasesControllerFindAll,
  useSkillsControllerFindAll,
} from '@/shared/api/generated/ayunisCoreAPI';
import { personalKnowledgeBaseListParams } from '@/shared/api/knowledge-base-scopes';
import { personalSkillListParams } from '@/shared/api/skill-scopes';
import { useWorkspaces } from '@/features/workspaces';
import { useFavorites } from '@/features/favorites';
import { showInfo } from '@/shared/lib/toast';

type WorkspaceDetailTab = 'skills' | 'knowledge' | 'instructions';

const WORKSPACE_DETAIL_STEP_TABS: Partial<
  Record<OnboardingStepId, WorkspaceDetailTab>
> = {
  workspaceInstruction: 'instructions',
  workspaceKnowledge: 'knowledge',
  workspaceSkill: 'skills',
};

const WORKSPACE_DETAIL_STEP_IDS = new Set<string>([
  'startWorkspaceChat',
  ...Object.keys(WORKSPACE_DETAIL_STEP_TABS),
]);

// Presence in the DOM is not enough: a collapsed sidebar keeps the row mounted
// but hidden or off-screen, and joyride would stall on it until its timeout.
function isSidebarSpotlightMissing(spotlight: TourTargetName): boolean {
  if (spotlight !== TOUR_TARGET.assignChatToWorkspace) return false;
  return !isTourTargetVisible(spotlight);
}

const WORKSPACE_STEP_IDS = new Set<string>([
  'favoriteWorkspace',
  'selectWorkspaceInChat',
  'assignChatToWorkspace',
  ...WORKSPACE_DETAIL_STEP_IDS,
]);

interface OnboardingStepItemProps {
  step: OnboardingStep;
  completed: boolean;
  locked: boolean;
  lockedTooltip?: string;
  defaultExpanded?: boolean;
  onComplete: (stepId: string) => void;
}

export default function OnboardingStepItem({
  step,
  completed,
  locked,
  lockedTooltip,
  defaultExpanded = false,
  onComplete,
}: Readonly<OnboardingStepItemProps>) {
  const { t } = useTranslation('getting-started');
  const navigate = useNavigate();
  const { launchTour, armReturn } = useOnboardingTour();
  const isAddDocumentsStep = step.id === 'addDocuments';
  const { data: kbResponse } = useKnowledgeBasesControllerFindAll(
    personalKnowledgeBaseListParams,
    { query: { enabled: isAddDocumentsStep && !locked } },
  );
  const firstKnowledgeBase = kbResponse?.data[0];

  const isPinSkillStep = step.id === 'useSkillInChat';
  const { data: skillsResponse } = useSkillsControllerFindAll(
    personalSkillListParams,
    { query: { enabled: isPinSkillStep && !locked } },
  );
  const hasPersonalSkill =
    skillsResponse?.data.some((skill) => !skill.isShared) ?? false;

  const needsWorkspace = WORKSPACE_STEP_IDS.has(step.id);
  const {
    workspaces,
    isLoading: areWorkspacesLoading,
    error: workspacesError,
  } = useWorkspaces();
  const { favorites, isLoading: areFavoritesLoading } = useFavorites();
  const firstWorkspace = workspaces.at(0);
  const hasUnfavoritedWorkspace =
    findPinTourWorkspace(workspaces, favorites) !== undefined;
  // The action stays disabled until the data it decides on has arrived, so a
  // click never acts on a still-loading list.
  const isResolvingWorkspaceState =
    needsWorkspace && (areWorkspacesLoading || areFavoritesLoading);

  const prompt =
    step.action?.type === ACTION_TYPE.prompt
      ? t(`steps.${step.translationKey}.prompt`)
      : null;

  // `translationKey` selects which step's spotlight copy to show — it can differ
  // from this step when the target is resolved at runtime (see resolveLinkTarget,
  // e.g. spotlighting "create skill" must use the create-skill copy, not "pin").
  const triggerSpotlight = (
    spotlight: string,
    {
      translationKey = step.translationKey,
      withTooltip = true,
    }: { translationKey?: string; withTooltip?: boolean } = {},
  ) => {
    const title = withTooltip
      ? t(`steps.${translationKey}.spotlightTitle`, '')
      : '';
    const desc = withTooltip
      ? t(`steps.${translationKey}.spotlightDescription`, '')
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
  ): { to: string; spotlight?: TourTargetName; translationKey: string } => {
    if (isAddDocumentsStep) {
      return {
        to,
        spotlight: TOUR_TARGET.createKnowledgeBase,
        translationKey: 'createKnowledgeBase',
      };
    }
    if (isPinSkillStep && !hasPersonalSkill) {
      return {
        to,
        spotlight: TOUR_TARGET.createSkill,
        translationKey: 'createSkill',
      };
    }
    return { to, spotlight, translationKey: step.translationKey };
  };

  const handleWorkspaceAction = (to: string, spotlight?: TourTargetName) => {
    armReturn();

    if (!firstWorkspace) {
      // With the list failed we cannot tell whether a workspace exists, so we
      // open the overview without claiming there is none.
      const canOfferCreate = !workspacesError;
      void navigate({ to: '/workspaces' }).then(() => {
        if (!canOfferCreate) return;
        triggerSpotlight(TOUR_TARGET.createWorkspace, {
          translationKey: 'createWorkspace',
        });
      });
      return;
    }

    const hasNoTarget =
      (spotlight === TOUR_TARGET.assignChatToWorkspace &&
        isSidebarSpotlightMissing(spotlight)) ||
      (spotlight === TOUR_TARGET.favoriteWorkspace && !hasUnfavoritedWorkspace);

    if (hasNoTarget) {
      // Still go there, but say why nothing is highlighted.
      showInfo(t(`steps.${step.translationKey}.unavailable`));
      void navigate({ to });
      return;
    }

    const spotlightAfterNavigation = () => {
      if (spotlight) triggerSpotlight(spotlight);
    };

    if (!WORKSPACE_DETAIL_STEP_IDS.has(step.id)) {
      void navigate({ to }).then(spotlightAfterNavigation);
      return;
    }

    void navigate({
      to: '/workspaces/$workspaceId',
      params: { workspaceId: firstWorkspace.id },
      search: { tab: WORKSPACE_DETAIL_STEP_TABS[step.id] },
    }).then(spotlightAfterNavigation);
  };

  const handleAction = () => {
    const action = step.action;
    if (!action) return;

    if (action.type === ACTION_TYPE.external) {
      window.open(action.url, '_blank', 'noopener,noreferrer');
      return;
    }

    if (action.type === ACTION_TYPE.prompt) {
      armReturn();
      void navigate({
        to: '/chat',
        search: {
          prompt: prompt ?? undefined,
          attachmentUrl: action.attachmentUrl,
        },
      }).then(() =>
        triggerSpotlight(TOUR_TARGET.sendMessage, { withTooltip: false }),
      );
      return;
    }

    // Deep-link into an existing knowledge base. Navigate via the typed param
    // route, like the rest of the app.
    if (isAddDocumentsStep && firstKnowledgeBase) {
      armReturn();
      void navigate({
        to: '/knowledge-bases/$id',
        params: { id: firstKnowledgeBase.id },
      }).then(() => {
        if (action.spotlight) triggerSpotlight(action.spotlight);
      });
      return;
    }

    if (needsWorkspace) {
      handleWorkspaceAction(action.to, action.spotlight);
      return;
    }

    // link
    const { to, spotlight, translationKey } = resolveLinkTarget(
      action.to,
      action.spotlight,
    );
    armReturn();
    void navigate({ to }).then(() => {
      if (spotlight) triggerSpotlight(spotlight, { translationKey });
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
    <TooltipIf
      condition={locked && !!lockedTooltip}
      tooltip={lockedTooltip ?? ''}
    >
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
                  <Button
                    size="sm"
                    onClick={handleAction}
                    disabled={completed || isResolvingWorkspaceState}
                  >
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
    </TooltipIf>
  );
}
