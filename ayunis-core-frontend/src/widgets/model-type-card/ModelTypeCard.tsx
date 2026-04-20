import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { Switch } from '@/shared/ui/shadcn/switch';
import { Label } from '@/shared/ui/shadcn/label';
import { Separator } from '@/shared/ui/shadcn/separator';
import {
  ModelWithConfigResponseDtoTier,
  type ModelWithConfigResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useTranslation } from 'react-i18next';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemTitle,
} from '@/shared/ui/shadcn/item';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';
import { Star } from 'lucide-react';
import { cn } from '@/shared/lib/shadcn/utils';
import { getFlagByProvider } from '@/shared/lib/getFlagByProvider';
import { getHostingPriority } from '@/features/models';

const TIER_FILLED_COUNT: Record<ModelWithConfigResponseDtoTier, number> = {
  [ModelWithConfigResponseDtoTier.low]: 1,
  [ModelWithConfigResponseDtoTier.medium]: 2,
  [ModelWithConfigResponseDtoTier.high]: 3,
};

interface ModelTierStarsProps {
  readonly tier: ModelWithConfigResponseDtoTier;
}

function ModelTierStars({ tier }: ModelTierStarsProps) {
  const { t } = useTranslation('admin-settings-models');
  const filled = TIER_FILLED_COUNT[tier];
  const tierLabel = t('models.tier.tooltip', {
    label: t(`models.tier.${tier}`),
  });
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="ml-1 inline-flex items-center align-middle"
          aria-label={tierLabel}
          tabIndex={0}
        >
          {[0, 1, 2].map((index) => (
            <Star
              key={index}
              className={cn(
                'h-3 w-3',
                index < filled
                  ? 'fill-current text-foreground'
                  : 'fill-none text-muted-foreground',
              )}
            />
          ))}
        </span>
      </TooltipTrigger>
      <TooltipContent>{tierLabel}</TooltipContent>
    </Tooltip>
  );
}

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

interface ModelTypeCardProps {
  readonly type: 'language' | 'embedding' | 'image-generation';
  readonly models: ModelWithConfigResponseDto[];
  readonly actions: ModelActions;
}

const MODEL_TYPE_CONFIG = {
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
  },
} as const;

export default function ModelTypeCard({
  type,
  models,
  actions,
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
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
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
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
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
            const flag = getFlagByProvider(model.provider);
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
                      {flag && <span className="mr-1">{flag}</span>}
                      {model.displayName || model.name}
                      {model.tier && <ModelTierStars tier={model.tier} />}
                    </ItemTitle>
                  </ItemContent>
                  <ItemActions>
                    {model.isPermitted && updatePermittedModel && (
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
                        disabled={isEnabling || isDisabling}
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
