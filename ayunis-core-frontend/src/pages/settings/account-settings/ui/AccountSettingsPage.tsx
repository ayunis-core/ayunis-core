import { SettingsLayout } from "../../settings-layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/shadcn/card";
import { Label } from "@/shared/ui/shadcn/label";
import { Input } from "@/shared/ui/shadcn/input";
import { Button } from "@/shared/ui/shadcn/button";
import { Separator } from "@/shared/ui/shadcn/separator";
import { useTranslation } from "react-i18next";

export default function AccountSettingsPage() {
  const { t } = useTranslation("settings");

  return (
    <SettingsLayout title={t("account.title")}>
      <div className="space-y-4">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t("account.profileInformation")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="full-name">{t("account.fullName")}</Label>
              <Input
                id="full-name"
                type="text"
                placeholder={t("account.fullNamePlaceholder")}
                defaultValue="John Doe"
              />
              <p className="text-sm text-muted-foreground">
                {t("account.fullNameDescription")}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">{t("account.emailAddress")}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("account.emailPlaceholder")}
                defaultValue="john.doe@example.com"
              />
              <p className="text-sm text-muted-foreground">
                {t("account.emailDescription")}
              </p>
            </div>

            <div className="flex justify-end">
              <Button>{t("account.saveChanges")}</Button>
            </div>
          </CardContent>
        </Card>

        {/* Password Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t("account.password")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="current-password">
                {t("account.currentPassword")}
              </Label>
              <Input
                id="current-password"
                type="password"
                placeholder={t("account.currentPasswordPlaceholder")}
              />
            </div>

            <Separator />

            <div className="grid gap-2">
              <Label htmlFor="new-password">{t("account.newPassword")}</Label>
              <Input
                id="new-password"
                type="password"
                placeholder={t("account.newPasswordPlaceholder")}
              />
              <p className="text-sm text-muted-foreground">
                {t("account.newPasswordDescription")}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirm-password">
                {t("account.confirmPassword")}
              </Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder={t("account.confirmPasswordPlaceholder")}
              />
            </div>

            <div className="flex justify-end">
              <Button>{t("account.changePassword")}</Button>
            </div>
          </CardContent>
        </Card>

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
