import { useState, forwardRef, useImperativeHandle, useRef } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { Card, CardContent } from '@/shared/ui/shadcn/card';
import AgentButton from './AgentButton';
import useKeyboardShortcut from '@/features/useKeyboardShortcut';
import { useTranslation } from 'react-i18next';
import type {
  SourceResponseDtoCreatedBy,
  SourceResponseDtoType,
} from '@/shared/api';
import PlusButton from './PlusButton';
import ModelSelector from './ModelSelector';
import { useAgents } from '../../../features/useAgents';
import TooltipIf from '@/widgets/tooltip-if/ui/TooltipIf';
import { SendButton } from './SendButton';
import { AnonymousButton } from './AnonymousButton';
import { AgentBadge } from './AgentBadge';
import { SkillBadge } from './SkillBadge';
import {
  usePendingImages,
  type PendingImage,
  MAX_IMAGES,
} from '../hooks/usePendingImages';
import { useImagePaste } from '../hooks/useImagePaste';
import { useFileDrop } from '../hooks/useFileDrop';
import { PendingImageThumbnail } from './PendingImageThumbnail';
import { cn } from '@/shared/lib/shadcn/utils';
import { SourcesList } from './SourcesList';
import { showError } from '@/shared/lib/toast';
import { MicrophoneButton } from './MicrophoneButton';

interface ChatInputProps {
  modelId: string | undefined;
  agentId: string | undefined;
  sources: {
    id: string;
    name: string;
    type: SourceResponseDtoType;
    createdBy?: SourceResponseDtoCreatedBy;
  }[];
  isStreaming?: boolean;
  isCreatingFileSource?: boolean;
  isModelChangeDisabled: boolean;
  isAgentChangeDisabled?: boolean;
  isAnonymousChangeDisabled?: boolean;
  onModelChange: (modelId: string) => void;
  onAgentChange: (agentId: string) => void;
  onAgentRemove: (agentId: string) => void;
  onFileUpload: (file: File) => void;
  onRemoveSource: (sourceId: string) => void;
  onDownloadSource: (sourceId: string) => void;
  onSend: (
    message: string,
    imageFiles?: Array<{ file: File; altText?: string }>,
    skillId?: string,
  ) => void;
  onSendCancelled: () => void;
  selectedSkillId?: string;
  selectedSkillName?: string;
  onSkillRemove?: () => void;
  prefilledPrompt?: string;
  isEmbeddingModelEnabled: boolean;
  /** Whether anonymous mode is enabled (PII redaction). Only shown for new chats. */
  isAnonymous: boolean;
  /** Callback when anonymous mode is toggled. If not provided, toggle is hidden. */
  onAnonymousChange?: (isAnonymous: boolean) => void;
  /** Whether anonymous mode is enforced by the selected model. */
  isAnonymousEnforced?: boolean;
  /** Whether the selected model supports vision (image upload) */
  isVisionEnabled?: boolean;
}

export interface ChatInputRef {
  setMessage: (message: string) => void;
  sendMessage: (message: string) => void;
}

