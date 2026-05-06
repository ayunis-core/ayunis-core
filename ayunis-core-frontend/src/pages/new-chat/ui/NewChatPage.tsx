import NewChatPageLayout from './NewChatPageLayout';
import ChatInput from '@/widgets/chat-input';
import {
  useInitiateChat,
  type SourceUploadStatus,
} from '../api/useInitiateChat';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import { showError } from '@/shared/lib/toast';
import { generateUUID } from '@/shared/lib/uuid';
import type { AgentResponseDto } from '@/shared/api';
import {
  SourceResponseDtoStatus,
  SourceResponseDtoType,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { usePermittedModels } from '@/features/usePermittedModels';
import { useTimeBasedGreeting } from '../model/useTimeBasedGreeting';
import { useChatContext } from '@/shared/contexts/chat/useChatContext';
import type { KnowledgeBaseSummary } from '@/shared/contexts/chat/chatContext';
import { PinnedSkills } from './PinnedSkills';
import { PersonalizationCard } from './PersonalizationCard';
import { useUserSystemPromptStatus } from '../api/useUserSystemPromptStatus';
import { useSkipPersonalization } from '../api/useSkipPersonalization';
import { useQueryClient } from '@tanstack/react-query';
import { getChatSettingsControllerGetSystemPromptQueryKey } from '@/shared/api/generated/ayunisCoreAPI';
import { useRouter } from '@tanstack/react-router';

interface NewChatPageProps {
  selectedModelId?: string;
  selectedAgentId?: string;
  agents: AgentResponseDto[];
  isEmbeddingModelEnabled: boolean;
}

export default function NewChatPage({
  selectedModelId,
  selectedAgentId,
  isEmbeddingModelEnabled,
  agents,
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
  const [modelId, setModelId] = useState(selectedModelId);
  const [agentId, setAgentId] = useState(selectedAgentId);
  const [isAnonymous, setIsAnonymous] = useState(false);
  type LocalSource = {
    id: string;
    name: string;
    type: SourceResponseDtoType;
    file: File;
    // Local status mirroring the server-side SourceResponseDtoStatus values
    // — set during upload+processing so the chip in ChatInput renders the
    // correct spinner/error state via the same code path the chat page uses.
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
  const [selectedSkillId, setSelectedSkillId] = useState<string>();
  const [selectedSkillName, setSelectedSkillName] = useState<string>();
  const selectedAgent = agents.find((agent) => agent.id === agentId);
  const selectedModel = models.find((m) => m.id === modelId);

  // Determine if anonymous mode is enforced by the selected model
  const isAnonymousEnforced = agentId
    ? (selectedAgent?.model.anonymousOnly ?? false)
    : (selectedModel?.anonymousOnly ?? false);

  // Determine if vision is enabled by the selected model
  const isVisionEnabled = agentId
    ? (selectedAgent?.model.canVision ?? false)
    : (selectedModel?.canVision ?? false);

  function handleFileUpload(file: File) {
    const isCsvFile = file.name.endsWith('.csv');
    setSources([
      ...sources,
      {
        id: generateUUID(),
        name: file.name,
        type: isCsvFile
          ? SourceResponseDtoType.data
          : SourceResponseDtoType.text,
        file,
      },
    ]);
  }

  function handleRemoveSource(sourceId: string) {
    setSources(sources.filter((source) => source.id !== sourceId));
  }

  function handleModelChange(modelId: string) {
    setModelId(modelId);
    setAgentId(undefined);
  }

  function handleAgentChange(agentId: string) {
    setAgentId(agentId);
    setModelId(undefined);
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

  function handleAgentRemove() {
    setAgentId(undefined);
    setModelId(selectedModelId);
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
    if (!modelId && !agentId) {
      showError(t('newChat.noModelOrAgentError'));
      return;
    }

    // Images are sent as part of the first multipart request from ChatPage,
    // so they hitch a ride through context. KBs and sources are attached
    // before navigation by initiateChat itself.
    setPendingImages(imageFiles && imageFiles.length > 0 ? imageFiles : []);
    setPendingSkillId(skillId);

    void initiateChat({
      message,
      modelId,
      agentId,
      sources,
      knowledgeBases: selectedKnowledgeBases,
      isAnonymous,
      onSourceStatus: handleSourceStatus,
    });
  }

  function handleCancel() {
    cancel();
    // Clear in-flight statuses so chips become removable again. Keep the
    // sources themselves so the user doesn't lose their attachments.
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
      header={
        <ContentAreaHeader
          breadcrumbs={[{ label: t('newChat.newChat') }]}
          action={<HelpLink path="" />}
        />
      }
    >
      <div className="text-center">
        <h1 className="text-2xl font-bold">{greeting}</h1>
      </div>
      <div className="w-full flex flex-col gap-4 mt-2">
        <ChatInput
          // If an agent is selected, use the agent's model,
          // but disable the model selection
          // to only show the model that the agent uses
          modelId={agentId ? selectedAgent?.model.id : modelId}
          isModelChangeDisabled={!!agentId}
          agentId={agentId}
          sources={sources}
          knowledgeBases={selectedKnowledgeBases}
          submissionState={isCreating ? 'submitting' : 'idle'}
          onModelChange={handleModelChange}
          onAgentChange={handleAgentChange}
          onAgentRemove={handleAgentRemove}
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
          isEmbeddingModelEnabled={isEmbeddingModelEnabled}
          isAnonymous={isAnonymous}
          onAnonymousChange={setIsAnonymous}
          isAnonymousEnforced={isAnonymousEnforced}
          isVisionEnabled={isVisionEnabled}
          selectedSkillId={selectedSkillId}
          selectedSkillName={selectedSkillName}
          onSkillRemove={handleSkillRemove}
        />
        <PinnedSkills
          onSkillSelect={handleSkillSelect}
          selectedSkillId={selectedSkillId}
        />
      </div>
    </NewChatPageLayout>
  );
}
