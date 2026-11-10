import { Lock } from 'lucide-react';
import NewChatPageLayout, { type NewChatMistPhase } from './NewChatPageLayout';
import ChatInput, { type ChatInputRef } from '@/widgets/chat-input';
import { cn } from '@ayunis/ui/lib/cn';
import {
  useInitiateChat,
  type SourceUploadStatus,
} from '@/features/chat-initiation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import { showError } from '@/shared/lib/toast';
import { generateUUID } from '@/shared/lib/uuid';
import {
  SourceResponseDtoStatus,
  SourceResponseDtoType,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
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
import { PersonalizationCard } from './PersonalizationCard';
import { useUserSystemPromptStatus } from '@/pages/new-chat/api/useUserSystemPromptStatus';
import { useSkipPersonalization } from '@/pages/new-chat/api/useSkipPersonalization';
import { useQueryClient } from '@tanstack/react-query';
import { getChatSettingsControllerGetSystemPromptQueryKey } from '@/shared/api/generated/ayunisCoreAPI';
import { useRouter } from '@tanstack/react-router';
import { UnreadNotificationButtons } from './UnreadNotificationButtons';
import { useHomeVariant } from '@/pages/new-chat/model/useHomeVariant';
import { useHomeFeed } from '@/features/home-feed';
import {
  PrototypeSwitcher,
  PrototypeSwitcherToggle,
} from '@/widgets/prototype-switcher';
import { HomeTab } from './home/HomeTab';
import { Badge } from '@ayunis/ui/components/badge';
import { HomeList } from './home/HomeList';
import { HomePlinth } from './home/HomePlinth';
import './home/home-variants.css';

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
  const { initiateChat, cancel, isCreating } = useInitiateChat();
  const { isGated: isAcademyGated } = useAcademyAccessStatus();
  const { models } = usePermittedModels();
  const greeting = useTimeBasedGreeting();
  const {
    hasSystemPrompt,
    isLoading: isSystemPromptLoading,
    isError: isSystemPromptError,
  } = useUserSystemPromptStatus();
  const { skip, isSkipping } = useSkipPersonalization();
  const { variant, useSampleData } = useHomeVariant();
  const feed = useHomeFeed(useSampleData);
  const isPlinth = variant === 'plinth' || variant === 'plinth-brand';
  const isWorkspaceOnTop = isPlinth || ['tab-bottom', 'list'].includes(variant);

  useEffect(() => {
    if (isSystemPromptError) {
      showError(t('newChat.systemPromptLoadError'));
    }
  }, [isSystemPromptError, t]);
  const queryClient = useQueryClient();
  const router = useRouter();
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
      };
    }
    return {
      ...source,
      status: SourceResponseDtoStatus.processing,
      processingError: undefined,
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
  } = useSelectedModel(modelId, models, isAnonymous);

  const isAnonymousEnforced =
    !selectedMode && (selectedModel?.anonymousOnly ?? false);
  const isVisionEnabled = selectedModel?.canVision ?? false;

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

  function handleSkillRemove() {
    setSelectedSkill(undefined);
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
      onSourceStatus: handleSourceStatus,
    });
  }

  function handleCancel() {
    cancel();
    setSources((prev) =>
      prev.map((s) => ({
        ...s,
        status: undefined,
        processingError: undefined,
      })),
    );
  }

  if (!isSystemPromptLoading && !isSystemPromptError && !hasSystemPrompt) {
    return (
      <NewChatPageLayout
        header={
          <ContentAreaHeader breadcrumbs={[{ label: t('newChat.newChat') }]} />
        }
      >
        <PersonalizationCard
          onSkip={skip}
          isSkipping={isSkipping}
          onComplete={async () => {
            const queryKey = getChatSettingsControllerGetSystemPromptQueryKey();
            await queryClient.invalidateQueries({ queryKey });
            await router.invalidate();
          }}
        />
      </NewChatPageLayout>
    );
  }

  const workspacePicker = (
    <WorkspacePicker
      workspaceId={workspaceId}
      onWorkspaceChange={handleWorkspaceChange}
    />
  );

  return (
    <NewChatPageLayout
      isSettling={isCreating}
      mistPhase={mistPhase}
      onMistExitComplete={handleMistExitComplete}
      header={
        <ContentAreaHeader
          breadcrumbs={[{ label: t('newChat.newChat') }]}
          badge={
            <Badge
              variant="outline"
              className="ml-1 font-normal text-muted-foreground"
            >
              <Lock />
              {t('newChat.privacyHint')}
            </Badge>
          }
          action={
            <>
              <PrototypeSwitcherToggle />
              <HelpLink path="" />
            </>
          }
        />
      }
      compose={
        <>
          <PrototypeSwitcher />
          <div
            className={cn(
              'new-chat-greeting flex flex-col items-center gap-3 text-center',
              isCreating && 'new-chat-greeting--exit',
            )}
            aria-hidden={isCreating}
          >
            <h1 className="text-2xl font-bold">{greeting}</h1>
          </div>

          {variant === 'current' && (
            <UnreadNotificationButtons isCollapsed={isCreating} />
          )}

          <div className="new-chat-input-stack relative w-full">
            <p
              className={cn(
                'new-chat-disclaimer absolute bottom-full left-0 right-0 mb-2 text-center text-xs text-muted-foreground',
                isCreating && 'new-chat-disclaimer--visible',
              )}
              aria-hidden={!isCreating}
            >
              {t('chat.inputDisclaimer')}
            </p>

            <AcademyGateNotice className="mb-2" />

            {!isCreating && variant === 'tab' && <HomeTab feed={feed} />}
            {!isCreating && variant === 'tab-2' && (
              <HomeTab feed={feed} isFresh />
            )}
            {!isCreating && isWorkspaceOnTop && (
              <div className="mb-2.5 flex justify-start pl-1.5">
                <WorkspacePicker
                  workspaceId={workspaceId}
                  onWorkspaceChange={handleWorkspaceChange}
                  isCompact
                />
              </div>
            )}

            <div
              className={cn(
                'relative z-10',
                !isCreating && isPlinth && 'home-plinth-host',
              )}
            >
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
                    prev.filter(
                      (integration) => integration.id !== integrationId,
                    ),
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
                onSkillSelect={(id, name) => setSelectedSkill({ id, name })}
              />
            </div>

            {!isCreating && isPlinth && (
              <HomePlinth
                feed={feed}
                isBrand={variant === 'plinth-brand'}
                workspaceId={workspaceId}
                isSample={useSampleData}
                onPromptSelect={(text) =>
                  chatInputRef.current?.setMessage(text)
                }
                onPromptSend={(text) => chatInputRef.current?.sendMessage(text)}
              />
            )}
            {!isCreating && variant === 'tab-bottom' && (
              <div className="relative h-9">
                <div className="absolute inset-x-0 top-0">
                  <HomeTab feed={feed} placement="bottom" />
                </div>
              </div>
            )}
            {!isCreating && !isWorkspaceOnTop && (
              <div className="mt-1.5 flex justify-start">{workspacePicker}</div>
            )}
          </div>

          <div
            className={cn(
              'new-chat-dock-extras mt-4 flex flex-col gap-4 overflow-hidden',
              isCreating && 'new-chat-dock-extras--collapsed',
            )}
            aria-hidden={isCreating}
          >
            {variant === 'list' && <HomeList feed={feed} />}
          </div>
        </>
      }
    />
  );
}
