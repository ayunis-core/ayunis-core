import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "@tanstack/react-router";
import {
  forgotPasswordFormSchema,
  type ForgotPasswordFormValues,
} from "../model/forgotPasswordSchema";
import { showError, showSuccess } from "@/shared/lib/toast";
import { useTranslation } from "react-i18next";
import { useUserControllerForgotPassword } from "@/shared/api";
import extractErrorData from "@/shared/api/extract-error-data";

export function useForgotPassword() {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: {
      email: "",
    },
  });

  const { mutate: forgotPassword, isPending } = useUserControllerForgotPassword(
    {
      mutation: {
        onSuccess: () => {
          showSuccess(t("forgotPassword.success"));
          navigate({ to: "/login" });
        },
        onError: (error) => {
          const { code } = extractErrorData(error);
          switch (code) {
            default:
              showError(t("forgotPassword.error"));
          }
        },
      },
    },
  );

  async function onSubmit(values: ForgotPasswordFormValues) {
    forgotPassword({
      data: {
        email: values.email,
      },
    });
  }

  return {
    form,
    onSubmit,
    isLoading: isPending,
  };
}
