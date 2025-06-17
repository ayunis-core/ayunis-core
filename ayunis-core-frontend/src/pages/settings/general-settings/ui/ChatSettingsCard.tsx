import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/shadcn/card";
import { Label } from "@/shared/ui/shadcn/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/shadcn/select";
import { useTranslation } from "react-i18next";
import { usePermittedModels } from "@/features/usePermittedModels";
import { useUserDefaultModel } from "../api/useUserDefaultModel";

export function ChatSettingsCard() {
  const { t } = useTranslation("settings");
  const { models: permittedModels, isLoading: modelsLoading } =
    usePermittedModels();

  const {
    userDefaultModel,
    manageUserDefaultModel,
    deleteUserDefaultModel,
    error,
    manageError,
  } = useUserDefaultModel({ allModels: permittedModels });

  const handleDefaultSettingChange = (value: string) => {
    if (value === "null") {
      // Delete the default model (set to null)
      deleteUserDefaultModel();
    } else {
      // Set/update the default model
      manageUserDefaultModel(value);
    }
  };

  // Create options including null option and all permitted models
  const defaultSettingsOptions = [
    { id: "null", label: "None" },
    ...permittedModels.map((model) => ({
      id: model.id,
      label: model.displayName || model.name,
    })),
  ];

  // Get current selected value
  const selectedValue = userDefaultModel?.id || "null";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("general.chat")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="default-settings-select">
              {t("general.defaultModelSelection")}
            </Label>
            <div className="text-sm text-muted-foreground">
              {t("general.defaultModelDescription")}
            </div>
          </div>
          <Select
            value={selectedValue}
            onValueChange={handleDefaultSettingChange}
            disabled={modelsLoading}
          >
            <SelectTrigger id="default-settings-select" className="w-[180px]">
              <SelectValue
                placeholder={
                  modelsLoading ? "Loading..." : t("general.selectDefaultModel")
                }
              />
            </SelectTrigger>
            <SelectContent>
              {defaultSettingsOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Show error messages if any */}
        {(error || manageError) && (
          <div className="text-sm text-red-600">
            {String(error || manageError || "An error occurred")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
