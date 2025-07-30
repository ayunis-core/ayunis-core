import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/shadcn/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/shadcn/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/shadcn/select";
import { Input } from "@/shared/ui/shadcn/input";
import { Textarea } from "@/shared/ui/shadcn/textarea";
import { Button } from "@/shared/ui/shadcn/button";
import { Switch } from "@/shared/ui/shadcn/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/shadcn/tooltip";
import { useState } from "react";
import { Plus, Info } from "lucide-react";
import { type CreateAgentData, useCreateAgent } from "../api/useCreateAgent";
import { useTranslation } from "react-i18next";
import { usePermittedModels } from "@/features/usePermittedModels";
import { ToolAssignmentDtoType } from "@/shared/api/generated/ayunisCoreAPI.schemas";

interface CreateAgentDialogProps {
  buttonText?: string;
  showIcon?: boolean;
  buttonClassName?: string;
}

export default function CreateAgentDialog({
  buttonText,
  showIcon = false,
  buttonClassName = "",
}: CreateAgentDialogProps) {
  const { t } = useTranslation("agents");
  const [isOpen, setIsOpen] = useState(false);
  const [internetSearchEnabled, setInternetSearchEnabled] = useState(false);
  const { models } = usePermittedModels();
  const {
    form,
    onSubmit: originalOnSubmit,
    resetForm,
    isLoading,
  } = useCreateAgent({
    onSuccessCallback: () => {
      setIsOpen(false);
      resetForm();
    },
  });

  const handleSubmit = (data: CreateAgentData) => {
    const toolAssignments = internetSearchEnabled
      ? [{ type: ToolAssignmentDtoType.internet_search }]
      : [];

    originalOnSubmit({
      ...data,
      toolAssignments,
    });
  };

  const handleCancel = () => {
    resetForm();
    setInternetSearchEnabled(false);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className={`${showIcon ? "inline-flex items-center gap-2" : ""} ${buttonClassName}`}
        >
          {showIcon && <Plus className="h-4 w-4" />}
          {buttonText || t("createDialog.buttonText")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{t("createDialog.title")}</DialogTitle>
          <DialogDescription>{t("createDialog.description")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("createDialog.form.nameLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("createDialog.form.namePlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("createDialog.form.instructionsLabel")}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t(
                        "createDialog.form.instructionsPlaceholder",
                      )}
                      className="min-h-[150px] max-h-[200px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="modelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("createDialog.form.modelLabel")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("createDialog.form.modelPlaceholder")}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {models.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FormLabel className="text-sm font-medium">
                  {t("createDialog.form.capabilitiesLabel")}
                </FormLabel>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t("createDialog.form.capabilitiesTooltip")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">
                      Internet Search
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Allow the agent to search the internet for up-to-date
                      information
                    </p>
                  </div>
                  <Switch
                    checked={internetSearchEnabled}
                    onCheckedChange={setInternetSearchEnabled}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                {t("createDialog.buttons.cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? t("createDialog.buttons.creating")
                  : t("createDialog.buttons.create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
