import { Button } from "@/shared/ui/shadcn/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/shadcn/form";
import { Input } from "@/shared/ui/shadcn/input";
import OnboardingLayout from "@/layouts/onboarding-layout";
import { useEmailConfirmResend } from "../api/useEmailConfirmResend";
import { useTranslation } from "react-i18next";
import { CheckCircleIcon } from "lucide-react";

export default function EmailConfirmPage() {
  const { form, onSubmit, isLoading, isSuccess } = useEmailConfirmResend();
  const { t } = useTranslation("auth");

  if (isSuccess) {
    return (
      <OnboardingLayout
        title={t("emailConfirm.successTitle")}
        description={t("emailConfirm.successDescription")}
      />
    );
  }
  return (
    <OnboardingLayout
      title={t("emailConfirm.title")}
      description={t("emailConfirm.description")}
    >
      {isSuccess ? (
        <div className="flex flex-col items-center space-y-4 text-center">
          <CheckCircleIcon className="h-12 w-12 text-green-600" />
          <div className="space-y-2">
            <h3 className="text-lg font-medium">
              {t("emailConfirm.successTitle")}
            </h3>
            <p className="text-muted-foreground">
              {t("emailConfirm.successDescription")}
            </p>
          </div>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("emailConfirm.email")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("emailConfirm.emailPlaceholder")}
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading
                ? t("emailConfirm.sendingConfirmation")
                : t("emailConfirm.sendConfirmationButton")}
            </Button>
          </form>
        </Form>
      )}
    </OnboardingLayout>
  );
}
