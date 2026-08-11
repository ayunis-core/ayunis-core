import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ChatInput from '@/widgets/chat-input';
import { AcademyGateNotice } from '@/widgets/academy-gate-notice';
import {
  useInitiateChat,
  type SourceUploadStatus,
} from '@/features/chat-initiation';
import { usePermittedModels } from '@/features/usePermittedModels';
import { useAcademyAccessStatus } from '@/features/academy';
import { useChatContext } from '@/shared/contexts/chat/useChatContext';
import { showError } from '@/shared/lib/toast';
import { generateUUID } from '@/shared/lib/uuid';
import {
  SourceResponseDtoStatus,
  SourceResponseDtoType,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type {
  IntegrationSummary,
  KnowledgeBaseSummary,
} from '@/shared/contexts/chat/chatContext';

interface WorkspaceChatStarterProps {
  workspaceId: string;
  selectedModelId?: string;
  isEmbeddingModelEnabled: boolean;
}

type LocalSource = {
  id: string;
  name: string;
  type: SourceResponseDtoType;
  file: File;
  status?: SourceResponseDtoStatus;
  processingError?: string;
};

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

/**
 * The full chat composer embedded in the workspace page. Sends through the
 * same initiation flow as the new-chat page, with the workspace fixed, and
 * lands directly in the created chat.
 */
export function WorkspaceChatStarter({
  workspaceId,
  selectedModelId,
  isEmbeddingModelEnabled,
}: Readonly<WorkspaceChatStarterProps>) {
  const { t } = useTranslation('chat');
  const { initiateChat, cancel, isCreating } = useInitiateChat({
    settleAnimation: false,
  });
  const { models } = usePermittedModels();
  const { isGated: isAcademyGated } = useAcademyAccessStatus();
  const { setPendingImages, setPendingSkillId } = useChatContext();

  const [modelId, setModelId] = useState(selectedModelId);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [sources, setSources] = useState<LocalSource[]>([]);
  const [selectedKnowledgeBases, setSelectedKnowledgeBases] = useState<
    KnowledgeBaseSummary[]
  >([]);
  const [selectedIntegrations, setSelectedIntegrations] = useState<
    IntegrationSummary[]
  >([]);

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
    if (!modelId) {
      showError(t('newChat.noModelOrAgentError'));
      return;
    }

    setPendingImages(imageFiles && imageFiles.length > 0 ? imageFiles : []);
    setPendingSkillId(skillId);

    void initiateChat({
      message,
      modelId,
      sources,
      knowledgeBases: selectedKnowledgeBases,
      mcpIntegrations: selectedIntegrations,
      isAnonymous,
      workspaceId,
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

  return (
    <div>
      <AcademyGateNotice className="mb-2" />
      <ChatInput
        modelId={modelId}
        sources={sources}
        knowledgeBases={selectedKnowledgeBases}
        mcpIntegrations={selectedIntegrations}
        submissionState={isCreating ? 'submitting' : 'idle'}
        isSendDisabled={isAcademyGated}
        onModelChange={setModelId}
        onSend={handleSend}
        onCancel={handleCancel}
        onFileUpload={handleFileUpload}
        onRemoveSource={(sourceId) =>
          setSources((prev) => prev.filter((s) => s.id !== sourceId))
        }
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
            prev.filter((integration) => integration.id !== integrationId),
          );
        }}
        isEmbeddingModelEnabled={isEmbeddingModelEnabled}
        isAnonymous={isAnonymous}
        onAnonymousChange={setIsAnonymous}
        isAnonymousEnforced={isAnonymousEnforced}
        isVisionEnabled={isVisionEnabled}
      />
    </div>
  );
}
