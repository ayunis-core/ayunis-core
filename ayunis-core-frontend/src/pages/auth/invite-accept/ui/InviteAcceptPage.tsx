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
import type { Invite } from "../model/openapi";
import { useInviteAccept } from "../api";
import { useTranslation } from "react-i18next";

interface InviteAcceptPageProps {
  invite: Invite;
  inviteToken: string;
}

export default function InviteAcceptPage({
  invite,
  inviteToken,
}: InviteAcceptPageProps) {
  const { form, onSubmit, isLoading } = useInviteAccept(invite, inviteToken);
  const { t } = useTranslation("auth");

  return (
    <OnboardingLayout
      title={t("inviteAccept.title")}
      description={t("inviteAccept.description", { role: invite.role })}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("inviteAccept.email")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("inviteAccept.emailPlaceholder")}
                    type="email"
                    disabled
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("inviteAccept.name")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("inviteAccept.namePlaceholder")}
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
                <FormLabel>{t("inviteAccept.password")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("inviteAccept.passwordPlaceholder")}
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
                <FormLabel>{t("inviteAccept.confirmPassword")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("inviteAccept.confirmPasswordPlaceholder")}
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
              ? t("inviteAccept.acceptingInvitation")
              : t("inviteAccept.acceptInvitationButton")}
          </Button>
        </form>
      </Form>
    </OnboardingLayout>
  );
}