const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(
  (
    {
      modelId,
      agentId,
      sources,
      isStreaming,
      isCreatingFileSource,
      isModelChangeDisabled,
      isAgentChangeDisabled,
      isAnonymousChangeDisabled,
      onModelChange,
      onAgentChange,
      onAgentRemove,
      onFileUpload,
      onRemoveSource,
      onDownloadSource,
      onSend,
      onSendCancelled,
      prefilledPrompt,
      isEmbeddingModelEnabled,
      isAnonymous,
      onAnonymousChange,
      isAnonymousEnforced,
      isVisionEnabled = false,
      selectedSkillId,
      selectedSkillName,
      onSkillRemove,
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState<boolean>(false);
    const [message, setMessage] = useState(prefilledPrompt ?? '');
    const { t } = useTranslation('common');
    const { agents } = useAgents();
    const containerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const { pendingImages, addImages, removeImage, clearImages } =
      usePendingImages();

    // Handle paste events for images
    const handleImagesPasted = (files: File[]) => {
      const result = addImages(files);
      if (result.limitExceeded) {
        showError(t('chatInput.imageLimitExceeded', { max: MAX_IMAGES }));
      }
    };

    useImagePaste({
      containerRef,
      isFocused: isFocused && isVisionEnabled,
      onImagesPasted: handleImagesPasted,
    });

    const { isDragging } = useFileDrop({
      containerRef,
      onDocumentDrop: onFileUpload,
      onImagesDrop: (files) => {
        const result = addImages(files);
        if (result.limitExceeded) {
          showError(t('chatInput.imageLimitExceeded', { max: MAX_IMAGES }));
        }
      },
      isDocumentUploadEnabled: isEmbeddingModelEnabled && !isCreatingFileSource,
      isImageUploadEnabled: isVisionEnabled,
      acceptedDocumentExtensions: [
        '.pdf',
        '.csv',
        '.xlsx',
        '.xls',
        '.docx',
        '.pptx',
      ],
    });

    useImperativeHandle(ref, () => ({
      setMessage,
      sendMessage: (text: string) => {
        if (!text.trim() || !(modelId || agentId)) return;
        onSend(text);
      },
    }));

    const handleSend = () => {
      if (
        (!message.trim() && pendingImages.length === 0 && !selectedSkillId) ||
        !(modelId || agentId)
      ) {
        return;
      }

      // Pass File objects to parent - upload happens in ChatPage/NewChatPage
      const imageFiles = pendingImages.map((img) => ({
        file: img.file,
        altText: img.file.name || 'Pasted image',
      }));

      onSend(
        message,
        imageFiles.length > 0 ? imageFiles : undefined,
        selectedSkillId,
      );
      setMessage('');
      clearImages();
    };

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

    const handlePromptSelect = (promptContent: string) => {
      setMessage((prev) => (prev ? `${prev} ${promptContent}` : promptContent));
    };

    const handleImageSelect = (files: FileList | null) => {
      if (!files) return;
      const imageFiles = Array.from(files).filter((file) =>
        file.type.startsWith('image/'),
      );
      if (imageFiles.length > 0) {
        const result = addImages(imageFiles);
        if (result.limitExceeded) {
          showError(t('chatInput.imageLimitExceeded', { max: MAX_IMAGES }));
        }
      }
    };

    const canSend =
      (message.trim() || pendingImages.length > 0 || selectedSkillId) &&
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- intentional: empty string should use fallback
      (modelId || agentId);

    function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
      // Ensure emojis are preserved when pasting
      // Get the pasted text from clipboard
      const pastedText = e.clipboardData.getData('text/plain');

      // If there's no text or it's empty, let default behavior handle it
      if (!pastedText) return;

      // Prevent default to handle paste manually
      e.preventDefault();

      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      // Insert the pasted text at cursor position, preserving emojis
      const newValue =
        message.substring(0, start) + pastedText + message.substring(end);

      setMessage(newValue);

      // Set cursor position after pasted content
      // Need to wait for React to update
      setTimeout(() => {
        const newCursorPos = start + pastedText.length;
        target.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }

    return (
      <div
        ref={containerRef}
        className="w-full space-y-2"
        data-testid="chat-input"
      >
        <Card
          className={cn(
            'py-4',
            isDragging && 'border-2 border-dashed border-primary bg-primary/5',
          )}
        >
          <CardContent className="px-4">
            <div className="flex flex-col gap-4">
              <SourcesList
                sources={sources}
                onRemove={onRemoveSource}
                onDownload={onDownloadSource}
              />

              {pendingImages.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                  {pendingImages.map((image: PendingImage) => (
                    <PendingImageThumbnail
                      key={image.id}
                      image={image}
                      onRemove={removeImage}
                    />
                  ))}
                </div>
              )}

              <TextareaAutosize
                ref={textareaRef}
                maxRows={10}
                value={message}
                autoFocus
                onChange={(e) => setMessage(e.target.value)}
                onPaste={handlePaste}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={t('chatInput.placeholder')}
                aria-label={t('chatInput.placeholder')}
                className="border-0 border-none bg-transparent rounded-none resize-none focus:outline-none p-0"
                data-testid="input"
              />

              <div className="flex items-center justify-between">
                {/* Left side */}
                <div className="flex-shrink-0 flex space-x-2">
                  <PlusButton
                    onFileUpload={onFileUpload}
                    onImageSelect={handleImageSelect}
                    isFileSourceDisabled={!isEmbeddingModelEnabled}
                    isCreatingFileSource={isCreatingFileSource}
                    onPromptSelect={handlePromptSelect}
                    isImageUploadDisabled={!isVisionEnabled}
                  />
                  <AgentButton
                    selectedAgentId={agentId}
                    onAgentChange={onAgentChange}
                    isDisabled={isAgentChangeDisabled}
                  />
                  <AnonymousButton
                    isAnonymous={isAnonymous}
                    onAnonymousChange={onAnonymousChange}
                    isDisabled={isAnonymousChangeDisabled}
                    isEnforced={isAnonymousEnforced}
                  />
                  {agentId && (
                    <AgentBadge
                      agentId={agentId}
                      agent={agents.find((a) => a.id === agentId)}
                      isDisabled={isAgentChangeDisabled ?? false}
                      onRemove={onAgentRemove}
                    />
                  )}
                  {selectedSkillId && selectedSkillName && onSkillRemove && (
                    <SkillBadge
                      skillName={selectedSkillName}
                      onRemove={() => onSkillRemove()}
                    />
                  )}
                </div>

                <div className="flex-shrink-0 flex space-x-2">
                  <TooltipIf
                    condition={isModelChangeDisabled}
                    tooltip={t('chatInput.modelChangeDisabledTooltip')}
                  >
                    <ModelSelector
                      isDisabled={isModelChangeDisabled}
                      selectedModelId={modelId}
                      onModelChange={onModelChange}
                    />
                  </TooltipIf>
                  <MicrophoneButton
                    onTranscriptionComplete={(text) => {
                      setMessage((prev) => (prev ? `${prev} ${text}` : text));
                      // Focus textarea and place cursor at end after transcription
                      setTimeout(() => {
                        const textarea = textareaRef.current;
                        if (textarea) {
                          textarea.focus();
                          const length = textarea.value.length;
                          textarea.setSelectionRange(length, length);
                        }
                      }, 0);
                    }}
                  />
                  <SendButton
                    isStreaming={!!isStreaming}
                    canSend={!!canSend}
                    onSend={handleSend}
                    onCancel={onSendCancelled}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  },
);

ChatInput.displayName = 'ChatInput';

export default ChatInput;
