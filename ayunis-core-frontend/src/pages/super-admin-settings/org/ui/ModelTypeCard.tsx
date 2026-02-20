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
import type { ModelWithConfigResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useSuperAdminDeletePermittedModel } from '../api/useSuperAdminDeletePermittedModel';
import { useSuperAdminUpdatePermittedModel } from '../api/useSuperAdminUpdatePermittedModel';
import { useSuperAdminEnableModel } from '../api/useSuperAdminEnableModel';
import { useTranslation } from 'react-i18next';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemTitle,
} from '@/shared/ui/shadcn/item';
import { cn } from '@/shared/lib/shadcn/utils';
import { getFlagByProvider } from '@/shared/lib/getFlagByProvider';

interface ModelTypeCardProps {
  readonly type: 'language' | 'embedding';
  readonly models: ModelWithConfigResponseDto[];
  readonly orgId: string;
}

// Priority order: DE (0) -> EU (1) -> US (2) -> Unknown (3)
function getHostingPriority(
  provider: ModelWithConfigResponseDto['provider'],
): number {
  switch (provider) {
    case 'otc':
    case 'ayunis':
    case 'synaforce':
    case 'ollama':
    case 'stackit':
      return 0; // DE
    case 'mistral':
    case 'bedrock':
    case 'azure':
      return 1; // EU
    case 'openai':
    case 'anthropic':
    case 'gemini':
      return 2; // US
    default:
      return 3;
  }
}

export default function ModelTypeCard({
  type,
  models,
  orgId,
}: ModelTypeCardProps) {
  const { t } = useTranslation('admin-settings-models');
  const { deletePermittedModel } = useSuperAdminDeletePermittedModel(orgId);
  const { updatePermittedModel } = useSuperAdminUpdatePermittedModel(orgId);
  const { enableModel, isEnabling } = useSuperAdminEnableModel(orgId);

  const title =
    type === 'language'
      ? t('models.languageModels')
      : t('models.embeddingModels');

  const emptyMessage =
    type === 'language'
      ? t('models.noLanguageModels')
      : t('models.noEmbeddingModels');

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
    if (!model.permittedModelId) return;
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
          {type === 'language'
            ? t('models.languageModelsDescription', {
                defaultValue: 'Models for text generation and conversation.',
              })
            : t('models.embeddingModelsDescription', {
                defaultValue: 'Models for document analysis and search.',
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
                    </ItemTitle>
                  </ItemContent>
                  <ItemActions>
                    {model.isPermitted && (
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
                        disabled={isEnabling}
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
