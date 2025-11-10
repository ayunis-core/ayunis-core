import { SettingsLayout } from "../../settings-layout";
import { ProfileInformationCard } from "./ProfileInformationCard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/shadcn/card";
import { Button } from "@/shared/ui/shadcn/button";
import { useTranslation } from "react-i18next";
import PasswordSettingsPage from "./PasswordSettingsPage";
import { useDeleteAccount } from "../api/useDeleteAccount";
import { useConfirmation } from "@/widgets/confirmation-modal/model/useConfirmation";
import { useMe } from "@/widgets/app-sidebar/api/useMe";

export default function AccountSettingsPage({
  user,
}: {
  user: { name: string; email: string };
}) {
  const { t } = useTranslation("settings");
  const { user: currentUser } = useMe();
  const { deleteAccount, isLoading } = useDeleteAccount();
  const { confirm } = useConfirmation();

  const handleDeleteAccount = () => {
    if (!currentUser?.id) {
      return;
    }

    confirm({
      title: t("account.deleteAccountConfirmTitle"),
      description: t("account.deleteAccountConfirmDescription"),
      confirmText: t("account.deleteAccountConfirmButton"),
      cancelText: t("account.deleteAccountCancelButton"),
      variant: "destructive",
      onConfirm: () => {
        deleteAccount(currentUser.id);
      },
    });
  };

  return (
    <SettingsLayout title={t("account.title")}>
      <div className="space-y-4">
        <ProfileInformationCard user={user} />
        <PasswordSettingsPage />
        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle>{t("account.accountActions")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg">
              <div>
                <div className="font-medium">{t("account.deleteAccount")}</div>
                <div className="text-sm text-muted-foreground">
                  {t("account.deleteAccountDescription")}
                </div>
              </div>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={isLoading || !currentUser?.id}
              >
                {isLoading
                  ? t("account.deleteAccountLoading")
                  : t("account.deleteAccount")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </SettingsLayout>
  );
}
