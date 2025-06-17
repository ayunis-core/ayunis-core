import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "@tanstack/react-router";
import { useAuthenticationControllerRegister } from "@/shared/api/generated/ayunisCoreAPI";
import { registerFormSchema, type RegisterFormValues } from "./registerSchema";

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

  const onSubmit = (values: RegisterFormValues) => {
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
          // Redirect to login or dashboard after successful registration
          navigate({ to: "/login" });
        },
        onError: (error) => {
          console.error("Registration failed:", error);
          // Handle error (show toast, form errors, etc.)
        },
      },
    );
  };

  return {
    form,
    onSubmit,
    isLoading: registerMutation.isPending,
  };
}
