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
import { useForgotPassword } from "../api/useForgotPassword";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";

export function ForgotPasswordPage() {
  const { form, onSubmit, isLoading } = useForgotPassword();
  const { t } = useTranslation("auth");

  return (
    <OnboardingLayout
      title={t("forgotPassword.title")}
      description={t("forgotPassword.description")}
      footer={
        <>
          {t("forgotPassword.backToLogin")}{" "}
          <Link
            to="/login"
            className="font-medium text-primary hover:underline"
          >
            {t("forgotPassword.signIn")}
          </Link>
        </>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("forgotPassword.email")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("forgotPassword.emailPlaceholder")}
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
              ? t("forgotPassword.sending")
              : t("forgotPassword.sendResetLink")}
          </Button>
        </form>
      </Form>
    </OnboardingLayout>
  );
}
