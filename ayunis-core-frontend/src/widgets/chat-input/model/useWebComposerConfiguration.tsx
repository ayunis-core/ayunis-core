import type {
  SourceProcessingErrorCode,
  FileSourceResponseDtoFileType,
  SourceResponseDtoCreatedBy,
  SourceResponseDtoStatus,
  SourceResponseDtoType,
} from '@ayunis/api-client';
import type { ChatConversationSlots } from '@ayunis/chat/surface';
import { AnonymousButton, SkillBadge } from '@ayunis/chat/composer';
import { ChatAttachments } from '@ayunis/chat/attachments';
import { useTranslation } from 'react-i18next';
import { useAppChatSurface } from '@/features/chat-surface';
import { useIsFeatureEnabled } from '@/features/feature-toggles';
import { OnboardingTourTarget, TOUR_TARGET } from '@/widgets/onboarding';
import { showError } from '@/shared/lib/toast';
import TooltipIf from '@/widgets/tooltip-if/ui/TooltipIf';
import type {
  IntegrationSummary,
  KnowledgeBaseSummary,
} from '@/shared/contexts/chat/chatContext';
import { useTranscribe } from '@/widgets/chat-input/api/useTranscribe';
import ModelSelector from '@/widgets/chat-input/ui/ModelSelector';
import { SkillsSubmenu } from '@/widgets/chat-input/ui/SkillsSubmenu';
import { KnowledgeBasesSubmenu } from '@/widgets/chat-input/ui/KnowledgeBasesSubmenu';
import { IntegrationsSubmenu } from '@/widgets/chat-input/ui/IntegrationsSubmenu';
import type { ReactNode } from 'react';

export interface WebComposerConfigurationProps {
  modelId: string | undefined;
  sources: SourceItem[];
  knowledgeBases?: KnowledgeBaseSummary[];
  mcpIntegrations?: IntegrationSummary[];
  isSendDisabled?: boolean;
  isModelChangeDisabled?: boolean;
  isAnonymousChangeDisabled?: boolean;
  onModelChange: (modelId: string) => void;
  onFileUpload: (files: File[]) => void;
  onRemoveSource: (sourceId: string) => void;
  onAddKnowledgeBase?: (knowledgeBase: KnowledgeBaseSummary) => void;
  onRemoveKnowledgeBase?: (knowledgeBaseId: string) => void;
  onAddIntegration?: (integration: IntegrationSummary) => void;
  onRemoveIntegration?: (integrationId: string) => void;
  selectedSkillId?: string;
  selectedSkillName?: string;
  onSkillRemove?: () => void;
  onSkillSelect?: (skillId: string, skillName: string) => void;
  isEmbeddingModelEnabled: boolean;
  isAnonymous: boolean;
  onAnonymousChange?: (isAnonymous: boolean) => void;
  isAnonymousEnforced?: boolean;
  isVisionEnabled?: boolean;
}

interface SourceItem {
  id: string;
  name: string;
  type: SourceResponseDtoType;
  fileType?: FileSourceResponseDtoFileType;
  createdBy?: SourceResponseDtoCreatedBy;
  status?: SourceResponseDtoStatus;
  processingError?: string;
  processingErrorCode?: SourceProcessingErrorCode;
  uploadProgress?: number;
}

export function useWebComposerConfiguration(
  props: WebComposerConfigurationProps,
) {
  const { capabilities } = useAppChatSurface();
  const voiceEnabled = useIsFeatureEnabled('voiceEnabled');
  const { transcribe } = useTranscribe();
  const { t } = useTranslation('common');
  const enabledCapabilities = {
    ...capabilities,
    voice: capabilities.voice && voiceEnabled,
  };
  return {
    capabilities: enabledCapabilities,
    adapters: composerAdapters(props, transcribe),
    slots: composerSlots(props, enabledCapabilities, t),
  };
}

function composerAdapters(
  props: WebComposerConfigurationProps,
  transcribe: ReturnType<typeof useTranscribe>['transcribe'],
) {
  return {
    isSendDisabled: !props.modelId || Boolean(props.isSendDisabled),
    imageAttachments: Boolean(props.isVisionEnabled),
    documentAttachments: props.isEmbeddingModelEnabled,
    allowAttachmentsWhileStreaming: true,
    onError: showComposerError,
    onAttachmentError: showComposerError,
    uploadFiles: (_threadId: string, files: File[], signal: AbortSignal) => {
      signal.throwIfAborted();
      props.onFileUpload(files);
      return Promise.resolve();
    },
    transcribe: async (audio: Blob, name: string, signal: AbortSignal) => {
      signal.throwIfAborted();
      return transcribe(audio, name);
    },
  };
}

