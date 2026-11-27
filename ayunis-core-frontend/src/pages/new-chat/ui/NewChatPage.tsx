import NewChatPageLayout, { type NewChatMistPhase } from './NewChatPageLayout';
import ChatInput, { type ChatInputRef } from '@/widgets/chat-input';
import {
  useInitiateChat,
  type SourceUploadStatus,
} from '@/features/chat-initiation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import { OnboardingTourTarget, TOUR_TARGET } from '@/widgets/onboarding';
import { showError } from '@/shared/lib/toast';
import { generateUUID } from '@/shared/lib/uuid';
import {
  SourceResponseDtoStatus,
  SourceResponseDtoType,
} from '@ayunis/api-client/schemas';
import { usePermittedModels } from '@/features/usePermittedModels';
import { useAnonymousModeDefault } from '@/features/anonymous-mode-default';
import { useSelectedModel } from '@/widgets/model-select-options';
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
  composerChatModel,
  onboardingChat,
  type OnboardingChat,
} from '@/pages/new-chat/lib/onboarding-chat';
import { UnreadNotificationsPanel } from './UnreadNotificationsPanel';
import { AdventCalendarCard } from './AdventCalendarCard';
import { useAppChatSurface } from '@/features/chat-surface';

interface NewChatPageProps {
  selectedModelId?: string;
  isEmbeddingModelEnabled: boolean;
  initialPrompt?: string;
  initialAttachmentUrl?: string;
  /** Preselects a workspace, e.g. when arriving from a workspace page. */
  initialWorkspaceId?: string;
}

