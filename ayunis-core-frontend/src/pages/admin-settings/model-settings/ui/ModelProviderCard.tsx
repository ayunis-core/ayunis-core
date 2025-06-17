import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/shadcn/card";
import { Switch } from "@/shared/ui/shadcn/switch";
import { Label } from "@/shared/ui/shadcn/label";
import { Separator } from "@/shared/ui/shadcn/separator";
import { Badge } from "@/shared/ui/shadcn/badge";
import { type ModelWithConfigResponseDto } from "@/shared/api/generated/ayunisCoreAPI.schemas";
import { useCreatePermittedModel } from "../api/useCreatePermittedModel";
import { useDeletePermittedModel } from "../api/useDeletePermittedModel";
import { useTranslation } from "react-i18next";

interface ModelProviderCardProps {
  provider: string;
  models: ModelWithConfigResponseDto[];
}

export default function ModelProviderCard({
  provider,
  models,
}: ModelProviderCardProps) {
  const { t } = useTranslation("admin-settings");
  const { createPermittedModel } = useCreatePermittedModel();
  const { deletePermittedModel } = useDeletePermittedModel();

  function handleModelToggle(
    model: ModelWithConfigResponseDto,
    isPermitted: boolean,
  ) {
    if (isPermitted) {
      createPermittedModel({
        modelName: model.name,
        modelProvider: provider,
      });
      return;
    }
    if (!isPermitted && model.id) {
      deletePermittedModel(model.id);
      return;
    }
  }
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <span className="capitalize">{provider}</span>
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {models.map((model, index) => {
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
                          <Badge variant="outline" className="text-xs">
                            {t("models.streaming")}
                          </Badge>
                        )}
                        {model.isReasoning && (
                          <Badge variant="outline" className="text-xs">
                            {t("models.reasoning")}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {model.name}
                    </p>
                  </div>
                  <Switch
                    id={modelKey}
                    checked={model.isPermitted}
                    onCheckedChange={(isPermitted) =>
                      handleModelToggle(model, isPermitted)
                    }
                  />
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
