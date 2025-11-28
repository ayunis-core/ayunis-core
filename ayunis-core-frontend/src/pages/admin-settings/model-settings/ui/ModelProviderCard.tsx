import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { Switch } from '@/shared/ui/shadcn/switch';
import { Label } from '@/shared/ui/shadcn/label';
import { Separator } from '@/shared/ui/shadcn/separator';
import { Badge } from '@/shared/ui/shadcn/badge';
import {
  ModelProviderWithPermittedStatusResponseDtoHostedIn,
  type ModelWithConfigResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useCreatePermittedModel } from '../api/useCreatePermittedModel';
import { useDeletePermittedModel } from '../api/useDeletePermittedModel';
import { useUpdatePermittedModel } from '../api/useUpdatePermittedModel';
import { useCreatePermittedProvider } from '../api/useCreatePermittedProvider';
import { useDeletePermittedProvider } from '../api/useDeletePermittedProvider';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/shadcn/button';
import type { Provider } from '../model/openapi';
import ProviderConfirmationDialog from './ProviderConfirmationDialog';
import TooltipIf from '@/widgets/tooltip-if/ui/TooltipIf';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/shared/ui/shadcn/item';
import { cn } from '@/shared/lib/shadcn/utils';

interface ModelProviderCardProps {
  provider: Provider;
  models: ModelWithConfigResponseDto[];
}

export default function ModelProviderCard({
  provider,
  models,
}: ModelProviderCardProps) {
  const { t } = useTranslation('admin-settings-models');
  const { createPermittedModel } = useCreatePermittedModel();
  const { deletePermittedModel } = useDeletePermittedModel();
  const { updatePermittedModel } = useUpdatePermittedModel();
  const { createPermittedProvider } = useCreatePermittedProvider();
  const { deletePermittedProvider } = useDeletePermittedProvider();

  const hostedInLabel: Record<
    ModelProviderWithPermittedStatusResponseDtoHostedIn,
    string
  > = {
    DE: t('models.hostedIn.de'),
    US: t('models.hostedIn.us'),
    EU: t('models.hostedIn.eu'),
    SELF_HOSTED: t('models.hostedIn.selfHosted'),
    AYUNIS: t('models.hostedIn.ayunis'),
  };

  function handleProviderToggle() {
    if (provider.isPermitted) {
      // Delete permitted provider
      deletePermittedProvider({
        provider: provider.provider,
      });
    } else {
      // Create permitted provider
      createPermittedProvider({
        provider: provider.provider,
      });
    }
  }

  function handleModelToggle(
    model: ModelWithConfigResponseDto,
    isPermitted: boolean,
  ) {
    if (isPermitted) {
      createPermittedModel({
        modelId: model.modelId,
      });
      return;
    }
    if (!isPermitted && model.permittedModelId) {
      deletePermittedModel(model.permittedModelId);
      return;
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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>{provider.displayName}</span>
        </CardTitle>
        <CardDescription>{hostedInLabel[provider.hostedIn]}</CardDescription>
        <CardAction>
          <ProviderConfirmationDialog
            provider={provider}
            onConfirm={handleProviderToggle}
          >
            <Button variant="outline" size="sm">
              <span>
                {provider.isPermitted
                  ? t('models.disableProvider')
                  : t('models.enableProvider')}
              </span>
            </Button>
          </ProviderConfirmationDialog>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {models
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((model, index) => {
              const modelKey = `model-${provider.provider}:${model.name}`;
              return (
                <div key={index}>
                  <Item
                    key={modelKey}
                    className={cn(
                      index === 0 && 'pt-0',
                      index === models.length - 1 && 'pb-0',
                      'px-0',
                    )}
                  >
                    <ItemContent>
                      <ItemTitle>
                        {model.displayName || model.name}
                        {model.canStream && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-xs">
                                {t('models.streaming')}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              {t('models.streamingTooltip')}
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {model.canUseTools && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-xs">
                                {t('models.tools')}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              {t('models.toolsTooltip')}
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {model.isReasoning && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-xs">
                                {t('models.reasoning')}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              {t('models.reasoningTooltip')}
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {model.isEmbedding && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-xs">
                                {t('models.embedding')}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              {t('models.embeddingTooltip')}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </ItemTitle>
                      <ItemDescription>{model.name}</ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      {model.isPermitted && (
                        <>
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
                        </>
                      )}
                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor={modelKey}
                          className="text-sm text-muted-foreground"
                        >
                          {t('models.permitted')}
                        </Label>
                        <TooltipIf
                          condition={!provider.isPermitted}
                          tooltip={t('models.providerDisabled')}
                        >
                          <Switch
                            id={modelKey}
                            disabled={!provider.isPermitted}
                            checked={model.isPermitted}
                            onCheckedChange={(isPermitted) =>
                              handleModelToggle(model, isPermitted)
                            }
                          />
                        </TooltipIf>
                      </div>
                    </ItemActions>
                  </Item>
                  {index < models.length - 1 && <Separator />}
                </div>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
}
