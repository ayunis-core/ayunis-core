import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useUserControllerUpdatePassword } from "@/shared/api/generated/ayunisCoreAPI";
import {
  updatePasswordFormSchema,
  type UpdatePasswordFormValues,
} from "../model/updatePasswordSchema";
import extractErrorData from "@/shared/api/extract-error-data";
import { showError, showSuccess } from "@/shared/lib/toast";
import { useTranslation } from "react-i18next";

export function usePasswordUpdate() {
  const { t } = useTranslation("settings");
  const updateMutation = useUserControllerUpdatePassword();

  const form = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      newPasswordConfirmation: "",
    },
  });

  function onSubmit(values: UpdatePasswordFormValues) {
    updateMutation.mutate(
      {
        data: {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
          newPasswordConfirmation: values.newPasswordConfirmation,
        },
      },
      {
        onSuccess: () => {
          showSuccess(t("account.passwordUpdatedSuccessfully"));
          form.reset();
        },
        onError: (error) => {
          console.error("Password update failed:", error);
          const { status } = extractErrorData(error);
          if (status === 400) {
            showError(t("account.error.invalidPassword"));
          } else if (status === 401) {
            showError(t("account.error.incorrectCurrentPassword"));
          } else {
            showError(t("account.error.updateFailed"));
          }
        },
      },
    );
  }

  return {
    form,
    onSubmit,
    isUpdating: updateMutation.isPending,
  };
}
