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
import { useSuperAdminCreatePermittedModel } from '../api/useSuperAdminCreatePermittedModel';
import { useSuperAdminDeletePermittedModel } from '../api/useSuperAdminDeletePermittedModel';
import { useSuperAdminCreatePermittedProvider } from '../api/useSuperAdminCreatePermittedProvider';
import { useSuperAdminDeletePermittedProvider } from '../api/useSuperAdminDeletePermittedProvider';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/shadcn/button';
import ProviderConfirmationDialog from './ProviderConfirmationDialog';
import TooltipIf from '@/widgets/tooltip-if/ui/TooltipIf';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';
import type { ModelProviderWithPermittedStatusResponseDto } from '@/shared/api';

interface ModelProviderCardProps {
  provider: ModelProviderWithPermittedStatusResponseDto;
  models: ModelWithConfigResponseDto[];
  orgId: string;
}

export default function ModelProviderCard({
  provider,
  models,
  orgId,
}: ModelProviderCardProps) {
  const { t } = useTranslation('admin-settings-models');
  const { createPermittedModel } = useSuperAdminCreatePermittedModel(orgId);
  const { deletePermittedModel } = useSuperAdminDeletePermittedModel(orgId);
  const { createPermittedProvider } =
    useSuperAdminCreatePermittedProvider(orgId);
  const { deletePermittedProvider } =
    useSuperAdminDeletePermittedProvider(orgId);

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
      deletePermittedProvider({
        provider: provider.provider,
      });
    } else {
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
        <div className="space-y-3">
          {models
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((model, index) => {
              const modelKey = `model-${provider.provider}:${model.name}`;
              return (
                <div key={modelKey} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={modelKey} className="font-medium">
                          {model.displayName || model.name}
                        </Label>
                        <div className="flex gap-1">
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
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {model.name}
                      </p>
                    </div>
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
                  {index < models.length - 1 && <Separator />}
                </div>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
}
