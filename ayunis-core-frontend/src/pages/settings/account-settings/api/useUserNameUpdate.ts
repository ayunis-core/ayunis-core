import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useUserControllerUpdateUserName } from "@/shared/api/generated/ayunisCoreAPI";
import {
  updateUserNameFormSchema,
  type UpdateUserNameFormValues,
} from "../model/updateUserNameSchema";
import extractErrorData from "@/shared/api/extract-error-data";
import { showError, showSuccess } from "@/shared/lib/toast";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

export function useUserNameUpdate(currentName: string) {
  const { t } = useTranslation("settings");
  const updateMutation = useUserControllerUpdateUserName();
  const queryClient = useQueryClient();

  const form = useForm<UpdateUserNameFormValues>({
    resolver: zodResolver(updateUserNameFormSchema),
    defaultValues: {
      name: currentName,
    },
  });

  const onSubmit = (values: UpdateUserNameFormValues) => {
    updateMutation.mutate(
      {
        data: {
          name: values.name,
        },
      },
      {
        onSuccess: () => {
          showSuccess(t("account.nameUpdatedSuccessfully"));
          queryClient.invalidateQueries({
            queryKey: ["me"],
          });
        },
        onError: (error) => {
          console.error("Username update failed:", error);
          const { status } = extractErrorData(error);
          if (status === 400) {
            showError(t("account.error.invalidName"));
          } else {
            showError(t("account.error.updateFailed"));
          }
        },
      },
    );
  };

  return {
    form,
    onSubmit,
    isUpdating: updateMutation.isPending,
  };
}
