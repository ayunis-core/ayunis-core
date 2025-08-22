import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "@tanstack/react-router";
import { useAuthenticationControllerRegister } from "@/shared/api/generated/ayunisCoreAPI";
import { showError } from "@/shared/lib/toast";
import extractErrorData from "@/shared/api/extract-error-data";
import { useTranslation } from "react-i18next";
import * as z from "zod";

export function useRegister() {
  const navigate = useNavigate();
  const { t } = useTranslation("auth");
  const registerMutation = useAuthenticationControllerRegister();

  const registerFormSchema = z
    .object({
      email: z.string().email({
        message: t("register.emailInvalid"),
      }),
      password: z.string().min(8, {
        message: t("register.passwordTooShort"),
      }),
      confirmPassword: z.string(),
      orgName: z.string().min(1, {
        message: t("register.orgNameRequired"),
      }),
      userName: z.string().min(1, {
        message: t("register.userNameRequired"),
      }),
      legalAcceptance: z.boolean(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("register.passwordsDontMatch"),
      path: ["confirmPassword"],
    });

  const form = useForm<z.infer<typeof registerFormSchema>>({
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

  function onSubmit(values: z.infer<typeof registerFormSchema>) {
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
            case "INVALID_PASSWORD":
              showError(t("register.invalidPassword"));
              break;
            case "USER_EMAIL_PROVIDER_BLACKLISTED":
              showError(t("register.emailProviderBlacklisted"));
              break;
            case "REGISTRATION_DISABLED":
              showError(t("register.registrationDisabled"));
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
