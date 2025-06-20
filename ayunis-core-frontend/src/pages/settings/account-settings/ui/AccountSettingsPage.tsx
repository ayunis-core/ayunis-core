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

export default function AccountSettingsPage({
  user,
}: {
  user: { name: string; email: string };
}) {
  const { t } = useTranslation("settings");

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
              <Button variant="destructive">
                {t("account.deleteAccount")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </SettingsLayout>
  );
}