function showComposerError(error: unknown) {
  showError(error instanceof Error ? error.message : String(error));
}

function composerSlots(
  props: WebComposerConfigurationProps,
  capabilities: ReturnType<typeof useAppChatSurface>['capabilities'],
  t: ReturnType<typeof useTranslation<'common'>>['t'],
): ChatConversationSlots {
  return {
    attachments: attachmentChips(props),
    composerLeading: composerLeading(props),
    composerModel: capabilities.modelSelection && composerModel(props, t),
    skills:
      capabilities.skills && props.onSkillSelect ? (
        <SkillsSubmenu
          onSkillSelect={props.onSkillSelect}
          selectedSkillId={props.selectedSkillId}
        />
      ) : undefined,
    knowledgeBases:
      capabilities.knowledgeBases && props.onAddKnowledgeBase ? (
        <KnowledgeBasesSubmenu
          onKnowledgeBaseSelect={props.onAddKnowledgeBase}
          attachedKnowledgeBaseIds={
            props.knowledgeBases?.map(({ id }) => id) ?? []
          }
        />
      ) : undefined,
    integrations:
      capabilities.integrations && props.onAddIntegration ? (
        <IntegrationsSubmenu
          onIntegrationSelect={props.onAddIntegration}
          attachedIntegrationIds={
            props.mcpIntegrations?.map(({ id }) => id) ?? []
          }
        />
      ) : undefined,
    composerFrame: (content) => tourTarget(TOUR_TARGET.chatComposer, content),
    composerAttachmentControl: (content) =>
      tourTarget(TOUR_TARGET.chatUpload, content),
    composerVoiceControl: (content) =>
      tourTarget(TOUR_TARGET.voiceInput, content),
    composerSendControl: (content) =>
      tourTarget(TOUR_TARGET.sendMessage, content),
  };
}

function composerLeading(props: Readonly<WebComposerConfigurationProps>) {
  return (
    <>
      {tourTarget(
        TOUR_TARGET.anonymousMode,
        <AnonymousButton
          isAnonymous={props.isAnonymous}
          onAnonymousChange={props.onAnonymousChange}
          isDisabled={props.isAnonymousChangeDisabled}
          isEnforced={props.isAnonymousEnforced}
        />,
      )}
      {props.selectedSkillId &&
        props.selectedSkillName &&
        props.onSkillRemove && (
          <SkillBadge
            skillName={props.selectedSkillName}
            onRemove={props.onSkillRemove}
          />
        )}
    </>
  );
}

function composerModel(
  props: Readonly<WebComposerConfigurationProps>,
  t: ReturnType<typeof useTranslation<'common'>>['t'],
) {
  const disabled = props.isModelChangeDisabled ?? false;
  return (
    <TooltipIf
      condition={disabled}
      tooltip={t('chatInput.modelChangeDisabledTooltip')}
    >
      <OnboardingTourTarget name={TOUR_TARGET.modelSelector}>
        <ModelSelector
          isDisabled={disabled}
          isAnonymous={props.isAnonymous}
          selectedModelId={props.modelId}
          onModelChange={props.onModelChange}
        />
      </OnboardingTourTarget>
    </TooltipIf>
  );
}

function attachmentChips(props: WebComposerConfigurationProps) {
  const hasAttachments =
    props.sources.length > 0 ||
    Boolean(props.knowledgeBases?.length) ||
    Boolean(props.mcpIntegrations?.length);
  if (!hasAttachments) return undefined;
  return (
    <ChatAttachments
      sources={props.sources}
      knowledgeBases={props.knowledgeBases}
      integrations={props.mcpIntegrations}
      onRemoveSource={props.onRemoveSource}
      onRemoveKnowledgeBase={props.onRemoveKnowledgeBase}
      onRemoveIntegration={props.onRemoveIntegration}
    />
  );
}

function tourTarget(
  name: Parameters<typeof OnboardingTourTarget>[0]['name'],
  content: ReactNode,
) {
  return (
    <OnboardingTourTarget name={name} settleMs={900}>
      {content}
    </OnboardingTourTarget>
  );
}
