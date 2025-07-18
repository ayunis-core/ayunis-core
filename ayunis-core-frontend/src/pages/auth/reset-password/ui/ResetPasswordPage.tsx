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
import { useResetPassword } from "../api/useResetPassword";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";

export function ResetPasswordPage({ token }: { token: string }) {
  const { form, onSubmit, isLoading } = useResetPassword(token);
  const { t } = useTranslation("auth");

  return (
    <OnboardingLayout
      title={t("resetPassword.title")}
      description={t("resetPassword.description")}
      footer={
        <>
          {t("resetPassword.backToLogin")}{" "}
          <Link
            to="/login"
            className="font-medium text-primary hover:underline"
          >
            {t("resetPassword.signIn")}
          </Link>
        </>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("resetPassword.newPassword")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("resetPassword.newPasswordPlaceholder")}
                    type="password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("resetPassword.confirmPassword")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("resetPassword.confirmPasswordPlaceholder")}
                    type="password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading
              ? t("resetPassword.resetting")
              : t("resetPassword.resetPasswordButton")}
          </Button>
        </form>
      </Form>
    </OnboardingLayout>
  );
}
