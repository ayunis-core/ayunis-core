import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type ClipboardEvent,
  type ForwardedRef,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChatComposer,
  canSubmitMessage,
  MAX_IMAGES,
  MAX_IMAGE_SIZE_MIB,
  MAX_TOTAL_IMAGE_SIZE_MIB,
  usePendingImages,
} from '@ayunis/chat/composer';
import { ChatAttachments } from '@ayunis/chat/attachments';
import { ProcessingGlow } from './composer/ProcessingGlow';
import { usePromptHistory } from './composer/use-prompt-history';
import { useDraftCursorAtEnd } from './composer/use-draft-cursor-at-end';
import { insertTextPreservingUndo } from './composer/insert-text';
import {
  useComposerFileDrop,
  useComposerImagePaste,
} from './use-composer-file-drop';
import { useComposerHeightAnimation } from './use-composer-height-animation';
import { ComposerActions } from './configured-composer-controls';
import { showComposerError } from './composer-errors';
import { TourTarget } from './tour-target';
import type {
  ConfiguredComposerProps,
  ConfiguredComposerRef,
} from './configured-composer-types';

function useSubmission(
  props: ConfiguredComposerProps,
  voiceInput: RefObject<boolean>,
) {
  const images = usePendingImages();
  const attachImages = useImageSelection(images);
  const busy = isComposerBusy(props);

  return {
    images,
    canSend: canSubmitDraft(props, images, busy, props.draft.message),
    submit: createSubmit(props, images, busy, voiceInput),
    attachImages,
    markVoiceInput: () => {
      voiceInput.current = true;
    },
  };
}

function isComposerBusy(props: ConfiguredComposerProps) {
  return (
    props.isStreaming ||
    Boolean(props.isSubmitting) ||
    props.isCheckingForRun ||
    props.features.sendDisabled
  );
}

function canSubmitDraft(
  props: ConfiguredComposerProps,
  images: ReturnType<typeof usePendingImages>,
  busy: boolean,
  text: string,
) {
  return canSubmitMessage({
    text,
    hasAttachments: images.pendingImages.length > 0,
    hasSkill: Boolean(props.config.skills?.selected),
    busy,
  });
}

function createSubmit(
  props: ConfiguredComposerProps,
  images: ReturnType<typeof usePendingImages>,
  busy: boolean,
  voiceInput: RefObject<boolean>,
) {
  return (text = props.draft.message) => {
    if (!canSubmitDraft(props, images, busy, text)) return;
    props.onSend(
      {
        text,
        images: images.getImagesForContext(),
        skillId: props.config.skills?.selected?.id,
        voiceInput: voiceInput.current,
      },
      () => acceptSubmission(props, images, text),
    );
    if (props.clearImagesOnSend) images.clearImages();
  };
}

function acceptSubmission(
  props: ConfiguredComposerProps,
  images: ReturnType<typeof usePendingImages>,
  text: string,
) {
  props.draft.setMessage((current) => (current === text ? '' : current));
  images.clearImages();
}

export const ConfiguredComposer = forwardRef<
  ConfiguredComposerRef,
  ConfiguredComposerProps
>(function ConfiguredComposer(props, forwardedRef) {
  const state = useConfiguredComposerState(props, forwardedRef);
  const processing = props.isStreaming || Boolean(props.isSubmitting);
  return (
    <div
      ref={state.container}
      className="w-full space-y-2"
      data-testid="chat-input"
    >
      <ProcessingGlow
        isActive={processing}
        className="chat-input-shell"
        aria-busy={processing}
        data-processing={processing ? 'true' : undefined}
      >
        <TourTarget name={props.config.tourTargets?.composer} settles>
          <ComposerBody props={props} state={state} />
        </TourTarget>
      </ProcessingGlow>
    </div>
  );
});

function useConfiguredComposerState(
  props: ConfiguredComposerProps,
  forwardedRef: ForwardedRef<ConfiguredComposerRef>,
) {
  const voiceInput = useRef(false);
  const submission = useSubmission(props, voiceInput);
  const textarea = useConfiguredTextarea(props, submission.submit);
  const container = useRef<HTMLDivElement>(null);
  const animateHeight = useComposerHeightAnimation(true);
  useEffect(() => {
    if (!props.draft.message) voiceInput.current = false;
  }, [props.draft.message]);
  useConfiguredComposerHandle(forwardedRef, props, submission);
  const transfer = useComposerFileDrop(
    container,
    props,
    submission.attachImages,
  );
  const setFocused = useComposerImagePaste(
    container,
    props,
    submission.attachImages,
  );
  return {
    submission,
    textarea,
    container,
    animateHeight,
    transfer,
    setFocused,
    appendTranscript: (text: string) =>
      appendTranscript(props.draft, textarea.ref, text),
  };
}

