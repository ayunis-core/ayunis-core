import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import type { ChatConversationAdapters } from './chat-conversation-config';
import type { ConfiguredComposerProps } from './configured-composer-types';
import type { useChatAction } from './use-chat-action';
import { AttachmentFields, ModelField, VoiceField } from './composer-features';
import { ComposerToolbar, ToolbarSendButton } from './composer-toolbar';

type ComposerControls = ConfiguredComposerProps & {
  readonly attachImages: (files: File[]) => void;
  readonly upload: ReturnType<typeof useChatAction>;
  readonly model: ReturnType<typeof useChatAction>;
  readonly markVoiceInput: () => void;
  readonly onTranscript: (text: string) => void;
  readonly canSend: boolean;
  readonly submit: (text?: string) => void;
};

export function ComposerActions(props: ComposerControls) {
  const { capabilities, slots } = props;
  const attachments = <ComposerAttachmentControl {...props} />;
  const model = <ComposerModelControl {...props} />;
  const voice = <ComposerVoiceControl {...props} />;
  const send = <SendOrStop {...props} />;

  if (props.compact) {
    return (
      <ComposerToolbar
        leading={
          <>
            {attachments}
            {slots?.composerLeading}
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
      <HostComposerActions capabilities={capabilities} slots={slots} />
      {send}
    </div>
  );
}

function ComposerAttachmentControl(props: ComposerControls) {
  const hasMenuActions = hasComposerMenuActions(props);
  if (!props.capabilities.fileUpload && !hasMenuActions) return null;
  const uploadsEnabled = Boolean(props.capabilities.fileUpload);
  const control = (
    <AttachmentFields
      threadId={props.threadId}
      compact={props.compact}
      disabled={attachmentsDisabled(props)}
      closeMenu={Boolean(props.isSubmitting) || props.isStreaming}
      upload={uploadsEnabled ? documentUpload(props.adapters) : undefined}
      action={props.upload}
      audio={uploadsEnabled && props.capabilities.audio}
      images={uploadsEnabled && props.adapters?.imageAttachments}
      onImages={props.attachImages}
      onError={onAttachmentError(props.adapters)}
      menuActions={hasMenuActions ? <HostComposerActions {...props} /> : null}
      fileInputTestId={props.fileInputTestId}
    />
  );
  return wrapControl(control, props.slots?.composerAttachmentControl);
}

function hasComposerMenuActions({
  capabilities,
  slots,
}: Pick<ComposerControls, 'capabilities' | 'slots'>) {
  const skills = capabilities.skills && Boolean(slots?.skills);
  const knowledge =
    capabilities.knowledgeBases && Boolean(slots?.knowledgeBases);
  const integrations =
    capabilities.integrations && Boolean(slots?.integrations);
  return skills || knowledge || integrations;
}

function attachmentsDisabled({
  isSubmitting,
  isStreaming,
  adapters,
}: Pick<ComposerControls, 'isSubmitting' | 'isStreaming' | 'adapters'>) {
  return (
    Boolean(isSubmitting) ||
    (isStreaming && !adapters?.allowAttachmentsWhileStreaming)
  );
}

function documentUpload(adapters: ChatConversationAdapters | undefined) {
  return adapters?.documentAttachments === true
    ? adapters.uploadFiles
    : undefined;
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
  markVoiceInput,
  onTranscript,
  slots,
}: ComposerControls) {
  if (!capabilities.voice || !adapters?.transcribe) return null;
  const control = (
    <VoiceField
      compact={compact}
      transcribe={adapters.transcribe}
      onError={adapters.onError}
      onTranscript={(text) => {
        onTranscript(text);
        markVoiceInput();
      }}
    />
  );
  return wrapControl(control, slots?.composerVoiceControl);
}

function HostComposerActions({
  capabilities,
  slots,
}: Readonly<Pick<ConfiguredComposerProps, 'capabilities' | 'slots'>>) {
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
  isSubmitting,
  canSend,
  submit,
  onStop,
  compact,
  slots,
  stopTestId,
}: ComposerControls): ReactNode {
  const inFlight = isStreaming || Boolean(isSubmitting);
  if (!compact) {
    return (
      <LabeledSendOrStop
        inFlight={inFlight}
        canSend={canSend}
        submit={submit}
        onStop={onStop}
      />
    );
  }
  const control = (
    <ToolbarSendButton
      isStreaming={inFlight}
      canSend={canSend}
      submit={() => submit()}
      onStop={onStop}
      stopTestId={stopTestId}
    />
  );
  const decorated = inFlight
    ? control
    : wrapControl(control, slots?.composerSendControl);
  return <>{decorated}</>;
}

function LabeledSendOrStop({
  inFlight,
  canSend,
  submit,
  onStop,
}: Readonly<{
  inFlight: boolean;
  canSend: boolean;
  submit: () => void;
  onStop?: () => void;
}>) {
  const { t } = useTranslation('common');
  return (
    <div className="ml-auto">
      {inFlight ? (
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
          onClick={() => submit()}
        >
          {t('chatSurface.send', { defaultValue: 'Send' })}
        </Button>
      )}
    </div>
  );
}

function onAttachmentError(adapters: ChatConversationAdapters | undefined) {
  return adapters?.onAttachmentError ?? adapters?.onError;
}

function wrapControl(
  content: ReactNode,
  decorate?: (content: ReactNode) => ReactNode,
) {
  return decorate?.(content) ?? content;
}
