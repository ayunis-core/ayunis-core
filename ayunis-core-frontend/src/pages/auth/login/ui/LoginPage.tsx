import { Button } from "@/shared/ui/shadcn/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/shadcn/form";
import { Input } from "@/shared/ui/shadcn/input";
import OnboardingLayout from "@/layouts/onboarding-layout";
import { useLogin } from "../api/useLogin";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { useRedirectNotification } from "@/features/useRedirectNotification";

export function LoginPage({
  redirect,
  emailVerified,
}: {
  redirect?: string;
  emailVerified?: boolean;
}) {
  const { form, onSubmit, isLoading } = useLogin({ redirect });
  const { t } = useTranslation("auth");

  useRedirectNotification({
    show: emailVerified ?? false,
    text: t("login.emailVerified"),
  });

  useRedirectNotification({
    show: !!redirect,
    text: t("login.redirect"),
  });

  return (
    <OnboardingLayout
      title={t("login.title")}
      description={t("login.description")}
      footer={
        <>
          {t("login.noAccount")}{" "}
          <Link to="/register" className="font-medium text-primary underline">
            {t("login.createAccount")}
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
                <FormLabel>{t("login.email")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("login.emailPlaceholder")}
                    type="email"
                    data-testid="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("login.password")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("login.passwordPlaceholder")}
                    type="password"
                    data-testid="password"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  <Link
                    to="/password/forgot"
                    className="text-sm text-muted-foreground"
                  >
                    {t("login.forgotPassword")}
                  </Link>
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            data-testid="submit">
            {isLoading ? t("login.signingIn") : t("login.signInButton")}
          </Button>
        </form>
      </Form>
    </OnboardingLayout>
  );
}
