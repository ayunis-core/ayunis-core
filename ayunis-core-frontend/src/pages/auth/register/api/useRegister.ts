import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "@tanstack/react-router";
import { useAuthenticationControllerRegister } from "@/shared/api/generated/ayunisCoreAPI";
import { registerFormSchema, type RegisterFormValues } from "./registerSchema";
import { showError } from "@/shared/lib/toast";
import extractErrorData from "@/shared/api/extract-error-data";

export function useRegister() {
  const navigate = useNavigate();
  const registerMutation = useAuthenticationControllerRegister();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      orgName: "",
      userName: "",
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
          navigate({ to: "/login" });
        },
        onError: (error) => {
          console.error("Registration failed:", error);
          const { message } = extractErrorData(error);
          if (message) showError(message);
          else showError("Registration failed");
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
