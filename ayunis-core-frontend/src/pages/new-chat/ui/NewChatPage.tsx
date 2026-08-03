import { Lock } from 'lucide-react';
import NewChatPageLayout, { type NewChatMistPhase } from './NewChatPageLayout';
import ChatInput, { type ChatInputRef } from '@/widgets/chat-input';
import { cn } from '@/shared/lib/shadcn/utils';
import {
  useInitiateChat,
  type SourceUploadStatus,
} from '../api/useInitiateChat';
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
import { useTimeBasedGreeting } from '../model/useTimeBasedGreeting';
import { useFileFromUrl } from '@/shared/hooks/useFileFromUrl';
import { useChatContext } from '@/shared/contexts/chat/useChatContext';
import type {
  IntegrationSummary,
  KnowledgeBaseSummary,
} from '@/shared/contexts/chat/chatContext';
import { ProjectPicker } from './ProjectPicker';
import './new-chat-input-frame.css';
import { PersonalizationCard } from './PersonalizationCard';
import { useUserSystemPromptStatus } from '../api/useUserSystemPromptStatus';
import { useSkipPersonalization } from '../api/useSkipPersonalization';
import { useQueryClient } from '@tanstack/react-query';
import { getChatSettingsControllerGetSystemPromptQueryKey } from '@/shared/api/generated/ayunisCoreAPI';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { addChatToProject } from '@/entities/project';
import {
  useAttachedProjectId,
  setAttachedProject,
} from '@/features/useAttachedProject';

interface NewChatPageProps {
  selectedModelId?: string;
  isEmbeddingModelEnabled: boolean;
  initialPrompt?: string;
  initialAttachmentUrl?: string;
}

export default function NewChatPage({
  selectedModelId,
  isEmbeddingModelEnabled,
  initialPrompt,
  initialAttachmentUrl,
}: Readonly<NewChatPageProps>) {
  const { t } = useTranslation('chat');
  const { initiateChat, cancel, isCreating } = useInitiateChat();
  const { models } = usePermittedModels();
  const greeting = useTimeBasedGreeting();
  const { setPendingImages, setPendingSkillId } = useChatContext();
  const {
    hasSystemPrompt,
    isLoading: isSystemPromptLoading,
    isError: isSystemPromptError,
  } = useUserSystemPromptStatus();
  const { skip, isSkipping } = useSkipPersonalization();

  useEffect(() => {
    if (isSystemPromptError) {
      showError(t('newChat.systemPromptLoadError'));
    }
  }, [isSystemPromptError, t]);
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigate = useNavigate();
  const attachedProjectId = useAttachedProjectId();
  const chatInputRef = useRef<ChatInputRef>(null);

  useEffect(() => {
    if (initialPrompt) {
      chatInputRef.current?.setMessage(initialPrompt);
    }
  }, [initialPrompt]);
  useFileFromUrl(initialAttachmentUrl, (file) => handleFileUpload([file]));

  const [modelId, setModelId] = useState(selectedModelId);
  const [isAnonymous, setIsAnonymous] = useState(false);
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
  const [selectedSkillId, setSelectedSkillId] = useState<string>();
  const [selectedSkillName, setSelectedSkillName] = useState<string>();
  const [mistPhase, setMistPhase] = useState<NewChatMistPhase>('idle');

  const handleMistExitComplete = useCallback(() => {
    setMistPhase('hidden');
  }, []);
  const selectedModel = models.find((m) => m.id === modelId);

  const isAnonymousEnforced = selectedModel?.anonymousOnly ?? false;
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

  function handleSkillSelect(skillId: string, skillName: string) {
    if (selectedSkillId === skillId) {
      setSelectedSkillId(undefined);
      setSelectedSkillName(undefined);
    } else {
      setSelectedSkillId(skillId);
      setSelectedSkillName(skillName);
    }
  }

  function handleSkillRemove() {
    setSelectedSkillId(undefined);
    setSelectedSkillName(undefined);
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
    if (attachedProjectId) {
      const chat = {
        id: crypto.randomUUID(),
        title: message.trim().slice(0, 60) || 'Neuer Chat',
        messages: [
          { id: crypto.randomUUID(), role: 'user' as const, text: message },
        ],
      };
      addChatToProject(attachedProjectId, chat);
      setAttachedProject(null);
      void navigate({
        to: '/projects/$projectId/chats/$chatId',
        params: { projectId: attachedProjectId, chatId: chat.id },
      });
      return;
    }

    if (!modelId) {
      showError(t('newChat.noModelOrAgentError'));
      return;
    }

    setMistPhase((current) => (current === 'idle' ? 'exiting' : current));

    setPendingImages(imageFiles && imageFiles.length > 0 ? imageFiles : []);
    setPendingSkillId(skillId);

    void initiateChat({
      message,
      modelId,
      sources,
      knowledgeBases: selectedKnowledgeBases,
      mcpIntegrations: selectedIntegrations,
      isAnonymous,
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

  return (
    <NewChatPageLayout
      isSettling={isCreating}
      mistPhase={mistPhase}
      onMistExitComplete={handleMistExitComplete}
      header={
        <ContentAreaHeader
          breadcrumbs={[{ label: t('newChat.newChat') }]}
          action={<HelpLink path="" />}
        />
      }
      compose={
        <>
          <h1
            className={cn(
              'new-chat-greeting text-center text-2xl font-bold',
              isCreating && 'new-chat-greeting--exit',
            )}
            aria-hidden={isCreating}
          >
            {greeting}
          </h1>

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

            <div
              className={cn(
                'new-chat-input-frame rounded-2xl border border-border/60 bg-background/50 backdrop-blur-md transition-colors [&_[data-slot=card]]:shadow-[0_2px_12px_rgba(0,0,0,0.06)]',
                isCreating &&
                  'border-transparent bg-transparent backdrop-blur-none',
              )}
            >
              <ChatInput
                ref={chatInputRef}
                modelId={modelId}
                sources={sources}
                knowledgeBases={selectedKnowledgeBases}
                mcpIntegrations={selectedIntegrations}
                submissionState={isCreating ? 'submitting' : 'idle'}
                onModelChange={handleModelChange}
                onSend={handleSend}
                onCancel={handleCancel}
                onFileUpload={handleFileUpload}
                onRemoveSource={handleRemoveSource}
                onDownloadSource={() => null}
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
                onSkillSelect={handleSkillSelect}
              />
              <div
                className={cn(
                  'flex items-center p-1.5 transition-opacity',
                  isCreating && 'pointer-events-none opacity-0',
                )}
                aria-hidden={isCreating}
              >
                <ProjectPicker />
              </div>
            </div>
          </div>

          <div
            className={cn(
              'new-chat-dock-extras mt-2 flex flex-col overflow-hidden',
              isCreating && 'new-chat-dock-extras--collapsed',
            )}
            aria-hidden={isCreating}
          >
            <div className="flex justify-center items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3 w-3 shrink-0" />
              <span>{t('newChat.privacyHint')}</span>
            </div>
          </div>
        </>
      }
    />
  );
}
