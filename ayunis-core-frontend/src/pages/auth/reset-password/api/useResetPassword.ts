import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "@tanstack/react-router";
import { showError, showSuccess } from "@/shared/lib/toast";
import { useTranslation } from "react-i18next";
import { useUserControllerResetPassword } from "@/shared/api";
import extractErrorData from "@/shared/api/extract-error-data";
import * as z from "zod";

export function useResetPassword(token: string) {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();

  const resetPasswordFormSchema = z
    .object({
      newPassword: z.string().min(8, {
        message: t("resetPassword.passwordTooShort"),
      }),
      confirmPassword: z.string().min(8, {
        message: t("resetPassword.passwordTooShort"),
      }),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t("resetPassword.passwordsDontMatch"),
      path: ["confirmPassword"],
    });

  const form = useForm<z.infer<typeof resetPasswordFormSchema>>({
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

  async function onSubmit(values: z.infer<typeof resetPasswordFormSchema>) {
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
