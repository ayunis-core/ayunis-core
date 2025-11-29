import NewChatPageLayout from './NewChatPageLayout';
import ChatInput, { type ChatInputRef } from '@/widgets/chat-input';
import { useInitiateChat } from '../api/useInitiateChat';
import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { QuickActions } from './QuickActions';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { showError } from '@/shared/lib/toast';
import { generateUUID } from '@/shared/lib/uuid';
import type { AgentResponseDto } from '@/shared/api';
import { SourceResponseDtoType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { usePermittedModels } from '@/features/usePermittedModels';
import { useTimeBasedGreeting } from '../model/useTimeBasedGreeting';

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
}: NewChatPageProps) {
  const { t } = useTranslation('chats');
  const { initiateChat } = useInitiateChat();
  const { models } = usePermittedModels();
  const chatInputRef = useRef<ChatInputRef>(null);
  const greeting = useTimeBasedGreeting();
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
  const selectedAgent = agents.find((agent) => agent.id === agentId);
  const selectedModel = models.find((m) => m.id === modelId);

  // Determine if anonymous mode is enforced by the selected model
  const isAnonymousEnforced = agentId
    ? (selectedAgent?.model.anonymousOnly ?? false)
    : (selectedModel?.anonymousOnly ?? false);

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

  function handleSend(message: string) {
    if (!modelId && !agentId) {
      showError(t('newChat.noModelOrAgentError'));
      return;
    }

    initiateChat(message, modelId, agentId, sources, isAnonymous);
  }

  return (
    <NewChatPageLayout
      header={<ContentAreaHeader title={t('newChat.newChat')} />}
    >
      <div className="text-center">
        <h1 className="text-2xl font-bold">{greeting.de}</h1>
        <p className="text-sm text-muted-foreground mt-1">{greeting.en}</p>
      </div>
      <div className="w-full flex flex-col gap-4 mt-2">
        <ChatInput
          ref={chatInputRef}
          // If an agent is selected, use the agent's model,
          // but disable the model selection
          // to only show the model that the agent uses
          modelId={agentId ? selectedAgent?.model.id : modelId}
          isModelChangeDisabled={!!agentId}
          agentId={agentId}
          sources={sources}
          onModelChange={handleModelChange}
          onAgentChange={handleAgentChange}
          onAgentRemove={handleAgentRemove}
          onSend={handleSend}
          onSendCancelled={() => null}
          prefilledPrompt={prefilledPrompt}
          onFileUpload={handleFileUpload}
          onRemoveSource={handleRemoveSource}
          onDownloadSource={() => null}
          isEmbeddingModelEnabled={isEmbeddingModelEnabled}
          isAnonymous={isAnonymous}
          onAnonymousChange={setIsAnonymous}
          isAnonymousEnforced={isAnonymousEnforced}
        />
        <QuickActions
          onPromptSelect={(text) => chatInputRef.current?.sendMessage(text)}
        />
      </div>
    </NewChatPageLayout>
  );
}
