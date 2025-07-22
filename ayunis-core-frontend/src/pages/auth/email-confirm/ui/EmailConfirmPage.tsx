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
import { useState } from "react";

export default function EmailConfirmPage() {
  const { form, onSubmit, isLoading, isSuccess } = useEmailConfirmResend();
  const { t } = useTranslation("auth");
  const [showResendForm, setShowResendForm] = useState(false);

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
      {showResendForm ? (
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
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setShowResendForm(false)}
            >
              {t("emailConfirm.cancel")}
            </Button>
          </form>
        </Form>
      ) : (
        <div className="text-center">
          <Button
            variant="link"
            onClick={() => setShowResendForm(true)}
            className="text-sm"
          >
            {t("emailConfirm.noEmailReceived")}
          </Button>
        </div>
      )}
    </OnboardingLayout>
  );
}
