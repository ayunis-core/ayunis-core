import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ChatInput from '@/widgets/chat-input';
import { AcademyGateNotice } from '@/widgets/academy-gate-notice';
import { useInitiateChat } from '@/features/chat-initiation';
import { usePermittedModels } from '@/features/usePermittedModels';
import { useAnonymousModeDefault } from '@/features/anonymous-mode-default';
import { useSelectedModel } from '@/widgets/model-select-options';
import { useAcademyAccessStatus } from '@/features/academy';
import { showError } from '@/shared/lib/toast';
import { useChatAttachments } from '@/features/chat-attachments';

import type {
  IntegrationSummary,
  KnowledgeBaseSummary,
} from '@/shared/contexts/chat/chatContext';

interface ChatStarterProps {
  workspaceId?: string;
  sourceNotificationId?: string;
  placeholder?: string;
  selectedModelId?: string;
  isEmbeddingModelEnabled: boolean;
}

/**
 * The full chat composer embedded in a page other than the new-chat page.
 * Sends through the same initiation flow, with the workspace and source
 * notification fixed, and lands directly in the created chat.
 */
export function ChatStarter({
  workspaceId,
  sourceNotificationId,
  placeholder,
  selectedModelId,
  isEmbeddingModelEnabled,
}: Readonly<ChatStarterProps>) {
  const { t } = useTranslation('chat');
  const { initiateChat, cancel, isCreating } = useInitiateChat({
    settleAnimation: false,
  });
  const { models } = usePermittedModels();
  const { isGated: isAcademyGated } = useAcademyAccessStatus();

  const [modelId, setModelId] = useState(selectedModelId);
  const { isAnonymousByDefault } = useAnonymousModeDefault();
  const [isAnonymous, setIsAnonymous] = useState(isAnonymousByDefault);
  const {
    attachments: sources,
    upload: handleFileUpload,
    remove: handleRemoveSource,
  } = useChatAttachments();
  const [selectedKnowledgeBases, setSelectedKnowledgeBases] = useState<
    KnowledgeBaseSummary[]
  >([]);
  const [selectedIntegrations, setSelectedIntegrations] = useState<
    IntegrationSummary[]
  >([]);

  const {
    model: selectedModel,
    modelId: resolvedModelId,
    mode: selectedMode,
  } = useSelectedModel(modelId, models, isAnonymous);
  const isAnonymousEnforced =
    !selectedMode && (selectedModel?.anonymousOnly ?? false);
  const isVisionEnabled = selectedModel?.canVision ?? false;

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

    void initiateChat({
      message,
      images: imageFiles ?? [],
      ...(selectedMode ? { mode: selectedMode } : { modelId: resolvedModelId }),
      sources,
      knowledgeBases: selectedKnowledgeBases,
      mcpIntegrations: selectedIntegrations,
      isAnonymous,
      workspaceId,
      sourceNotificationId,
      skillId,
      voiceInput,
    });
  }

  function handleCancel() {
    cancel();
  }

  return (
    <div>
      <AcademyGateNotice className="mb-2" />
      <ChatInput
        modelId={modelId}
        sources={sources}
        knowledgeBases={selectedKnowledgeBases}
        mcpIntegrations={selectedIntegrations}
        submissionState={isCreating ? 'submitting' : 'idle'}
        isSendDisabled={isAcademyGated || !resolvedModelId}
        onModelChange={setModelId}
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
        placeholder={placeholder}
      />
    </div>
  );
}
