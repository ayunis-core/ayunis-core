import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Switch } from '@ayunis/ui/components/switch';
import { Label } from '@ayunis/ui/components/label';
import { Separator } from '@ayunis/ui/components/separator';
import type { ModelWithConfigResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useTranslation } from 'react-i18next';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@ayunis/ui/components/item';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@ayunis/ui/components/popover';
import { CircleHelp } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { cn } from '@ayunis/ui/lib/cn';
import { getHostingPriority } from '@/shared/lib/model-provider-metadata';
import { ProviderFlag } from '@/shared/ui/provider-flag';
import { ModelInfoCard } from '@/widgets/model-select-options';

export interface ModelActions {
  readonly deletePermittedModel: (permittedModelId: string) => void;
  readonly updatePermittedModel?: (params: {
    permittedModelId: string;
    anonymousOnly: boolean;
  }) => void;
  readonly enableModel: (model: ModelWithConfigResponseDto) => void;
  readonly isEnabling: boolean;
  readonly isDisabling?: boolean;
}

type ModelType = 'language' | 'embedding' | 'image-generation';

interface ModelTypeCardProps {
  readonly type: ModelType;
  readonly models: ModelWithConfigResponseDto[];
  readonly actions: ModelActions;
  readonly testIdPrefix?: string;
  readonly isToggleDisabled?: (model: ModelWithConfigResponseDto) => boolean;
}

interface ModelTypeConfig {
  readonly titleKey: string;
  readonly descriptionKey: string;
  readonly emptyKey: string;
  readonly defaultDescription: string;
  readonly hintKey?: string;
}

const MODEL_TYPE_CONFIG: Record<ModelType, ModelTypeConfig> = {
  language: {
    titleKey: 'models.languageModels',
    descriptionKey: 'models.languageModelsDescription',
    emptyKey: 'models.noLanguageModels',
    defaultDescription: 'Models for text generation and conversation.',
  },
  embedding: {
    titleKey: 'models.embeddingModels',
    descriptionKey: 'models.embeddingModelsDescription',
    emptyKey: 'models.noEmbeddingModels',
    defaultDescription: 'Models for document analysis and search.',
  },
  'image-generation': {
    titleKey: 'models.imageGenerationModels',
    descriptionKey: 'models.imageGenerationModelsDescription',
    emptyKey: 'models.noImageGenerationModels',
    defaultDescription: 'Models for image generation and visual creation.',
    hintKey: 'models.imageGenerationModelsHint',
  },
};

interface ModelTypeCardTitleProps {
  readonly title: string;
  readonly hintKey?: string;
}

// The trigger is a real button so the hint is reachable by keyboard, not hover
// only. Its accessible name names the section rather than repeating the hint,
// which Radix already exposes as the description via aria-describedby.
function ModelTypeCardTitle({ title, hintKey }: ModelTypeCardTitleProps) {
  const { t } = useTranslation('admin-settings-models');
  if (!hintKey) return <CardTitle>{title}</CardTitle>;

  return (
    <CardTitle className="flex items-center gap-1">
      {title}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={t('models.hintTriggerLabel', { label: title })}
            data-testid="model-type-card-hint-trigger"
          >
            <CircleHelp />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{t(hintKey)}</TooltipContent>
      </Tooltip>
    </CardTitle>
  );
}

// Same name, category label and hover info card as the chat model selector.
function ModelTitleWithInfo({
  model,
}: {
  readonly model: ModelWithConfigResponseDto;
}) {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const displayName = model.displayName || model.name;

  return (
    // An anchor, not a PopoverTrigger: a trigger's click toggles, which would
    // close the card a hover or touch tap just opened. Escape and outside
    // clicks still close it through onOpenChange.
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-left"
          aria-expanded={open}
          data-testid="model-type-card-model-info-trigger"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onClick={() => setOpen(true)}
        >
          <ProviderFlag provider={model.provider} />
          {displayName}
          {model.tier && (
            <span className="text-muted-foreground text-xs font-normal">
              {t(`models.category.${model.tier}`)}
            </span>
          )}
        </button>
      </PopoverAnchor>
      <PopoverContent
        side="bottom"
        align="start"
        className="pointer-events-none w-80"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ModelInfoCard model={{ ...model, displayName }} />
      </PopoverContent>
    </Popover>
  );
}

