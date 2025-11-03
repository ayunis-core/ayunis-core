// Types
import type { ModelWithConfigResponseDto } from "@/shared/api/generated/ayunisCoreAPI.schemas";

// Utils
import { useTranslation } from "react-i18next";
import { Layers } from "lucide-react";

// Ui
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/shadcn/card";
import { Switch } from "@/shared/ui/shadcn/switch";
import { Label } from "@/shared/ui/shadcn/label";
import { Separator } from "@/shared/ui/shadcn/separator";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Avatar } from "@/shared/ui/shadcn/avatar";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/ui/shadcn/tooltip";

// API
import { useCreatePermittedModel } from "../api/useCreatePermittedModel";
import { useDeletePermittedModel } from "../api/useDeletePermittedModel";

// Widgets
import TooltipIf from "@/widgets/tooltip-if/ui/TooltipIf";

// Static
import ayunisModelLogo from "@/shared/assets/models/ayunis-model.svg";

interface ModelProviderCardProps {
  cardType: "recommended" | "self";
  models: ModelWithConfigResponseDto[];
  providers: Array<{ provider: string; isPermitted: boolean }>;
}

export default function ModelProviderCard({
  cardType,
  models,
  providers,
}: ModelProviderCardProps) {
  const { t } = useTranslation("admin-settings-models");
  const { createPermittedModel } = useCreatePermittedModel();
  const { deletePermittedModel } = useDeletePermittedModel();

  const cardTitle = cardType === "recommended" 
    ? t("models.card.recommended.title")
    : t("models.card.selfHosted.title");
  
  const cardDescription = cardType === "recommended"
    ? t("models.card.recommended.description")
    : t("models.card.selfHosted.description");

  const getIcon = () => {
    if (cardType === "recommended") {
      return <img src={ayunisModelLogo} alt={cardTitle} className="h-6 w-6 rounded-sm" />;
    }

    return <Layers className="h-6 w-6 text-foreground" />;
  };

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

  const isModelEnabled = (model: ModelWithConfigResponseDto) => {
    const provider = providers.find((p) => p.provider === model.provider);
    return provider?.isPermitted ?? false;
  };

  return (
    <Card className="rounded-3xl border-0 shadow-sm">
      <CardHeader className="gap-0">
        <CardTitle className="flex items-center gap-3">
          <Avatar className="flex items-center h-10 w-10 justify-center rounded-sm shadow-sm">
            {getIcon()}
          </Avatar>
          <div className="flex flex-col">
            <span className="text-base font-semibold">{cardTitle}</span>
            <CardDescription className="text-sm font-normal">{cardDescription}</CardDescription>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {models
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((model, index) => {
              const modelKey = `model-${model.provider}:${model.name}`;
              const providerPermitted = isModelEnabled(model);
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
                      condition={!providerPermitted}
                      tooltip={t("models.providerDisabled")}
                    >
                      <Switch
                        id={modelKey}
                        disabled={!providerPermitted}
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
