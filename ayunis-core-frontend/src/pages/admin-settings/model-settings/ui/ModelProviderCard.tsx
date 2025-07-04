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
import { type ModelWithConfigResponseDto } from "@/shared/api/generated/ayunisCoreAPI.schemas";
import { useCreatePermittedModel } from "../api/useCreatePermittedModel";
import { useDeletePermittedModel } from "../api/useDeletePermittedModel";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/shadcn/dialog";
import { Button } from "@/shared/ui/shadcn/button";
import { Checkbox } from "@/shared/ui/shadcn/checkbox";
import { useState } from "react";

interface ModelProviderCardProps {
  provider: string;
  models: ModelWithConfigResponseDto[];
}

export default function ModelProviderCard({
  provider,
  models,
}: ModelProviderCardProps) {
  const { t } = useTranslation("admin-settings");
  const [isProviderPermitted, setIsProviderPermitted] = useState(false);
  const { createPermittedModel } = useCreatePermittedModel();
  const { deletePermittedModel } = useDeletePermittedModel();

  function handleProviderToggle() {
    setIsProviderPermitted((prev) => !prev);
  }

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
        <CardTitle className="flex items-center gap-2">
          <span className="capitalize">{provider}</span>
        </CardTitle>
        <CardDescription>Hosted in EU</CardDescription>
        <CardAction>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <span>
                  {isProviderPermitted
                    ? t("models.disableProvider")
                    : t("models.enableProvider")}
                </span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  <span className="capitalize">{provider}</span> freischalten
                </DialogTitle>
              </DialogHeader>
              <p>
                Wenn Sie diesen Provider freischalten, können alle Benutzer
                diesen Provider verwenden und auf dessen Modelle zugreifen.
              </p>
              <p>
                <span className="flex items-center gap-2">
                  <Checkbox id="confirm" />
                  <Label htmlFor="confirm">
                    <span>
                      Ich akzeptiere die zusätzlichen{" "}
                      <a
                        href="https://ayunis.com/core/terms"
                        target="_blank"
                        className="underline"
                      >
                        Nutzungsbedingungen
                      </a>{" "}
                      und die{" "}
                      <a
                        href="https://ayunis.com/core/privacy"
                        target="_blank"
                        className="underline"
                      >
                        Datenschutzerklärung
                      </a>
                      .
                    </span>
                  </Label>
                </span>
              </p>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="submit" onClick={handleProviderToggle}>
                    {isProviderPermitted
                      ? t("models.disableProvider")
                      : t("models.enableProvider")}
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardAction>
      </CardHeader>
      {isProviderPermitted && (
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
      )}
    </Card>
  );
}