export default function ModelTypeCard({
  type,
  models,
  actions,
  testIdPrefix,
  isToggleDisabled,
}: ModelTypeCardProps) {
  const { t } = useTranslation('admin-settings-models');
  const {
    deletePermittedModel,
    updatePermittedModel,
    enableModel,
    isEnabling,
    isDisabling,
  } = actions;

  const config = MODEL_TYPE_CONFIG[type];
  // Only language models enforce anonymous mode (on their threads); the flag
  // has no effect on embedding or image-generation models.
  const canSetAnonymousOnly = type === 'language' && !!updatePermittedModel;
  const title = t(config.titleKey);
  const emptyMessage = t(config.emptyKey);

  function handleModelToggle(
    model: ModelWithConfigResponseDto,
    isPermitted: boolean,
  ) {
    // eslint-disable-next-line sonarjs/no-selector-parameter
    if (isPermitted) {
      // eslint-disable-next-line sonarjs/void-use
      void enableModel(model);
    } else if (model.permittedModelId) {
      deletePermittedModel(model.permittedModelId);
    }
  }

  function handleAnonymousOnlyToggle(
    model: ModelWithConfigResponseDto,
    anonymousOnly: boolean,
  ) {
    if (!model.permittedModelId || !updatePermittedModel) return;
    updatePermittedModel({
      permittedModelId: model.permittedModelId,
      anonymousOnly,
    });
  }

  // Sort by hosting region (DE -> EU -> US), then alphabetically by display name
  const sortedModels = [...models].sort((a, b) => {
    const priorityDiff =
      getHostingPriority(a.provider) - getHostingPriority(b.provider);
    if (priorityDiff !== 0) return priorityDiff;
    return (a.displayName || a.name).localeCompare(b.displayName || b.name);
  });

  if (models.length === 0) {
    return (
      <Card
        data-testid={testIdPrefix ? `${testIdPrefix}-${type}-card` : undefined}
      >
        <CardHeader>
          <ModelTypeCardTitle title={title} hintKey={config.hintKey} />
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            {emptyMessage}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      data-testid={testIdPrefix ? `${testIdPrefix}-${type}-card` : undefined}
    >
      <CardHeader>
        <ModelTypeCardTitle title={title} hintKey={config.hintKey} />
        <CardDescription>
          {t(config.descriptionKey, {
            defaultValue: config.defaultDescription,
          })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sortedModels.map((model, index) => {
            const modelKey = `model-${model.provider}:${model.name}`;
            return (
              <div key={modelKey}>
                <Item
                  className={cn(
                    index === 0 && 'pt-0',
                    index === sortedModels.length - 1 && 'pb-0',
                    'px-0',
                  )}
                >
                  <ItemContent>
                    <ItemTitle>
                      <ModelTitleWithInfo model={model} />
                    </ItemTitle>
                    {model.displayName && (
                      <ItemDescription>{model.name}</ItemDescription>
                    )}
                  </ItemContent>
                  <ItemActions>
                    {model.isPermitted && canSetAnonymousOnly && (
                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor={`${modelKey}-anonymous`}
                          className="text-sm text-muted-foreground"
                        >
                          {t('models.anonymousOnly')}
                        </Label>

                        <Switch
                          id={`${modelKey}-anonymous`}
                          checked={model.anonymousOnly ?? false}
                          onCheckedChange={(anonymousOnly) =>
                            handleAnonymousOnlyToggle(model, anonymousOnly)
                          }
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor={modelKey}
                        className="text-sm text-muted-foreground"
                      >
                        {t('models.permitted')}
                      </Label>
                      <Switch
                        id={modelKey}
                        data-testid={
                          testIdPrefix
                            ? `${testIdPrefix}-${model.modelId}-toggle`
                            : undefined
                        }
                        disabled={
                          isEnabling ||
                          isDisabling ||
                          (isToggleDisabled?.(model) ?? false)
                        }
                        checked={model.isPermitted}
                        onCheckedChange={(isPermitted) =>
                          handleModelToggle(model, isPermitted)
                        }
                      />
                    </div>
                  </ItemActions>
                </Item>
                {index < sortedModels.length - 1 && <Separator />}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
