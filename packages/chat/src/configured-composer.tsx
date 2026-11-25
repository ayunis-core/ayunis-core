import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  ChatComposer,
  canSubmitMessage,
  MAX_IMAGES,
  MAX_IMAGE_SIZE_MIB,
  MAX_TOTAL_IMAGE_SIZE_MIB,
  type useChatDraft,
  usePendingImages,
} from '@ayunis/chat/composer';
import type { ChatCapabilities } from './chat-surface-config';
import type {
  ChatConversationAdapters,
  ChatConversationSlots,
} from './chat-conversation-config';
import type { SendMessageInput } from './use-chat-run-lifecycle';
import { AttachmentFields, ModelField, VoiceField } from './composer-features';
import { useChatAction } from './use-chat-action';
import { ComposerToolbar, ToolbarSendButton } from './composer-toolbar';
import { ProcessingGlow } from './composer/ProcessingGlow';
import { usePromptHistory } from './composer/use-prompt-history';
import { useDraftCursorAtEnd } from './composer/use-draft-cursor-at-end';
import { insertTextPreservingUndo } from './composer/insert-text';
import {
  useComposerFileDrop,
  useComposerImagePaste,
} from './use-composer-file-drop';

interface ComposerProps {
  readonly threadId: string;
  readonly compact?: boolean;
  readonly isSubmitting?: boolean;
  readonly sentPrompts?: readonly string[];
  readonly capabilities: ChatCapabilities;
  readonly adapters?: ChatConversationAdapters;
  readonly draft: ReturnType<typeof useChatDraft>;
  readonly slots?: ChatConversationSlots;
  readonly isStreaming: boolean;
  readonly isCheckingForRun: boolean;
  readonly onSend: (input: SendMessageInput, accepted: () => void) => void;
  readonly onStop?: () => void;
}

function useSubmission(props: ComposerProps) {
  const {
    draft: { message, setMessage },
    capabilities,
    isStreaming,
    isCheckingForRun,
    onSend,
    adapters,
  } = props;
  const images = usePendingImages();
  const attachImages = useImageSelection(images, onAttachmentError(adapters));
  const upload = useChatAction(adapters?.onError, capabilities.fileUpload);
  const model = useChatAction(adapters?.onError, capabilities.modelSelection);
  const canSend = canSubmitMessage({
    text: message,
    hasAttachments: capabilities.fileUpload && images.pendingImages.length > 0,
    busy:
      isStreaming ||
      isCheckingForRun ||
      upload.busy ||
      model.busy ||
      Boolean(adapters?.isSendDisabled),
  });

  function submit() {
    if (!canSend) return;
    onSend(
      {
        text: message,
        images: capabilities.fileUpload
          ? images.getImagesForContext()
          : undefined,
      },
      () => {
        setMessage((current) => (current === message ? '' : current));
        images.clearImages();
      },
    );
  }

  return { images, canSend, submit, upload, model, attachImages };
}

export function ConfiguredComposer(props: ComposerProps) {
  const { isStreaming, capabilities, slots } = props;
  const submission = useSubmission(props);
  const textarea = useConfiguredTextarea(props, submission.submit);
  const container = useRef<HTMLDivElement>(null);
  const transfer = useComposerFileDrop(
    container,
    props,
    submission.upload,
    submission.attachImages,
  );
  const setFocused = useComposerImagePaste(
    container,
    props,
    submission.attachImages,
  );
  const runState = isStreaming ? 'streaming' : 'idle';
  const state = props.isSubmitting ? 'submitting' : runState;
  const composer = (
    <ChatComposer
      state={state}
      dragging={transfer.isDragging}
      animateHeight={Boolean(props.compact)}
      attachments={capabilities.fileUpload && slots?.attachments}
      images={capabilities.fileUpload ? submission.images.pendingImages : []}
      onRemoveImage={submission.images.removeImage}
      textarea={{
        ...textarea,
        onFocus: () => setFocused(true),
        onBlur: () => setFocused(false),
      }}
      actions={<ComposerActions {...props} {...submission} />}
    />
  );
  if (!props.compact) return composer;
  return (
    <div ref={container} className="w-full space-y-2" data-testid="chat-input">
      <ProcessingGlow isActive={isStreaming} className="chat-input-shell">
        {composer}
      </ProcessingGlow>
    </div>
  );
}

const NO_PROMPTS: readonly string[] = [];

function useConfiguredTextarea(props: ComposerProps, submit: () => void) {
  const {
    compact,
    threadId,
    isSubmitting,
    draft,
    sentPrompts = NO_PROMPTS,
  } = props;
  const { message, setMessage } = draft;
  const { t } = useTranslation('common');
  const ref = useRef<HTMLTextAreaElement>(null);
  useDraftCursorAtEnd(ref, compact ? threadId : undefined);
  const recall = usePromptHistory(message, setMessage, sentPrompts);
  const placeholder = compact ? t('chatInput.placeholder') : undefined;

  return {
    ref,
    value: message,
    'aria-label':
      placeholder ?? t('chatSurface.message', { defaultValue: 'Message' }),
    placeholder,
    onChange: ({ target }: React.ChangeEvent<HTMLTextAreaElement>) =>
      setMessage(target.value),
    onPaste: compact ? pasteWithUndo : undefined,
    onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (isSubmitting) return;
      if (
        event.key === 'Enter' &&
        !event.shiftKey &&
        !event.nativeEvent.isComposing
      ) {
        event.preventDefault();
        submit();
      } else {
        recall(event);
      }
    },
  };
}

