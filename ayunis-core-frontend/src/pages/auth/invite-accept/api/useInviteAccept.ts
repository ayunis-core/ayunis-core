import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "@tanstack/react-router";
import { useInvitesControllerAcceptInvite } from "@/shared/api/generated/ayunisCoreAPI";
import {
  inviteAcceptFormSchema,
  type InviteAcceptFormValues,
} from "./inviteAcceptSchema";
import type { Invite } from "../model/openapi";

export function useInviteAccept(invite: Invite, inviteToken: string) {
  const navigate = useNavigate();
  const acceptInviteMutation = useInvitesControllerAcceptInvite();

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
          // Handle error (show toast, form errors, etc.)
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
