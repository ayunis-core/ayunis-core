import NewChatPageLayout from './NewChatPageLayout';
import ChatInput, { type ChatInputRef } from '@/widgets/chat-input';
import { useInitiateChat } from '../api/useInitiateChat';
import { useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PinnedSkills } from './PinnedSkills';
import { useSkillsControllerFindAll } from '@/shared/api/generated/ayunisCoreAPI';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { showError } from '@/shared/lib/toast';
import { generateUUID } from '@/shared/lib/uuid';
import type { AgentResponseDto } from '@/shared/api';
import { SourceResponseDtoType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { usePermittedModels } from '@/features/usePermittedModels';
import { useTimeBasedGreeting } from '../model/useTimeBasedGreeting';
import { useChatContext } from '@/shared/contexts/chat/useChatContext';

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
  const [selectedSkillId, setSelectedSkillId] = useState<string | undefined>(
    undefined,
  );
  const { initiateChat } = useInitiateChat({
    onSuccess: () => setSelectedSkillId(undefined),
  });
  const { models } = usePermittedModels();
  const chatInputRef = useRef<ChatInputRef>(null);
  const greeting = useTimeBasedGreeting();
  const { setPendingImages, setPendingSkillId } = useChatContext();
  const [modelId, setModelId] = useState(selectedModelId);
  const [agentId, setAgentId] = useState(selectedAgentId);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const { data: skills } = useSkillsControllerFindAll();
  const selectedSkillName = useMemo(
    () => skills?.find((s) => s.id === selectedSkillId)?.name,
    [skills, selectedSkillId],
  );
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
    skillId?: string,
  ) {
    if (!modelId && !agentId) {
      showError(t('newChat.noModelOrAgentError'));
      return;
    }

    // Store images in context for ChatPage to upload after thread creation
    if (imageFiles && imageFiles.length > 0) {
      setPendingImages(imageFiles);
    }

    // Store skill ID in context for ChatPage to include in the first message
    if (skillId) {
      setPendingSkillId(skillId);
    } else {
      setPendingSkillId('');
    }

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
          isVisionEnabled={isVisionEnabled}
          selectedSkillId={selectedSkillId}
          selectedSkillName={selectedSkillName}
          onSkillRemove={() => {
            setSelectedSkillId(undefined);
          }}
        />
        <PinnedSkills
          onSkillSelect={(skillId) => {
            if (selectedSkillId === skillId) {
              setSelectedSkillId(undefined);
            } else {
              setSelectedSkillId(skillId);
            }
          }}
          selectedSkillId={selectedSkillId}
        />
      </div>
    </NewChatPageLayout>
  );
}
