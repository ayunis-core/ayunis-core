import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/shadcn/dialog";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Button } from "@/shared/ui/shadcn/button";
import type {
  PredefinedConfig,
  CreatePredefinedIntegrationFormData,
} from "../model/types";
import { useCreatePredefinedIntegration } from "../api/useCreatePredefinedIntegration";

interface CreatePredefinedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  predefinedConfigs: PredefinedConfig[];
}

export function CreatePredefinedDialog({
  open,
  onOpenChange,
  predefinedConfigs,
}: CreatePredefinedDialogProps) {
  const { t } = useTranslation("admin-settings-integrations");
  const { createPredefinedIntegration, isCreating } =
    useCreatePredefinedIntegration(() => {
      onOpenChange(false);
      form.reset();
    });
  const form = useForm<CreatePredefinedIntegrationFormData>({
    defaultValues: {
      name: "",
      slug: "TEST" as any,
      authMethod: undefined,
      authHeaderName: "",
      credentials: "",
    },
  });

  const selectedSlug = form.watch("slug");
  const selectedConfig = predefinedConfigs.find((c) => c.slug === selectedSlug);
  const selectedAuthMethod = form.watch("authMethod");

  const handleSubmit = (data: any) => {
    createPredefinedIntegration(data);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isCreating) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>
            {t("integrations.createPredefinedDialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("integrations.createPredefinedDialog.description")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("integrations.createPredefinedDialog.integrationType")}
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isCreating}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t(
                            "integrations.createPredefinedDialog.integrationTypePlaceholder",
                          )}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {predefinedConfigs.map((config) => (
                        <SelectItem key={config.slug} value={config.slug}>
                          {config.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedConfig && (
                    <FormDescription>
                      {selectedConfig.description}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("integrations.createPredefinedDialog.name")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t(
                        "integrations.createPredefinedDialog.namePlaceholder",
                      )}
                      {...field}
                      disabled={isCreating}
                    />
                  </FormControl>
                  <FormDescription>
                    {t("integrations.createPredefinedDialog.nameDescription")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedConfig && selectedConfig.defaultAuthMethod && (
              <>
                <FormField
                  control={form.control}
                  name="authMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("integrations.createPredefinedDialog.authMethod")}
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isCreating}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t(
                                "integrations.createPredefinedDialog.authMethodPlaceholder",
                              )}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CUSTOM_HEADER">
                            {t(
                              "integrations.createPredefinedDialog.authMethodApiKey",
                            )}
                          </SelectItem>
                          <SelectItem value="BEARER_TOKEN">
                            {t(
                              "integrations.createPredefinedDialog.authMethodBearerToken",
                            )}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedAuthMethod && (
                  <>
                    <FormField
                      control={form.control}
                      name="authHeaderName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {t(
                              "integrations.createPredefinedDialog.headerName",
                            )}
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder={
                                selectedConfig.defaultAuthHeaderName ||
                                t(
                                  "integrations.createPredefinedDialog.headerNamePlaceholder",
                                )
                              }
                              {...field}
                              disabled={isCreating}
                            />
                          </FormControl>
                          <FormDescription>
                            {t(
                              "integrations.createPredefinedDialog.headerNameDescription",
                            )}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="credentials"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {t(
                              "integrations.createPredefinedDialog.credentials",
                            )}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder={t(
                                "integrations.createPredefinedDialog.credentialsPlaceholder",
                              )}
                              {...field}
                              disabled={isCreating}
                            />
                          </FormControl>
                          <FormDescription>
                            {selectedAuthMethod === "CUSTOM_HEADER"
                              ? t(
                                  "integrations.createPredefinedDialog.credentialsDescriptionApiKey",
                                )
                              : t(
                                  "integrations.createPredefinedDialog.credentialsDescriptionBearerToken",
                                )}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isCreating}
              >
                {t("integrations.createPredefinedDialog.cancel")}
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating
                  ? t("integrations.createPredefinedDialog.creating")
                  : t("integrations.createPredefinedDialog.create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
