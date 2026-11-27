import { useTranslation } from 'react-i18next';
import type { PermittedLanguageModelResponseDto } from '@ayunis/api-client/schemas';
import { AcademyGateNotice } from './model-presentation/AcademyGateNotice';
import { LongChatWarning } from './model-presentation/LongChatWarning';
import { ProviderFaultNotice } from './model-presentation/ProviderFaultNotice';
import { getModeValue } from './model-presentation/model-modes';
import type { ChatEvents } from './chat-config';
import type { ChatThreadSnapshot } from './chat-conversation-config';
import type {
  ComposerFeatures,
  ComposerModelControl,
} from './configured-composer-types';
import {
  useComposerEnvironment,
  useComposerModels,
  type ComposerModels,
} from './composer-data';
import { findThreadModel } from './find-thread-model';
import { useThreadSources } from './use-thread-sources';

const NO_SOURCES: NonNullable<ChatThreadSnapshot['sources']> = [];

function ignoreModelChange() {
  return undefined;
}

function lockedModelControl(
  models: ComposerModels,
  thread: ChatThreadSnapshot,
  model: PermittedLanguageModelResponseDto | undefined,
): ComposerModelControl {
  const value = thread.mode
    ? getModeValue(thread.mode)
    : (model?.id ?? thread.permittedModelId);
  return {
    models: models.models,
    resolutions: models.resolutions,
    value,
    placeholder: models.placeholder,
    disabled: true,
    locked: true,
    onChange: ignoreModelChange,
  };
}

/**
 * The composer of an existing chat: its model and anonymous mode are fixed,
 * files upload straight to the thread. A message sent while one is still
 * processing waits for it instead of blocking Send.
 */
export function useThreadComposer(thread: ChatThreadSnapshot) {
  const models = useComposerModels();
  const environment = useComposerEnvironment();
  const model = findThreadModel(models.models, thread);
  const files = useThreadSources(thread.id, thread.sources ?? NO_SOURCES);
  const features: ComposerFeatures = {
    model: lockedModelControl(models, thread, model),
    anonymous: { isAnonymous: Boolean(thread.isAnonymous), disabled: true },
    sources: files.sources,
    removeSource: files.remove,
    uploadFiles: environment.documents ? files.upload : undefined,
    imageAttachments: Boolean(model?.canVision),
    voice: environment.voice,
    sendDisabled: files.uploading || environment.academyGated,
  };
  return {
    features,
    model,
    academyGated: environment.academyGated,
    unavailable: Boolean(thread.permittedModelId && models.loaded && !model),
  };
}

export function ThreadComposerNotices({
  thread,
  model,
  academyGated,
  events,
}: Readonly<{
  thread: ChatThreadSnapshot;
  model?: PermittedLanguageModelResponseDto;
  academyGated: boolean;
  events: ChatEvents;
}>) {
  const { t } = useTranslation('chat');
  const { onNavigate } = events;
  return (
    <>
      <p className="mb-2 text-center text-xs text-muted-foreground">
        {t('chat.inputDisclaimer')}
      </p>
      {thread.isLongChat && (
        <LongChatWarning key={thread.id} onNewChat={events.onNewChat} />
      )}
      {academyGated && (
        <AcademyGateNotice
          className="mb-2"
          onOpenAcademy={
            onNavigate ? () => onNavigate({ kind: 'academy' }) : undefined
          }
        />
      )}
      {model?.hasProviderFault && (
        <ProviderFaultNotice modelName={model.displayName} />
      )}
    </>
  );
}
