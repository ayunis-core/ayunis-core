import NewChatPageLayout from './NewChatPageLayout';
import ChatInput from '@/widgets/chat-input';
import { useInitiateChat } from '../api/useInitiateChat';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { showError } from '@/shared/lib/toast';
import { generateUUID } from '@/shared/lib/uuid';
import type { AgentResponseDto } from '@/shared/api';
import { SourceResponseDtoType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { usePermittedModels } from '@/features/usePermittedModels';
import { useTimeBasedGreeting } from '../model/useTimeBasedGreeting';
import { useChatContext } from '@/shared/contexts/chat/useChatContext';
import type { KnowledgeBaseSummary } from '@/shared/contexts/chat/chatContext';

interface NewChatPageProps {
  prefilledPrompt?: string;
  selectedModelId?: string;
  selectedAgentId?: string;
  agents: AgentResponseDto[];
  isEmbeddingModelEnabled: boolean;
}

export default function NewChatPage({
  selectedModelId,
  selectedAgentId,
  prefilledPrompt,
  isEmbeddingModelEnabled,
  agents,
}: Readonly<NewChatPageProps>) {
  const { t } = useTranslation('chat');
  const { initiateChat } = useInitiateChat();
  const { models } = usePermittedModels();
  const greeting = useTimeBasedGreeting();
  const { setPendingImages, setPendingKnowledgeBases } = useChatContext();
  const [modelId, setModelId] = useState(selectedModelId);
  const [agentId, setAgentId] = useState(selectedAgentId);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [sources, setSources] = useState<
    Array<{
      id: string;
      name: string;
      type: SourceResponseDtoType;
      file: File;
    }>
  >([]);
  const [selectedKnowledgeBases, setSelectedKnowledgeBases] = useState<
    KnowledgeBaseSummary[]
  >([]);
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

  function handleAgentRemove() {
    setAgentId(undefined);
    setModelId(selectedModelId);
  }

  function handleSend(
    message: string,
    imageFiles?: Array<{ file: File; altText?: string }>,
  ) {
    if (!modelId && !agentId) {
      showError(t('newChat.noModelOrAgentError'));
      return;
    }

    // Store images in context for ChatPage to upload after thread creation
    if (imageFiles && imageFiles.length > 0) {
      setPendingImages(imageFiles);
    }

    // Store selected KBs in context for ChatPage to attach after thread creation
    // Always set — even when empty — to clear stale KBs from a previous failed attempt
    setPendingKnowledgeBases(selectedKnowledgeBases);

    initiateChat(message, modelId, agentId, sources, isAnonymous);
  }

  return (
    <NewChatPageLayout
      header={<ContentAreaHeader title={t('newChat.newChat')} />}
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
          onModelChange={handleModelChange}
          onAgentChange={handleAgentChange}
          onAgentRemove={handleAgentRemove}
          onSend={handleSend}
          onSendCancelled={() => null}
          prefilledPrompt={prefilledPrompt}
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
        />
      </div>
    </NewChatPageLayout>
  );
}
