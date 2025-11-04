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
import type { CreateCustomIntegrationFormData } from "../model/types";
import { useCreateCustomIntegration } from "../api/useCreateCustomIntegration";

interface CreateCustomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCustomDialog({
  open,
  onOpenChange,
}: CreateCustomDialogProps) {
  const { t } = useTranslation("admin-settings-integrations");
  const { createCustomIntegration, isCreating } = useCreateCustomIntegration(
    () => {
      onOpenChange(false);
      form.reset();
    },
  );
  const form = useForm<CreateCustomIntegrationFormData>({
    defaultValues: {
      name: "",
      serverUrl: "",
      authMethod: undefined,
      authHeaderName: "",
      credentials: "",
    },
  });

  const selectedAuthMethod = form.watch("authMethod");

  const handleSubmit = (data: any) => {
    createCustomIntegration(data);
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
            {t("integrations.createCustomDialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("integrations.createCustomDialog.description")}
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
                  <FormLabel>
                    {t("integrations.createCustomDialog.name")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t(
                        "integrations.createCustomDialog.namePlaceholder",
                      )}
                      {...field}
                      disabled={isCreating}
                    />
                  </FormControl>
                  <FormDescription>
                    {t("integrations.createCustomDialog.nameDescription")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="serverUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("integrations.createCustomDialog.serverUrl")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t(
                        "integrations.createCustomDialog.serverUrlPlaceholder",
                      )}
                      {...field}
                      disabled={isCreating}
                    />
                  </FormControl>
                  <FormDescription>
                    {t("integrations.createCustomDialog.serverUrlDescription")}
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
                    {t("integrations.createCustomDialog.authMethod")}
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
                            "integrations.createCustomDialog.authMethodNone",
                          )}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CUSTOM_HEADER">
                        {t("integrations.createCustomDialog.authMethodApiKey")}
                      </SelectItem>
                      <SelectItem value="BEARER_TOKEN">
                        {t(
                          "integrations.createCustomDialog.authMethodBearerToken",
                        )}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t("integrations.createCustomDialog.authMethodDescription")}
                  </FormDescription>
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
                        {t("integrations.createCustomDialog.headerName")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t(
                            "integrations.createCustomDialog.headerNamePlaceholder",
                          )}
                          {...field}
                          disabled={isCreating}
                        />
                      </FormControl>
                      <FormDescription>
                        {t(
                          "integrations.createCustomDialog.headerNameDescription",
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
                        {t("integrations.createCustomDialog.credentials")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder={t(
                            "integrations.createCustomDialog.credentialsPlaceholder",
                          )}
                          {...field}
                          disabled={isCreating}
                        />
                      </FormControl>
                      <FormDescription>
                        {selectedAuthMethod === "CUSTOM_HEADER"
                          ? t(
                              "integrations.createCustomDialog.credentialsDescriptionApiKey",
                            )
                          : t(
                              "integrations.createCustomDialog.credentialsDescriptionBearerToken",
                            )}
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
                disabled={isCreating}
              >
                {t("integrations.createCustomDialog.cancel")}
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating
                  ? t("integrations.createCustomDialog.creating")
                  : t("integrations.createCustomDialog.create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
