import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ChatInput, { usePendingArtifacts } from '@/widgets/chat-input';
import { ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription } from '@ayunis/ui/components/alert';
import { AcademyGateNotice } from '@/widgets/academy-gate-notice';
import {
  useInitiateChat,
  type CreateThreadOrigin,
  type SourceUploadStatus,
} from '@/features/chat-initiation';
import { usePermittedModels } from '@/features/usePermittedModels';
import { useAnonymousModeDefault } from '@/features/anonymous-mode-default';
import { useSelectedModel } from '@/widgets/model-select-options';
import {
  useArtifactConversion,
  type ConvertibleArtifact,
} from '@/widgets/artifact-panel';
import { useAcademyAccessStatus } from '@/features/academy';
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

/** What a route loads before the composer renders, so its model is preselected. */
export interface ChatStarterDefaults {
  selectedModelId?: string;
  isEmbeddingModelEnabled: boolean;
}

interface ChatStarterProps extends ChatStarterDefaults {
  workspaceId?: string;
  origin?: CreateThreadOrigin;
  placeholder?: string;
  /**
   * Links the chat to the artifact; the chat takes its mode. A normal chat
   * about an anonymous artifact converts the artifact first.
   */
  artifact?: ConvertibleArtifact & { isAnonymous: boolean };
  autoFocus?: boolean;
  /**
   * Asked before the chat is created, e.g. to settle unsaved edits on the
   * page, which leaving for the chat would otherwise stop; false sends nothing.
   */
  confirmStart?: () => Promise<boolean>;
  /** Runs right before the created chat opens. */
  onStarted?: () => void;
}

type LocalSource = {
  id: string;
  name: string;
  type: SourceResponseDtoType;
  file: File;
  status?: SourceResponseDtoStatus;
  processingError?: string;
  uploadProgress?: number;
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

/**
 * The full chat composer embedded in a page other than the new-chat page.
 * Sends through the same initiation flow, with the workspace and origin
 * fixed, and lands directly in the created chat.
 */
export function ChatStarter({
  workspaceId,
  origin,
  placeholder,
  selectedModelId,
  isEmbeddingModelEnabled,
  artifact,
  autoFocus,
  confirmStart,
  onStarted,
}: Readonly<ChatStarterProps>) {
  const { t } = useTranslation('chat');
  const { initiateChat, cancel, isCreating } = useInitiateChat({
    settleAnimation: false,
    onSuccess: onStarted,
  });
  const { models } = usePermittedModels();
  const { isGated: isAcademyGated } = useAcademyAccessStatus();

  const [modelId, setModelId] = useState(selectedModelId);
  const { isAnonymousByDefault } = useAnonymousModeDefault();
  const [isAnonymous, setIsAnonymous] = useState(
    artifact?.isAnonymous ?? isAnonymousByDefault,
  );
  const [sources, setSources] = useState<LocalSource[]>([]);
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
    isAnonymousEnforced,
  } = useSelectedModel(modelId, models, isAnonymous);
  const isVisionEnabled = selectedModel?.canVision ?? false;
  const pendingArtifacts = usePendingArtifacts({
    workspaceId: workspaceId ?? null,
    isAnonymous: isAnonymous || isAnonymousEnforced,
  });
  // A model that enforces anonymous mode would start an anonymous chat, which
  // cannot take a normal artifact.
  const isArtifactModeBlocked =
    !!artifact && !artifact.isAnonymous && isAnonymousEnforced;
  const requestConversion = useArtifactConversion(workspaceId ?? null);
  const isArtifactConversionNeeded =
    !!artifact?.isAnonymous && !isAnonymous && !isAnonymousEnforced;

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
    voiceInput?: boolean,
  ) {
    if (!resolvedModelId) {
      showError(t('newChat.noModelOrAgentError'));
      return;
    }

    void startChat({
      message,
      images: imageFiles ?? [],
      ...(selectedMode ? { mode: selectedMode } : { modelId: resolvedModelId }),
      sources,
      knowledgeBases: selectedKnowledgeBases,
      mcpIntegrations: selectedIntegrations,
      artifactIds: [
        ...(artifact ? [artifact.id] : []),
        ...pendingArtifacts.artifacts.map(({ id }) => id),
      ],
      isAnonymous,
      workspaceId,
      origin,
      skillId,
      voiceInput,
      onSourceStatus: handleSourceStatus,
    });
  }

  async function startChat(params: Parameters<typeof initiateChat>[0]) {
    if (confirmStart && !(await confirmStart())) return;
    if (
      artifact &&
      isArtifactConversionNeeded &&
      !(await requestConversion(artifact))
    ) {
      return;
    }
    await initiateChat(params);
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
    <div>
      <AcademyGateNotice className="mb-2" />
      {isArtifactModeBlocked && (
        <Alert
          variant="warning"
          className="mb-2"
          data-testid="chat-starter-artifact-mode-notice"
        >
          <ShieldAlert />
          <AlertDescription>
            {t('chat.artifactRequiresNormalModel')}
          </AlertDescription>
        </Alert>
      )}
      <ChatInput
        modelId={modelId}
        sources={sources}
        knowledgeBases={selectedKnowledgeBases}
        mcpIntegrations={selectedIntegrations}
        artifacts={pendingArtifacts.artifacts}
        workspaceId={workspaceId ?? null}
        onAddArtifact={pendingArtifacts.add}
        onRemoveArtifact={pendingArtifacts.remove}
        linkedArtifactIds={artifact ? [artifact.id] : undefined}
        submissionState={isCreating ? 'submitting' : 'idle'}
        isSendDisabled={
          isAcademyGated || !resolvedModelId || isArtifactModeBlocked
        }
        onModelChange={setModelId}
        onSend={handleSend}
        onCancel={handleCancel}
        onFileUpload={handleFileUpload}
        onRemoveSource={(sourceId) =>
          setSources((prev) => prev.filter((s) => s.id !== sourceId))
        }
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
        isAnonymousChangeDisabled={!!artifact && !artifact.isAnonymous}
        isAnonymousEnforced={isAnonymousEnforced}
        isVisionEnabled={isVisionEnabled}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
    </div>
  );
}
