import { forwardRef, type ReactNode } from 'react';
import type {
  SourceProcessingErrorCode,
  FileSourceResponseDtoFileType,
  SourceResponseDtoCreatedBy,
  SourceResponseDtoStatus,
  SourceResponseDtoType,
} from '@ayunis/api-client';
import {
  ConfiguredComposer,
  type ChatConversationSlots,
  type ConfiguredComposerRef,
} from '@ayunis/chat/surface';
import {
  AnonymousButton,
  SkillBadge,
  type ChatInputSubmissionState,
} from '@ayunis/chat/composer';
import { ChatAttachments } from '@ayunis/chat/attachments';
import { useTranslation } from 'react-i18next';
import { useAppChatSurface } from '@/features/chat-surface';
import { useIsFeatureEnabled } from '@/features/feature-toggles';
import { useChatDraft } from '@/widgets/chat-input/hooks/useChatDraft';
import { OnboardingTourTarget, TOUR_TARGET } from '@/widgets/onboarding';
import { showError } from '@/shared/lib/toast';
import TooltipIf from '@/widgets/tooltip-if/ui/TooltipIf';
import type {
  IntegrationSummary,
  KnowledgeBaseSummary,
} from '@/shared/contexts/chat/chatContext';
import { useTranscribe } from '@/widgets/chat-input/api/useTranscribe';
import ModelSelector from './ModelSelector';
import { SkillsSubmenu } from './SkillsSubmenu';
import { KnowledgeBasesSubmenu } from './KnowledgeBasesSubmenu';
import { IntegrationsSubmenu } from './IntegrationsSubmenu';

export type { ChatInputSubmissionState } from '@ayunis/chat/composer';
export type ChatInputRef = ConfiguredComposerRef;

interface ChatInputProps {
  modelId: string | undefined;
  sources: SourceItem[];
  knowledgeBases?: KnowledgeBaseSummary[];
  mcpIntegrations?: IntegrationSummary[];
  submissionState?: ChatInputSubmissionState;
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
  onSend: (
    message: string,
    imageFiles?: Array<{ file: File; altText?: string }>,
    skillId?: string,
    voiceInput?: boolean,
  ) => void;
  onCancel: () => void;
  isCancelDisabled?: boolean;
  selectedSkillId?: string;
  selectedSkillName?: string;
  onSkillRemove?: () => void;
  onSkillSelect?: (skillId: string, skillName: string) => void;
  isEmbeddingModelEnabled: boolean;
  isAnonymous: boolean;
  onAnonymousChange?: (isAnonymous: boolean) => void;
  isAnonymousEnforced?: boolean;
  isVisionEnabled?: boolean;
  initialMessage?: string;
  placeholder?: string;
  draftChatId?: string;
  sentPrompts?: readonly string[];
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

const NO_PROMPTS: readonly string[] = [];

const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(
  function ChatInput(props, ref) {
    const { capabilities } = useAppChatSurface();
    const voiceEnabled = useIsFeatureEnabled('voiceEnabled');
    const enabledCapabilities = {
      ...capabilities,
      voice: capabilities.voice && voiceEnabled,
    };
    const draft = useChatDraft(props.draftChatId, props.initialMessage);
    const { transcribe } = useTranscribe();
    const state = props.submissionState ?? 'idle';
    const slots = composerSlots(props, enabledCapabilities);
    return (
      <ConfiguredComposer
        ref={ref}
        compact
        threadId={props.draftChatId ?? 'new-chat'}
        capabilities={enabledCapabilities}
        draft={draft}
        slots={slots}
        sentPrompts={props.sentPrompts ?? NO_PROMPTS}
        placeholder={props.placeholder}
        selectedSkillId={props.selectedSkillId}
        fileInputTestId="chat-file-upload-input"
        stopTestId="cancel"
        clearImagesOnSend
        isSubmitting={state === 'submitting'}
        isStreaming={state === 'streaming'}
        isCheckingForRun={false}
        adapters={composerAdapters(props, transcribe)}
        onSend={(input) =>
          props.onSend(
            input.text,
            input.images,
            input.skillId,
            input.voiceInput,
          )
        }
        onStop={props.isCancelDisabled ? undefined : props.onCancel}
      />
    );
  },
);

function composerAdapters(
  props: ChatInputProps,
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
  props: ChatInputProps,
  capabilities: ReturnType<typeof useAppChatSurface>['capabilities'],
): ChatConversationSlots {
  return {
    attachments: attachmentChips(props),
    composerLeading: <ComposerLeading {...props} />,
    composerModel: capabilities.modelSelection && <ComposerModel {...props} />,
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

function ComposerLeading(props: Readonly<ChatInputProps>) {
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

function ComposerModel(props: Readonly<ChatInputProps>) {
  const { t } = useTranslation('common');
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

function attachmentChips(props: ChatInputProps) {
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

ChatInput.displayName = 'ChatInput';

export default ChatInput;