function pasteWithUndo(event: ClipboardEvent<HTMLTextAreaElement>) {
  const text = event.clipboardData.getData('text/plain');
  if (text && insertTextPreservingUndo(event.currentTarget, text))
    event.preventDefault();
}

function onAttachmentError(adapters: ChatConversationAdapters | undefined) {
  return adapters?.onAttachmentError ?? adapters?.onError;
}

function useImageSelection(
  images: ReturnType<typeof usePendingImages>,
  onError?: (error: Error) => void,
) {
  const { t } = useTranslation('common');

  return (files: File[]) => {
    if (!files.length) return;
    const { oversizedRejected, limitExceeded, totalExceeded } =
      images.addImages(files);
    if (!onError) return;
    if (oversizedRejected) {
      onError(
        new Error(t('chatInput.imageTooLarge', { maxMiB: MAX_IMAGE_SIZE_MIB })),
      );
    }
    if (limitExceeded) {
      onError(
        new Error(t('chatInput.imageLimitExceeded', { max: MAX_IMAGES })),
      );
    }
    if (totalExceeded) {
      onError(
        new Error(
          t('chatInput.imageTotalTooLarge', {
            maxMiB: MAX_TOTAL_IMAGE_SIZE_MIB,
          }),
        ),
      );
    }
  };
}

type ComposerControls = ComposerProps & ReturnType<typeof useSubmission>;

function ComposerActions(props: ComposerControls) {
  const { capabilities, slots } = props;
  const attachments = <ComposerAttachmentControl {...props} />;
  const model = <ComposerModelControl {...props} />;
  const voice = <ComposerVoiceControl {...props} />;
  const send = <SendOrStop {...props} />;
  const host = (
    <HostComposerActions capabilities={capabilities} slots={slots} />
  );

  if (props.compact) {
    return (
      <ComposerToolbar
        leading={
          <>
            {attachments}
            {slots?.composerLeading}
            {host}
          </>
        }
        model={slots?.composerModel ?? model}
        trailing={
          <>
            {voice}
            {send}
          </>
        }
      />
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {attachments}
      {model}
      {voice}
      {host}
      {send}
    </div>
  );
}

function ComposerAttachmentControl(props: ComposerControls) {
  const {
    capabilities,
    threadId,
    compact,
    isStreaming,
    adapters,
    attachImages,
    upload,
  } = props;
  if (!capabilities.fileUpload) return null;
  return (
    <AttachmentFields
      threadId={threadId}
      compact={compact}
      disabled={isStreaming}
      upload={
        adapters?.documentAttachments === false
          ? undefined
          : adapters?.uploadFiles
      }
      action={upload}
      audio={capabilities.audio}
      images={adapters?.imageAttachments}
      onImages={attachImages}
      onError={onAttachmentError(adapters)}
    />
  );
}

function ComposerModelControl({
  capabilities,
  adapters,
  threadId,
  isStreaming,
  model,
}: ComposerControls) {
  if (!capabilities.modelSelection || !adapters?.model) return null;
  return (
    <ModelField
      threadId={threadId}
      disabled={isStreaming}
      adapter={adapters.model}
      action={model}
    />
  );
}

function ComposerVoiceControl({
  capabilities,
  adapters,
  compact,
  draft,
}: ComposerControls) {
  if (!capabilities.voice || !adapters?.transcribe) return null;
  return (
    <VoiceField
      compact={compact}
      transcribe={adapters.transcribe}
      onError={adapters.onError}
      onTranscript={(text) =>
        draft.setMessage((value) => (value ? value + ' ' + text : text))
      }
    />
  );
}

function HostComposerActions({
  capabilities,
  slots,
}: Readonly<Pick<ComposerProps, 'capabilities' | 'slots'>>) {
  return (
    <>
      {capabilities.skills && slots?.skills}
      {capabilities.knowledgeBases && slots?.knowledgeBases}
      {capabilities.integrations && slots?.integrations}
    </>
  );
}

function SendOrStop({
  isStreaming,
  canSend,
  submit,
  onStop,
  compact,
}: Readonly<{
  isStreaming: boolean;
  compact?: boolean;
  canSend: boolean;
  submit: () => void;
  onStop?: () => void;
}>) {
  const { t } = useTranslation('common');
  if (compact) {
    return (
      <ToolbarSendButton
        isStreaming={isStreaming}
        canSend={canSend}
        submit={submit}
        onStop={onStop}
      />
    );
  }
  return (
    <div className="ml-auto">
      {isStreaming ? (
        <Button
          type="button"
          data-testid="stop"
          disabled={!onStop}
          onClick={onStop}
        >
          {t('chatSurface.stop', { defaultValue: 'Stop' })}
        </Button>
      ) : (
        <Button
          type="button"
          data-testid="send"
          disabled={!canSend}
          onClick={submit}
        >
          {t('chatSurface.send', { defaultValue: 'Send' })}
        </Button>
      )}
    </div>
  );
}
