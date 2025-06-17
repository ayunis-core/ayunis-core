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
import { useRegister } from "../api";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";

export function RegisterPage() {
  const { form, onSubmit, isLoading } = useRegister();
  const { t } = useTranslation("auth");

  return (
    <OnboardingLayout
      title={t("register.title")}
      description={
        <>
          {t("register.or")}{" "}
          <Link
            to="/login"
            className="font-medium text-primary hover:underline"
          >
            {t("register.signInExisting")}
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
                <FormLabel>{t("register.email")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("register.emailPlaceholder")}
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
            name="userName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("register.userName")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("register.userNamePlaceholder")}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="orgName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("register.orgName")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("register.orgNamePlaceholder")}
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
                <FormLabel>{t("register.password")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("register.passwordPlaceholder")}
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
                <FormLabel>{t("register.confirmPassword")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("register.confirmPasswordPlaceholder")}
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
              ? t("register.creatingAccount")
              : t("register.createAccountButton")}
          </Button>
        </form>
      </Form>
    </OnboardingLayout>
  );
}
