import { useForm } from "react-hook-form";
import { useEffect } from "react";
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
import type { McpIntegration, UpdateIntegrationFormData } from "../model/types";
import { useUpdateIntegration } from "../api/useUpdateIntegration";

interface EditIntegrationDialogProps {
  integration: McpIntegration | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditIntegrationDialog({
  integration,
  open,
  onOpenChange,
}: EditIntegrationDialogProps) {
  const { t } = useTranslation("admin-settings-integrations");
  const { updateIntegration, isUpdating } = useUpdateIntegration(() => {
    onOpenChange(false);
  });
  const form = useForm<UpdateIntegrationFormData>({
    defaultValues: {
      name: "",
      authMethod: undefined,
      authHeaderName: "",
      credentials: "",
    },
  });

  useEffect(() => {
    if (integration && open) {
      form.reset({
        name: integration.name,
        authMethod: integration.authMethod as
          | "API_KEY"
          | "BEARER_TOKEN"
          | undefined,
        authHeaderName: integration.authHeaderName || "",
        credentials: "",
      });
    }
  }, [integration, open, form]);

  const selectedAuthMethod = form.watch("authMethod");

  const handleSubmit = (data: any) => {
    if (integration) {
      updateIntegration(integration.id, data);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isUpdating) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  if (!integration) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{t("integrations.editDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("integrations.editDialog.description")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("integrations.editDialog.name")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("integrations.editDialog.namePlaceholder")}
                      {...field}
                      disabled={isUpdating}
                    />
                  </FormControl>
                  <FormDescription>
                    {t("integrations.editDialog.nameDescription")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="authMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("integrations.editDialog.authMethod")}
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isUpdating}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t(
                            "integrations.editDialog.authMethodNone",
                          )}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="API_KEY">
                        {t("integrations.editDialog.authMethodApiKey")}
                      </SelectItem>
                      <SelectItem value="BEARER_TOKEN">
                        {t("integrations.editDialog.authMethodBearerToken")}
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
                        {t("integrations.editDialog.headerName")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t(
                            "integrations.editDialog.headerNamePlaceholder",
                          )}
                          {...field}
                          disabled={isUpdating}
                        />
                      </FormControl>
                      <FormDescription>
                        {t("integrations.editDialog.headerNameDescription")}
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
                        {t("integrations.editDialog.credentials")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder={t(
                            "integrations.editDialog.credentialsPlaceholder",
                          )}
                          {...field}
                          disabled={isUpdating}
                        />
                      </FormControl>
                      <FormDescription>
                        {t("integrations.editDialog.credentialsDescription")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isUpdating}
              >
                {t("integrations.editDialog.cancel")}
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating
                  ? t("integrations.editDialog.updating")
                  : t("integrations.editDialog.update")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
