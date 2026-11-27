import NewChatPageLayout, { type NewChatMistPhase } from './NewChatPageLayout';
import {
  NewChatComposer,
  type NewChatComposerHandle,
  type NewChatSelection,
  type NewChatStart,
} from '@ayunis/chat/surface';
import { useInitiateChat } from '@/features/chat-initiation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import { OnboardingTourTarget, TOUR_TARGET } from '@/widgets/onboarding';
import {
  WEB_CHAT_TOUR_TARGETS,
  useChatResourceSelection,
  useWebIntegrations,
  useWebKnowledgeBases,
} from '@/widgets/chat-input';
import { WorkspacePicker } from './WorkspacePicker';
import { useAcademyAccessStatus } from '@/features/academy';
import { AcademyGateNotice } from '@/widgets/academy-gate-notice';
import { useTimeBasedGreeting } from '@/pages/new-chat/model/useTimeBasedGreeting';
import { useFileFromUrl } from '@/shared/hooks/useFileFromUrl';
import type {
  IntegrationSummary,
  KnowledgeBaseSummary,
} from '@/shared/contexts/chat/chatContext';
import { PinnedSkills } from './PinnedSkills';
import { OnboardingHint } from './OnboardingHint';
import { useOnboardingStage } from '@/pages/new-chat/api/useOnboardingStage';
import {
  onboardingChat,
  type OnboardingChat,
} from '@/pages/new-chat/lib/onboarding-chat';
import { UnreadNotificationsPanel } from './UnreadNotificationsPanel';

interface NewChatPageProps {
  /** A model id or `mode:<mode>` from the link that opened the page. */
  initialModel?: string;
  initialPrompt?: string;
  initialAttachmentUrl?: string;
  /** Preselects a workspace, e.g. when arriving from a workspace page. */
  initialWorkspaceId?: string;
}

interface SelectedSkill {
  id: string;
  name: string;
  workspaceId?: string;
}

const NO_SELECTION: NewChatSelection = {
  model: null,
  isAnonymous: false,
  canStart: false,
};

export default function NewChatPage({
  initialModel,
  initialPrompt,
  initialAttachmentUrl,
  initialWorkspaceId,
}: Readonly<NewChatPageProps>) {
  const { t } = useTranslation('chat');
  const { initiateChat, cancel, isCreating } = useInitiateChat();
  const { isGated: isAcademyGated } = useAcademyAccessStatus();
  const greeting = useTimeBasedGreeting();
  const onboardingStage = useOnboardingStage(true);
  const composerRef = useRef<NewChatComposerHandle>(null);
  const [selection, setSelection] = useState(NO_SELECTION);

  useEffect(() => {
    if (initialPrompt) {
      composerRef.current?.setMessage(initialPrompt);
    }
  }, [initialPrompt]);
  useFileFromUrl(initialAttachmentUrl, (file) =>
    composerRef.current?.addFiles([file]),
  );

  const [workspaceId, setWorkspaceId] = useState<string | null>(
    initialWorkspaceId ?? null,
  );
  const selectedKnowledgeBases =
    useChatResourceSelection<KnowledgeBaseSummary>();
  const selectedIntegrations = useChatResourceSelection<IntegrationSummary>();
  const knowledgeBases = useWebKnowledgeBases(selectedKnowledgeBases);
  const integrations = useWebIntegrations(selectedIntegrations);
  const [selectedSkill, setSelectedSkill] = useState<SelectedSkill>();
  const selectedSkillId = selectedSkill?.id;
  const [mistPhase, setMistPhase] = useState<NewChatMistPhase>('idle');

  const handleMistExitComplete = useCallback(() => {
    setMistPhase('hidden');
  }, []);
  const onboarding = onboardingStage
    ? onboardingChat(onboardingStage, selection)
    : null;

  function handleSkillSelect(
    id: string,
    name: string,
    skillWorkspaceId?: string,
  ) {
    setSelectedSkill(
      selectedSkillId === id
        ? undefined
        : { id, name, workspaceId: skillWorkspaceId },
    );
  }

  function handleSkillRemove() {
    if (!isCreating) setSelectedSkill(undefined);
  }

  function handleWorkspaceChange(id: string | null) {
    if (selectedSkill?.workspaceId && selectedSkill.workspaceId !== id) {
      setSelectedSkill(undefined);
    }
    setWorkspaceId(id);
  }

  function handleStart({
    text,
    images,
    modelId,
    mode,
    isAnonymous,
    sources,
    onSourceStatus,
    skillId,
    voiceInput,
  }: NewChatStart) {
    setMistPhase((current) => (current === 'idle' ? 'exiting' : current));

    void initiateChat({
      message: text,
      images: images ?? [],
      ...(mode ? { mode } : { modelId }),
      sources: [...sources],
      knowledgeBases: selectedKnowledgeBases.attached,
      mcpIntegrations: selectedIntegrations.attached,
      isAnonymous,
      workspaceId: workspaceId ?? undefined,
      skillId,
      voiceInput,
      onSourceStatus,
    });
  }

  function handleOnboardingStart({
    stage,
    model,
    isAnonymous,
  }: OnboardingChat) {
    setMistPhase((current) => (current === 'idle' ? 'exiting' : current));
    void initiateChat({
      message: t(`newChat.onboardingHint.${stage}.message`),
      images: [],
      ...model,
      sources: [],
      knowledgeBases: [],
      mcpIntegrations: [],
      isAnonymous,
      origin: { kind: 'onboarding', stage },
    });
  }

  return (
    <NewChatPageLayout
      isSettling={isCreating}
      backdropPhase={mistPhase}
      onBackdropExitComplete={handleMistExitComplete}
      slots={{
        header: (actions) => (
          <ContentAreaHeader
            breadcrumbs={[{ label: t('newChat.newChat') }]}
            action={actions}
          />
        ),
        actions: <HelpLink path="" />,
      }}
      greeting={greeting}
      disclaimer={t('chat.inputDisclaimer')}
      leadingContent={
        <>
          {!isCreating && (
            <div className="mb-1.5 flex justify-start">
              <WorkspacePicker
                workspaceId={workspaceId}
                onWorkspaceChange={handleWorkspaceChange}
              />
            </div>
          )}
          <AcademyGateNotice className="mb-2" />
          {onboarding && !isCreating && (
            <OnboardingHint
              className="mb-2"
              stage={onboarding.stage}
              disabled={isAcademyGated}
              onStart={() => handleOnboardingStart(onboarding)}
            />
          )}
        </>
      }
      composer={
        <NewChatComposer
          ref={composerRef}
          config={{
            layout: 'page',
            knowledgeBases,
            integrations,
            skills: {
              selected: selectedSkill,
              clear: handleSkillRemove,
            },
            tourTargets: WEB_CHAT_TOUR_TARGETS,
          }}
          initialModel={initialModel}
          busy={isCreating}
          onStart={handleStart}
          onStop={cancel}
          onSelectionChange={setSelection}
        />
      }
      supportingContent={<UnreadNotificationsPanel isCollapsed={isCreating} />}
      extras={
        // Keep the tour target settling through the 200 ms delay + 700 ms entrance.
        <OnboardingTourTarget name={TOUR_TARGET.pinnedSkills} settleMs={900}>
          <PinnedSkills
            isSubmitting={isCreating}
            workspaceId={workspaceId}
            onSkillSelect={handleSkillSelect}
            selectedSkillId={selectedSkillId}
          />
        </OnboardingTourTarget>
      }
      privacyHint={t('newChat.privacyHint')}
    />
  );
}
