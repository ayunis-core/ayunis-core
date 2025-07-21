import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "@tanstack/react-router";
import { useAuthenticationControllerRegister } from "@/shared/api/generated/ayunisCoreAPI";
import { registerFormSchema, type RegisterFormValues } from "./registerSchema";
import { showError } from "@/shared/lib/toast";
import extractErrorData from "@/shared/api/extract-error-data";
import { useTranslation } from "react-i18next";

export function useRegister() {
  const navigate = useNavigate();
  const { t } = useTranslation("auth");
  const registerMutation = useAuthenticationControllerRegister();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      orgName: "",
      userName: "",
      legalAcceptance: false,
    },
  });

  function onSubmit(values: RegisterFormValues) {
    registerMutation.mutate(
      {
        data: {
          email: values.email,
          password: values.password,
          orgName: values.orgName,
          userName: values.userName,
        },
      },
      {
        onSuccess: () => {
          navigate({ to: "/email-confirm" });
        },
        onError: (error) => {
          console.error("Registration failed:", error);
          const { code } = extractErrorData(error);
          switch (code) {
            case "USER_ALREADY_EXISTS":
              showError(t("register.emailAlreadyExists"));
              break;
            case "USER_EMAIL_PROVIDER_BLACKLISTED":
              showError(t("register.emailProviderBlacklisted"));
              break;
            default:
              showError(t("register.registrationFailed"));
          }
        },
      },
    );
  }

  return {
    form,
    onSubmit,
    isLoading: registerMutation.isPending,
  };
}
