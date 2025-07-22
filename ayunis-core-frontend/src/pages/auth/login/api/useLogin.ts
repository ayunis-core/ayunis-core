import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "@tanstack/react-router";
import { useAuthenticationControllerLogin } from "@/shared/api/generated/ayunisCoreAPI";
import { loginFormSchema, type LoginFormValues } from "../model/loginSchema";
import extractErrorData from "@/shared/api/extract-error-data";
import { showError } from "@/shared/lib/toast";
import { useTranslation } from "react-i18next";

export function useLogin({ redirect }: { redirect?: string }) {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const loginMutation = useAuthenticationControllerLogin();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (values: LoginFormValues) => {
    loginMutation.mutate(
      {
        data: {
          email: values.email,
          password: values.password,
        },
      },
      {
        onSuccess: () => {
          // With cookie-based auth, the backend automatically sets HTTP-only cookies
          navigate({ to: redirect || "/chat" });
        },
        onError: (error) => {
          console.error("Login failed:", error);
          const { status, code } = extractErrorData(error);
          if (status === 401 || status === 403) {
            showError(t("login.error.invalidCredentials"));
          } else if (code === "RATE_LIMIT_EXCEEDED") {
            showError(t("login.error.rateLimitExceeded"));
          } else {
            showError(t("login.error.unexpectedError"));
          }
        },
      },
    );
  };

  return {
    form,
    onSubmit,
    isLoading: loginMutation.isPending,
  };
}