export default function NewChatPage({
  selectedModelId,
  isEmbeddingModelEnabled,
  initialPrompt,
  initialAttachmentUrl,
  initialWorkspaceId,
}: Readonly<NewChatPageProps>) {
  const { t } = useTranslation('chat');
  const { capabilities } = useAppChatSurface();
  const { initiateChat, cancel, isCreating } = useInitiateChat();
  const { isGated: isAcademyGated } = useAcademyAccessStatus();
  const { models } = usePermittedModels();
  const greeting = useTimeBasedGreeting();
  const onboardingStage = useOnboardingStage(true);
  const chatInputRef = useRef<ChatInputRef>(null);

  useEffect(() => {
    if (initialPrompt) {
      chatInputRef.current?.setMessage(initialPrompt);
    }
  }, [initialPrompt]);
  useFileFromUrl(initialAttachmentUrl, (file) => handleFileUpload([file]));

  const [modelId, setModelId] = useState(selectedModelId);
  const [previousDefaultModelId, setPreviousDefaultModelId] =
    useState(selectedModelId);
  if (selectedModelId !== previousDefaultModelId) {
    setPreviousDefaultModelId(selectedModelId);
    setModelId(selectedModelId);
  }
  const { isAnonymousByDefault } = useAnonymousModeDefault();
  const [isAnonymous, setIsAnonymous] = useState(isAnonymousByDefault);
  const [workspaceId, setWorkspaceId] = useState<string | null>(
    initialWorkspaceId ?? null,
  );
  type LocalSource = {
    id: string;
    name: string;
    type: SourceResponseDtoType;
    file: File;
    status?: SourceResponseDtoStatus;
    processingError?: string;
    uploadProgress?: number;
  };
  const [sources, setSources] = useState<LocalSource[]>([]);

  function applySourceStatus(
    source: LocalSource,
    status: SourceUploadStatus,
  ): LocalSource {
    if (status.kind === 'failed') {
      return {
        ...source,
        status: SourceResponseDtoStatus.failed,
        processingError: status.message,
        uploadProgress: undefined,
      };
    }
    return {
      ...source,
      status: SourceResponseDtoStatus.processing,
      processingError: undefined,
      uploadProgress: status.kind === 'uploading' ? status.progress : undefined,
    };
  }
  const [selectedKnowledgeBases, setSelectedKnowledgeBases] = useState<
    KnowledgeBaseSummary[]
  >([]);
  const [selectedIntegrations, setSelectedIntegrations] = useState<
    IntegrationSummary[]
  >([]);
  const [selectedSkill, setSelectedSkill] = useState<{
    id: string;
    name: string;
    workspaceId?: string;
  }>();
  const selectedSkillId = selectedSkill?.id;
  const selectedSkillName = selectedSkill?.name;
  const [mistPhase, setMistPhase] = useState<NewChatMistPhase>('idle');

  const handleMistExitComplete = useCallback(() => {
    setMistPhase('hidden');
  }, []);
  const {
    model: selectedModel,
    modelId: resolvedModelId,
    mode: selectedMode,
    isAnonymousEnforced,
  } = useSelectedModel(modelId, models, isAnonymous);

  const isVisionEnabled = selectedModel?.canVision ?? false;
  const onboarding = onboardingStage
    ? onboardingChat(onboardingStage, {
        model: composerChatModel(resolvedModelId, selectedMode),
        isAnonymous,
      })
    : null;

  function handleFileUpload(files: File[]) {
    const newSources: LocalSource[] = files.map((file) => ({
      id: generateUUID(),
      name: file.name,
      type: file.name.endsWith('.csv')
        ? SourceResponseDtoType.data
        : SourceResponseDtoType.text,
      file,
    }));
    setSources((prev) => [...prev, ...newSources]);
  }

  function handleRemoveSource(sourceId: string) {
    setSources(sources.filter((source) => source.id !== sourceId));
  }

  function handleModelChange(modelId: string) {
    setModelId(modelId);
  }

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

  function handleSourceStatus(sourceId: string, status: SourceUploadStatus) {
    setSources((prev) =>
      prev.map((s) => (s.id === sourceId ? applySourceStatus(s, status) : s)),
    );
  }

  function handleSend(
    message: string,
    imageFiles?: Array<{ file: File; altText?: string }>,
    skillId?: string,
    voiceInput?: boolean,
  ) {
    if (!resolvedModelId) {
      showError(t('newChat.noModelOrAgentError'));
      return;
    }

    setMistPhase((current) => (current === 'idle' ? 'exiting' : current));

    void initiateChat({
      message,
      images: imageFiles ?? [],
      ...(selectedMode ? { mode: selectedMode } : { modelId: resolvedModelId }),
      sources,
      knowledgeBases: selectedKnowledgeBases,
      mcpIntegrations: selectedIntegrations,
      isAnonymous,
      workspaceId: workspaceId ?? undefined,
      skillId,
      voiceInput,
      onSourceStatus: handleSourceStatus,
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

  function handleCancel() {
    cancel();
    setSources((prev) =>
      prev.map((s) => ({
        ...s,
        status: undefined,
        processingError: undefined,
        uploadProgress: undefined,
      })),
    );
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
            <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <WorkspacePicker
                workspaceId={workspaceId}
                onWorkspaceChange={handleWorkspaceChange}
              />
              <AdventCalendarCard className="ml-auto" />
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
        <ChatInput
          ref={chatInputRef}
          modelId={modelId}
          sources={sources}
          knowledgeBases={selectedKnowledgeBases}
          mcpIntegrations={selectedIntegrations}
          submissionState={isCreating ? 'submitting' : 'idle'}
          isSendDisabled={isAcademyGated || !resolvedModelId}
          onModelChange={handleModelChange}
          onSend={handleSend}
          onCancel={handleCancel}
          onFileUpload={handleFileUpload}
          onRemoveSource={handleRemoveSource}
          onAddKnowledgeBase={(kb) => {
            setSelectedKnowledgeBases((prev) => [...prev, kb]);
          }}
          onRemoveKnowledgeBase={(kbId) => {
            setSelectedKnowledgeBases((prev) =>
              prev.filter((kb) => kb.id !== kbId),
            );
          }}
          onAddIntegration={(integration) => {
            setSelectedIntegrations((prev) => [...prev, integration]);
          }}
          onRemoveIntegration={(integrationId) => {
            setSelectedIntegrations((prev) =>
              prev.filter((integration) => integration.id !== integrationId),
            );
          }}
          isEmbeddingModelEnabled={isEmbeddingModelEnabled}
          isAnonymous={isAnonymous}
          onAnonymousChange={setIsAnonymous}
          isAnonymousEnforced={isAnonymousEnforced}
          isVisionEnabled={isVisionEnabled}
          selectedSkillId={selectedSkillId}
          selectedSkillName={selectedSkillName}
          onSkillRemove={handleSkillRemove}
        />
      }
      supportingContent={<UnreadNotificationsPanel isCollapsed={isCreating} />}
      extras={
        capabilities.skills && (
          // Keep the tour target settling through the 200 ms delay + 700 ms entrance.
          <OnboardingTourTarget name={TOUR_TARGET.pinnedSkills} settleMs={900}>
            <PinnedSkills
              isSubmitting={isCreating}
              workspaceId={workspaceId}
              onSkillSelect={handleSkillSelect}
              selectedSkillId={selectedSkillId}
            />
          </OnboardingTourTarget>
        )
      }
      privacyHint={t('newChat.privacyHint')}
    />
  );
}
