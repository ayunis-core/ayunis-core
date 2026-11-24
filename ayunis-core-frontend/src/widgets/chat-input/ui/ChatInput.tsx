import {
  MAX_IMAGES,
  MAX_IMAGE_SIZE_MIB,
  MAX_TOTAL_IMAGE_SIZE_MIB,
} from '@/widgets/chat-input/model/image-upload-policy';
import {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useRef,
} from 'react';
import useKeyboardShortcut from '@/features/useKeyboardShortcut';
import { useTranslation } from 'react-i18next';
import type {
  SourceProcessingErrorCode,
  FileSourceResponseDtoFileType,
  SourceResponseDtoCreatedBy,
  SourceResponseDtoStatus,
  SourceResponseDtoType,
} from '@ayunis/api-client';
import { useAppChatSurface } from '@/features/chat-surface';
import { usePendingImages } from '@/widgets/chat-input/hooks/usePendingImages';
import { useImagePaste } from '@/widgets/chat-input/hooks/useImagePaste';
import { useFileDrop } from '@/widgets/chat-input/hooks/useFileDrop';
import { useChatDraft } from '@/widgets/chat-input/hooks/useChatDraft';
import { insertTextPreservingUndo } from '@/widgets/chat-input/lib/insert-text';
import { usePromptHistory } from '@/widgets/chat-input/hooks/usePromptHistory';
import { useDraftCursorAtEnd } from '@/widgets/chat-input/hooks/useDraftCursorAtEnd';
import { ACCEPTED_DOCUMENT_EXTENSIONS } from '@/widgets/chat-input/utils/fileHandlers';
import { OnboardingTourTarget, TOUR_TARGET } from '@/widgets/onboarding';
import { SourcesList } from './SourcesList';
import { ChatInputActionBar } from './ChatInputActionBar';
import { showError } from '@/shared/lib/toast';
import { ProcessingGlow } from '@/shared/ui/processing-glow';
import {
  ChatComposer,
  type ChatInputSubmissionState,
} from '@ayunis/chat/composer';
import '@ayunis/chat/composer.css';

export type { ChatInputSubmissionState } from '@ayunis/chat/composer';
import type {
  IntegrationSummary,
  KnowledgeBaseSummary,
} from '@/shared/contexts/chat/chatContext';

interface ChatInputProps {
  modelId: string | undefined;
  sources: {
    id: string;
    name: string;
    type: SourceResponseDtoType;
    fileType?: FileSourceResponseDtoFileType;
    createdBy?: SourceResponseDtoCreatedBy;
    status?: SourceResponseDtoStatus;
    processingError?: string;
    processingErrorCode?: SourceProcessingErrorCode;
    uploadProgress?: number;
  }[];
  knowledgeBases?: KnowledgeBaseSummary[];
  mcpIntegrations?: IntegrationSummary[];
  /** Default `'idle'`. See {@link ChatInputSubmissionState}. */
  submissionState?: ChatInputSubmissionState;
  /**
   * Extra reason to disable the send button even when `submissionState` is
   * `'idle'` — e.g. existing-chat sources still processing server-side.
   */
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
    /** The prompt contains text from a successful transcription. */
    voiceInput?: boolean,
  ) => void;
  /** Fired when the user clicks the cancel button while in-flight. */
  onCancel: () => void;
  /** Disables the cancel button for a run that cannot be stopped. */
  isCancelDisabled?: boolean;
  selectedSkillId?: string;
  selectedSkillName?: string;
  onSkillRemove?: () => void;
  /** Adds a skill picker to the plus menu when the host supports skills. */
  onSkillSelect?: (skillId: string, skillName: string) => void;
  isEmbeddingModelEnabled: boolean;
  /** Whether anonymous mode is enabled (PII redaction). Only shown for new chats. */
  isAnonymous: boolean;
  /** Callback when anonymous mode is toggled. If not provided, toggle is hidden. */
  onAnonymousChange?: (isAnonymous: boolean) => void;
  /** Whether anonymous mode is enforced by the selected model. */
  isAnonymousEnforced?: boolean;
  /** Whether the selected model supports vision (image upload) */
  isVisionEnabled?: boolean;
  initialMessage?: string;
  /** Replaces the default "How can I help?" prompt. */
  placeholder?: string;
  draftChatId?: string;
  /** The thread's sent prompts, oldest first, recalled with ArrowUp/ArrowDown. */
  sentPrompts?: readonly string[];
}

export interface ChatInputRef {
  setMessage: (message: string) => void;
  sendMessage: (message: string) => void;
  restoreFailedSubmission: (text: string, files: File[]) => boolean;
}

