import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "@tanstack/react-router";
import { useInvitesControllerAcceptInvite } from "@/shared/api/generated/ayunisCoreAPI";
import {
  inviteAcceptFormSchema,
  type InviteAcceptFormValues,
} from "./inviteAcceptSchema";
import type { Invite } from "../model/openapi";
import extractErrorData from "@/shared/api/extract-error-data";
import { showError } from "@/shared/lib/toast";
import { useTranslation } from "react-i18next";

export function useInviteAccept(invite: Invite, inviteToken: string) {
  const navigate = useNavigate();
  const acceptInviteMutation = useInvitesControllerAcceptInvite();
  const { t } = useTranslation("auth");

  const form = useForm<InviteAcceptFormValues>({
    resolver: zodResolver(inviteAcceptFormSchema),
    defaultValues: {
      email: invite.email,
      name: "",
      password: "",
      confirmPassword: "",
      inviteToken: inviteToken,
    },
  });

  const onSubmit = (values: InviteAcceptFormValues) => {
    acceptInviteMutation.mutate(
      {
        data: {
          inviteToken: values.inviteToken,
          userName: values.name,
          password: values.password,
          passwordConfirm: values.confirmPassword,
        },
      },
      {
        onSuccess: () => {
          // After successfully accepting the invite, redirect to login or dashboard
          navigate({ to: "/login" });
        },
        onError: (error) => {
          console.error("Invite accept failed:", error);
          const { code } = extractErrorData(error);
          switch (code) {
            case "INVALID_INVITE_TOKEN":
              showError(t("inviteAccept.invalidInviteToken"));
              break;
            case "INVITE_NOT_FOUND":
              showError(t("inviteAccept.inviteNotFound"));
              break;
            case "INVITE_ALREADY_ACCEPTED":
              showError(t("inviteAccept.inviteAlreadyAccepted"));
              break;
            case "INVALID_PASSWORD":
              showError(t("inviteAccept.invalidPassword"));
              break;
            case "PASSWORD_MISMATCH":
              showError(t("inviteAccept.passwordMismatch"));
              break;
            default:
              throw error;
          }
        },
      },
    );
  };

  return {
    form,
    onSubmit,
    isLoading: acceptInviteMutation.isPending,
  };
}
