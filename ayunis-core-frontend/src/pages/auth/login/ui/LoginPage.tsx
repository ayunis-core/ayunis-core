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
import { useLogin } from "../api/useLogin";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";

export function LoginPage() {
  const { form, onSubmit, isLoading } = useLogin();
  const { t } = useTranslation("auth");

  return (
    <OnboardingLayout
      title={t("login.title")}
      description={t("login.description")}
      footer={
        <>
          {t("login.noAccount")}{" "}
          <Link
            to="/register"
            className="font-medium text-primary hover:underline"
          >
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
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t("login.signingIn") : t("login.signInButton")}
          </Button>
        </form>
      </Form>
    </OnboardingLayout>
  );
}