const NO_PROMPTS: readonly string[] = [];

const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(
  (
    {
      modelId,
      sources,
      knowledgeBases,
      mcpIntegrations,
      submissionState = 'idle',
      isSendDisabled,
      isModelChangeDisabled,
      isAnonymousChangeDisabled,
      onModelChange,
      onFileUpload,
      onRemoveSource,
      onAddKnowledgeBase,
      onRemoveKnowledgeBase,
      onAddIntegration,
      onRemoveIntegration,
      onSend,
      onCancel,
      isCancelDisabled = false,
      isEmbeddingModelEnabled: hasEmbeddingModel,
      isAnonymous,
      onAnonymousChange,
      isAnonymousEnforced,
      isVisionEnabled: hasVisionModel = false,
      selectedSkillId,
      selectedSkillName,
      onSkillRemove,
      onSkillSelect,
      initialMessage,
      placeholder,
      draftChatId,
      sentPrompts = NO_PROMPTS,
    },
    ref,
  ) => {
    const { capabilities } = useAppChatSurface();
    const isEmbeddingModelEnabled = Boolean(
      capabilities.fileUpload && hasEmbeddingModel,
    );
    const isVisionEnabled = Boolean(capabilities.fileUpload && hasVisionModel);
    const [isFocused, setIsFocused] = useState<boolean>(false);
    const { message, setMessage } = useChatDraft(draftChatId, initialMessage);
    const hasDictationRef = useRef(false);
    useEffect(() => {
      if (!message) hasDictationRef.current = false;
    }, [message]);
    const isSubmitting = submissionState === 'submitting';
    const inFlight = submissionState !== 'idle';
    const showProcessingGlow = inFlight;
    const { t } = useTranslation('common');
    const containerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    useDraftCursorAtEnd(textareaRef, draftChatId);
    const handlePromptHistoryKey = usePromptHistory(
      message,
      setMessage,
      sentPrompts,
    );

    // TextareaAutosize corrects its height during mount; the height transition
    // must not be active yet or that correction animates as a visible shrink
    // (flickers on every navigation because ChatPage keys the input by thread).
    // Double rAF: the class may only land after the corrected height has been
    // painted once — a plain effect flushes into the same style recalc and the
    // browser still animates from the pre-correction height.
    const [isHeightAnimationEnabled, setIsHeightAnimationEnabled] =
      useState(false);
    useEffect(() => {
      let secondFrame = 0;
      const firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() =>
          setIsHeightAnimationEnabled(true),
        );
      });
      return () => {
        cancelAnimationFrame(firstFrame);
        cancelAnimationFrame(secondFrame);
      };
    }, []);

    const { pendingImages, addImages, removeImage, clearImages } =
      usePendingImages();

    const attachImages = (files: File[]) => {
      const result = addImages(files);
      if (result.oversizedRejected) {
        showError(t('chatInput.imageTooLarge', { maxMiB: MAX_IMAGE_SIZE_MIB }));
      }
      if (result.limitExceeded) {
        showError(t('chatInput.imageLimitExceeded', { max: MAX_IMAGES }));
      }
      if (result.totalExceeded) {
        showError(
          t('chatInput.imageTotalTooLarge', {
            maxMiB: MAX_TOTAL_IMAGE_SIZE_MIB,
          }),
        );
      }
    };

    useImagePaste({
      containerRef,
      isFocused: isFocused && isVisionEnabled,
      onImagesPasted: attachImages,
    });

    const { isDragging } = useFileDrop({
      containerRef,
      onDocumentDrop: onFileUpload,
      onImagesDrop: attachImages,
      isDocumentUploadEnabled: isEmbeddingModelEnabled && !inFlight,
      isImageUploadEnabled: isVisionEnabled,
      acceptedDocumentExtensions: ACCEPTED_DOCUMENT_EXTENSIONS,
    });

    useImperativeHandle(ref, () => ({
      setMessage,
      sendMessage: (text: string) => submit(text),
      // Restore only into a pristine input; false when a draft blocks it.
      restoreFailedSubmission: (text: string, files: File[]) => {
        if (message.trim() || pendingImages.length > 0) return false;
        setMessage(text);
        if (files.length > 0) addImages(files);
        return true;
      },
    }));

    const submit = (text: string) => {
      if (
        (!text.trim() && pendingImages.length === 0 && !selectedSkillId) ||
        !modelId ||
        inFlight ||
        isSendDisabled
      ) {
        return;
      }

      // Pass File objects to parent - upload happens in ChatPage/NewChatPage
      const imageFiles = pendingImages.map((img) => ({
        file: img.file,
        altText: img.file.name || 'Pasted image',
      }));

      onSend(
        text,
        imageFiles.length > 0 ? imageFiles : undefined,
        selectedSkillId,
        hasDictationRef.current,
      );
      // Note: we deliberately do NOT clear `message` here. Parents can call
      // `chatInputRef.current.setMessage('')` once the submit has actually
      // committed (e.g. after navigation). This way the typed text survives
      // the upload pipeline and any cancellation/error.
      clearImages();
    };

    const handleSend = () => submit(message);

    useKeyboardShortcut(
      ['Enter'],
      () => {
        if (isFocused) {
          handleSend();
        }
      },
      {
        exclusive: true,
      },
    );

    const handleImageSelect = (files: FileList | null) => {
      if (!files) return;
      const imageFiles = Array.from(files).filter((file) =>
        file.type.startsWith('image/'),
      );
      if (imageFiles.length > 0) attachImages(imageFiles);
    };

    const canSend =
      (message.trim() || pendingImages.length > 0 || selectedSkillId) &&
      modelId &&
      !inFlight &&
      !isSendDisabled;

    const hasAttachmentChips =
      sources.length > 0 ||
      (knowledgeBases?.length ?? 0) > 0 ||
      (mcpIntegrations?.length ?? 0) > 0;

    function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
      const pastedText = e.clipboardData.getData('text/plain');
      if (!pastedText) return;

      if (insertTextPreservingUndo(e.currentTarget, pastedText)) {
        e.preventDefault();
      }
    }

    return (
      <div
        ref={containerRef}
        className="w-full space-y-2"
        data-testid="chat-input"
      >
        <ProcessingGlow
          isActive={showProcessingGlow}
          className="chat-input-shell"
          aria-busy={showProcessingGlow}
          data-processing={showProcessingGlow ? 'true' : undefined}
        >
          <OnboardingTourTarget name={TOUR_TARGET.chatComposer} settleMs={900}>
            <ChatComposer
              state={submissionState}
              dragging={isDragging}
              animateHeight={isHeightAnimationEnabled}
              attachments={
                hasAttachmentChips ? (
                  <SourcesList
                    sources={sources}
                    knowledgeBases={knowledgeBases}
                    mcpIntegrations={mcpIntegrations}
                    onRemove={onRemoveSource}
                    onRemoveKnowledgeBase={onRemoveKnowledgeBase}
                    onRemoveIntegration={onRemoveIntegration}
                  />
                ) : undefined
              }
              images={pendingImages}
              onRemoveImage={removeImage}
              textarea={{
                ref: textareaRef,
                value: message,
                onChange: (event) => setMessage(event.target.value),
                onPaste: handlePaste,
                onKeyDown: isSubmitting ? undefined : handlePromptHistoryKey,
                onFocus: () => setIsFocused(true),
                onBlur: () => setIsFocused(false),
                placeholder: placeholder ?? t('chatInput.placeholder'),
                'aria-label': placeholder ?? t('chatInput.placeholder'),
              }}
              actions={
                <ChatInputActionBar
                  capabilities={capabilities}
                  isSubmitting={isSubmitting}
                  isEmbeddingModelEnabled={isEmbeddingModelEnabled}
                  isVisionEnabled={isVisionEnabled}
                  knowledgeBases={knowledgeBases}
                  mcpIntegrations={mcpIntegrations}
                  onFileUpload={onFileUpload}
                  onImageSelect={handleImageSelect}
                  onAddKnowledgeBase={onAddKnowledgeBase}
                  onAddIntegration={onAddIntegration}
                  isAnonymous={isAnonymous}
                  onAnonymousChange={onAnonymousChange}
                  isAnonymousChangeDisabled={isAnonymousChangeDisabled}
                  isAnonymousEnforced={isAnonymousEnforced}
                  selectedSkillId={selectedSkillId}
                  selectedSkillName={selectedSkillName}
                  onSkillRemove={onSkillRemove}
                  onSkillSelect={onSkillSelect}
                  isModelChangeDisabled={isModelChangeDisabled}
                  modelId={modelId}
                  onModelChange={onModelChange}
                  inFlight={inFlight}
                  canSend={!!canSend}
                  onSend={handleSend}
                  onCancel={onCancel}
                  isCancelDisabled={isCancelDisabled}
                  setMessage={setMessage}
                  textareaRef={textareaRef}
                  onDictation={() => {
                    hasDictationRef.current = true;
                  }}
                />
              }
            />
          </OnboardingTourTarget>
        </ProcessingGlow>
      </div>
    );
  },
);

ChatInput.displayName = 'ChatInput';

export default ChatInput;