function useConfiguredComposerHandle(
  forwardedRef: ForwardedRef<ConfiguredComposerRef>,
  props: ConfiguredComposerProps,
  submission: ReturnType<typeof useSubmission>,
) {
  useImperativeHandle(forwardedRef, () => ({
    setMessage: props.draft.setMessage,
    sendMessage: submission.submit,
    restoreFailedSubmission: (text, files) => {
      if (props.draft.message.trim() || submission.images.pendingImages.length)
        return false;
      props.draft.setMessage(text);
      if (files.length) submission.images.addImages(files);
      return true;
    },
  }));
}

type ConfiguredComposerState = ReturnType<typeof useConfiguredComposerState>;

function ComposerBody({
  props,
  state,
}: Readonly<{
  props: ConfiguredComposerProps;
  state: ConfiguredComposerState;
}>) {
  const runState = props.isStreaming ? 'streaming' : 'idle';
  const submissionState = props.isSubmitting ? 'submitting' : runState;
  return (
    <ChatComposer
      state={submissionState}
      dragging={state.transfer.isDragging}
      animateHeight={state.animateHeight}
      attachments={composerAttachments(props)}
      images={state.submission.images.pendingImages}
      onRemoveImage={state.submission.images.removeImage}
      textarea={{
        ...state.textarea,
        onFocus: () => state.setFocused(true),
        onBlur: () => state.setFocused(false),
      }}
      actions={
        <ComposerActions
          {...props}
          {...state.submission}
          onTranscript={state.appendTranscript}
        />
      }
    />
  );
}

function composerAttachments({ config, features }: ConfiguredComposerProps) {
  const knowledgeBases = config.knowledgeBases?.attached ?? [];
  const integrations = config.integrations?.attached ?? [];
  const hasSources = features.sources.some(
    ({ createdBy }) => createdBy !== 'system',
  );
  if (!hasSources && !knowledgeBases.length && !integrations.length)
    return undefined;
  return (
    <ChatAttachments
      sources={features.sources}
      knowledgeBases={knowledgeBases}
      integrations={integrations}
      onRemoveSource={features.removeSource}
      onRemoveKnowledgeBase={config.knowledgeBases?.detach}
      onRemoveIntegration={config.integrations?.detach}
    />
  );
}

const NO_PROMPTS: readonly string[] = [];

function useConfiguredTextarea(
  props: ConfiguredComposerProps,
  submit: () => void,
) {
  const { threadId, isSubmitting, draft, sentPrompts = NO_PROMPTS } = props;
  const { message, setMessage } = draft;
  const { t } = useTranslation('common');
  const ref = useRef<HTMLTextAreaElement>(null);
  useDraftCursorAtEnd(ref, threadId);
  const recall = usePromptHistory(message, setMessage, sentPrompts);
  const placeholder = props.placeholder ?? t('chatInput.placeholder');

  return {
    ref,
    value: message,
    'aria-label': placeholder,
    placeholder,
    onChange: ({ target }: React.ChangeEvent<HTMLTextAreaElement>) =>
      setMessage(target.value),
    onPaste: pasteWithUndo,
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

function appendTranscript(
  draft: ConfiguredComposerProps['draft'],
  textarea: RefObject<HTMLTextAreaElement | null>,
  text: string,
) {
  const field = textarea.current;
  const insertion = field?.value ? ` ${text}` : text;
  if (field && insertTextPreservingUndo(field, insertion, 'end')) return;
  draft.setMessage((value) => (value ? `${value} ${text}` : text));
  setTimeout(() => focusAtEnd(textarea), 0);
}

function focusAtEnd(textarea: RefObject<HTMLTextAreaElement | null>) {
  const field = textarea.current;
  if (!field) return;
  field.focus();
  const end = field.value.length;
  field.setSelectionRange(end, end);
}

function useImageSelection(images: ReturnType<typeof usePendingImages>) {
  const { t } = useTranslation('common');

  return (files: File[]) => {
    if (!files.length) return;
    const { oversizedRejected, limitExceeded, totalExceeded } =
      images.addImages(files);
    if (oversizedRejected) {
      showComposerError(
        t('chatInput.imageTooLarge', { maxMiB: MAX_IMAGE_SIZE_MIB }),
      );
    }
    if (limitExceeded) {
      showComposerError(t('chatInput.imageLimitExceeded', { max: MAX_IMAGES }));
    }
    if (totalExceeded) {
      showComposerError(
        t('chatInput.imageTotalTooLarge', {
          maxMiB: MAX_TOTAL_IMAGE_SIZE_MIB,
        }),
      );
    }
  };
}
