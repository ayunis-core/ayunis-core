import { useTranslation } from 'react-i18next';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { AnonymousButton } from './composer/AnonymousButton';
import { SkillBadge } from './composer/SkillBadge';
import { ModelSelector } from './model-presentation/ModelSelector';
import type { ConfiguredComposerProps } from './configured-composer-types';
import { AttachmentFields, VoiceField } from './composer-features';
import { ComposerToolbar, ToolbarSendButton } from './composer-toolbar';
import {
  IntegrationsMenuAction,
  KnowledgeBasesMenuAction,
} from './composer-menu-actions';
import { TourTarget } from './tour-target';

type ComposerControls = ConfiguredComposerProps & {
  readonly attachImages: (files: File[]) => void;
  readonly markVoiceInput: () => void;
  readonly onTranscript: (text: string) => void;
  readonly canSend: boolean;
  readonly submit: (text?: string) => void;
};

export function ComposerActions(props: ComposerControls) {
  const { tourTargets } = props.config;
  return (
    <ComposerToolbar
      leading={
        <>
          <TourTarget name={tourTargets?.upload} settles>
            <ComposerAttachmentControl {...props} />
          </TourTarget>
          <TourTarget name={tourTargets?.anonymous} settles>
            <ComposerAnonymousControl {...props} />
          </TourTarget>
          <ComposerSkillBadge {...props} />
        </>
      }
      model={<ComposerModelControl {...props} />}
      trailing={
        <>
          <ComposerVoiceControl {...props} />
          <ComposerSendControl {...props} />
        </>
      }
    />
  );
}

function ComposerAttachmentControl(props: ComposerControls) {
  const { config, features } = props;
  const hasMenuActions = Boolean(config.knowledgeBases || config.integrations);
  return (
    <AttachmentFields
      disabled={Boolean(props.isSubmitting)}
      closeMenu={Boolean(props.isSubmitting) || props.isStreaming}
      upload={features.uploadFiles}
      images={features.imageAttachments}
      onImages={props.attachImages}
      menuActions={
        hasMenuActions ? <ComposerMenuActions config={config} /> : null
      }
    />
  );
}

function ComposerMenuActions({
  config: { knowledgeBases, integrations },
}: Readonly<Pick<ConfiguredComposerProps, 'config'>>) {
  return (
    <>
      {knowledgeBases && (
        <KnowledgeBasesMenuAction
          items={knowledgeBases.items}
          status={knowledgeBases.status}
          attachedIds={knowledgeBases.attached.map(({ id }) => id)}
          onSelect={knowledgeBases.attach}
          onCreate={knowledgeBases.create}
        />
      )}
      {integrations && (
        <IntegrationsMenuAction
          items={integrations.items}
          status={integrations.status}
          attachedIds={integrations.attached.map(({ id }) => id)}
          onSelect={integrations.attach}
        />
      )}
    </>
  );
}

function ComposerAnonymousControl({ features }: ComposerControls) {
  const { anonymous } = features;
  return (
    <AnonymousButton
      isAnonymous={anonymous.isAnonymous}
      onAnonymousChange={anonymous.onChange}
      isDisabled={anonymous.disabled}
      isEnforced={anonymous.isEnforced}
    />
  );
}

function ComposerSkillBadge({ config }: ComposerControls) {
  const selected = config.skills?.selected;
  if (!selected || !config.skills) return null;
  return (
    <SkillBadge skillName={selected.name} onRemove={config.skills.clear} />
  );
}

function ComposerModelControl({ config, features }: ComposerControls) {
  const { t } = useTranslation('common');
  const { model, anonymous } = features;
  const selector = (
    <TourTarget name={config.tourTargets?.model}>
      <ModelSelector
        models={model.models}
        resolutions={model.resolutions}
        modelListPresentation={
          config.layout === 'narrow' ? 'submenu' : 'responsive'
        }
        placeholder={model.placeholder}
        isDisabled={model.disabled}
        isAnonymous={anonymous.isAnonymous}
        selectedModelId={model.value}
        onModelChange={model.onChange}
      />
    </TourTarget>
  );
  if (!model.locked) return selector;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>{selector}</div>
        </TooltipTrigger>
        <TooltipContent>
          {t('chatInput.modelChangeDisabledTooltip')}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ComposerVoiceControl(props: ComposerControls) {
  if (!props.features.voice) return null;
  return (
    <TourTarget name={props.config.tourTargets?.voice} settles>
      <VoiceField
        onTranscript={(text) => {
          props.onTranscript(text);
          props.markVoiceInput();
        }}
      />
    </TourTarget>
  );
}

function ComposerSendControl({
  config,
  isStreaming,
  isSubmitting,
  canSend,
  submit,
  onStop,
}: ComposerControls) {
  const inFlight = isStreaming || Boolean(isSubmitting);
  const control = (
    <ToolbarSendButton
      isStreaming={inFlight}
      canSend={canSend}
      submit={() => submit()}
      onStop={onStop}
    />
  );
  if (inFlight) return control;
  return (
    <TourTarget name={config.tourTargets?.send} settles>
      {control}
    </TourTarget>
  );
}
