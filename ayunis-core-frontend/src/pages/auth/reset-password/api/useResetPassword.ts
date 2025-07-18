import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "@tanstack/react-router";
import {
  resetPasswordFormSchema,
  type ResetPasswordFormValues,
} from "../model/resetPasswordSchema";
import { showError, showSuccess } from "@/shared/lib/toast";
import { useTranslation } from "react-i18next";
import { useUserControllerResetPassword } from "@/shared/api";
import extractErrorData from "@/shared/api/extract-error-data";

export function useResetPassword(token: string) {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const { mutate: resetPassword, isPending } = useUserControllerResetPassword({
    mutation: {
      onSuccess: () => {
        showSuccess(t("resetPassword.success"));
        navigate({ to: "/login" });
      },
      onError: (error) => {
        const { code } = extractErrorData(error);
        switch (code) {
          case "INVALID_TOKEN":
            showError(t("resetPassword.invalidToken"));
            break;
          default:
            showError(t("resetPassword.error"));
        }
      },
    },
  });

  async function onSubmit(values: ResetPasswordFormValues) {
    resetPassword({
      data: {
        resetToken: token,
        newPassword: values.newPassword,
        newPasswordConfirmation: values.confirmPassword,
      },
    });
  }

  return {
    form,
    onSubmit,
    isLoading: isPending,
  };
}
