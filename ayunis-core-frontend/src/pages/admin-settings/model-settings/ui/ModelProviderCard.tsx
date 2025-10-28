// Types
import type { Provider } from "../model/openapi";
import type { ModelWithConfigResponseDto } from "@/shared/api/generated/ayunisCoreAPI.schemas";

// Utils
import { useTranslation } from "react-i18next";
import { useState } from "react";

// Ui
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/shadcn/card";
import { Switch } from "@/shared/ui/shadcn/switch";
import { Label } from "@/shared/ui/shadcn/label";
import { Separator } from "@/shared/ui/shadcn/separator";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Avatar } from "@/shared/ui/shadcn/avatar";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/ui/shadcn/tooltip";
import ProviderConfirmationDialog from "@/entities/model/ui/ProviderConfirmationDialog";

// API
import { ModelProviderWithPermittedStatusResponseDtoHostedIn } from "@/shared/api/generated/ayunisCoreAPI.schemas";
import { useCreatePermittedModel } from "../api/useCreatePermittedModel";
import { useDeletePermittedModel } from "../api/useDeletePermittedModel";
import { useCreatePermittedProvider } from "../api/useCreatePermittedProvider";
import { useDeletePermittedProvider } from "../api/useDeletePermittedProvider";

// Widgets
import TooltipIf from "@/widgets/tooltip-if/ui/TooltipIf";

// Static
import mistralLogo from "@/shared/assets/models/mistral-logo.png";
import anthropicLogo from "@/shared/assets/models/anthropic-logo.png";
import openaiLogo from "@/shared/assets/models/openai-logo.svg";

interface ModelProviderCardProps {
  provider: Provider;
  models: ModelWithConfigResponseDto[];
}

export default function ModelProviderCard({
  provider,
  models,
}: ModelProviderCardProps) {
  const { t } = useTranslation("admin-settings-models");
  const { createPermittedModel } = useCreatePermittedModel();
  const { deletePermittedModel } = useDeletePermittedModel();
  const { createPermittedProvider } = useCreatePermittedProvider();
  const { deletePermittedProvider } = useDeletePermittedProvider();

  const hostedInLabel: Record<
    ModelProviderWithPermittedStatusResponseDtoHostedIn,
    string
  > = {
    DE: t("models.hostedIn.de"),
    US: t("models.hostedIn.us"),
    EU: t("models.hostedIn.eu"),
    SELF_HOSTED: t("models.hostedIn.selfHosted"),
    AYUNIS: t("models.hostedIn.ayunis"),
  };

  function getProviderLogo(): string | undefined {
    switch (provider.provider) {
      case "mistral":
        return mistralLogo;
      case "anthropic":
        return anthropicLogo;
      case "openai":
        return openaiLogo;
      default:
        return undefined;
    }
  }

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
  const logoSrc = getProviderLogo();
  const [expanded, setExpanded] = useState<boolean>(provider.isPermitted);

  return (
    <Card className="rounded-3xl border-0 shadow-sm">
      <CardHeader className="gap-0">
        <CardTitle className="flex items-center gap-3">
          <Avatar className="flex items-center h-10 w-10 justify-center rounded-sm shadow-sm">
            {logoSrc ? (
              <img src={logoSrc} alt={provider.displayName} className="h-6 w-6 rounded-sm" />
            ) : (
              <div className="h-6 w-6 rounded-sm bg-accent text-foreground flex items-center justify-center text-xs font-semibold">
                {provider.displayName.slice(0, 2)}
              </div>
            )}
          </Avatar>
          <div className="flex flex-col">
            <span className="text-base font-semibold">{provider.displayName}</span>
            <CardDescription className="text-sm font-normal">{hostedInLabel[provider.hostedIn]}</CardDescription>
          </div>
        </CardTitle>

        <CardAction className="flex items-center gap-2 my-auto ml-5">
          {!provider.isPermitted && (
            <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
              {t("models.providerConfirmation.learnMore")}
            </Button>
          )}
          <ProviderConfirmationDialog
            provider={provider}
            onConfirm={handleProviderToggle}
          >
            <Button variant="outline" size="sm">
              <span>
                {provider.isPermitted
                  ? t("models.disableProvider")
                  : t("models.enableProvider")}
              </span>
            </Button>
          </ProviderConfirmationDialog>
        </CardAction>
      </CardHeader>
      {expanded && (
      <CardContent>
        <div className="space-y-3">
          {models
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((model, index) => {
              const modelKey = `model-${provider}:${model.name}`;
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
                                  {t("models.streaming")}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                {t("models.streamingTooltip")}
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {model.canUseTools && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="text-xs">
                                  {t("models.tools")}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                {t("models.toolsTooltip")}
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {model.isReasoning && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="text-xs">
                                  {t("models.reasoning")}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                {t("models.reasoningTooltip")}
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {model.isEmbedding && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="text-xs">
                                  {t("models.embedding")}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                {t("models.embeddingTooltip")}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>

                    </div>
                    <TooltipIf
                      condition={!provider.isPermitted}
                      tooltip={t("models.providerDisabled")}
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
      )}
    </Card>
  );
}
