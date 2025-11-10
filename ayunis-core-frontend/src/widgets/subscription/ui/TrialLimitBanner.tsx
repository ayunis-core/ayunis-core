// Utils
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

// UI
import { Button } from "@/shared/ui/shadcn/button";
import {
  Avatar,
  AvatarImage,
} from "@/shared/ui/shadcn/avatar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/shared/ui/shadcn/card";

// Static
import avatar1 from "@/shared/assets/brand/avatar-1.png";
import avatar2 from "@/shared/assets/brand/avatar-2.png";
import avatar3 from "@/shared/assets/brand/avatar-3.png";


export default function TrialLimitBanner() {
  const { t } = useTranslation("admin-settings-billing");
  const navigate = useNavigate();

  function handleExtendTrial() {
    window.location.href = "tel:+4989215470960";
  }

  function handleContactSales() {
    navigate({ to: "/admin-settings/billing" });
  }

  return (
    <Card
      className="mt-9 max-w-[454px] w-full mx-auto bg-black text-white transition-transform duration-300 ease-out"
    >
      <CardHeader>
        <CardTitle className="text-white">
          {t("trialLimitBanner.title")}
        </CardTitle>
        <CardDescription className="text-sm text-white/50">
          <span className="text-white">{t("trialLimitBanner.descriptionPart1")}</span>
          {t("trialLimitBanner.descriptionPart2")}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="*:data-[slot=avatar]:ring-background flex -space-x-2 *:data-[slot=avatar]:size-8 *:data-[slot=avatar]:ring-2">
          <Avatar>
            <AvatarImage src={avatar1} alt={t("trialLimitBanner.avatarAlt.benatsha")} />
          </Avatar>
          <Avatar>
            <AvatarImage src={avatar2} alt={t("trialLimitBanner.avatarAlt.liza")} />
          </Avatar>
          <Avatar>
            <AvatarImage src={avatar3} alt={t("trialLimitBanner.avatarAlt.moriz")} />
          </Avatar>
        </div>
      </CardContent>

      <CardFooter className="flex gap-3">
        <Button variant="ghost" className="flex-1" onClick={handleExtendTrial}>
          +49 89 2154 7096-0
        </Button>

        <Button variant="secondary" className="flex-1" onClick={handleContactSales}>
          {t("trialLimitBanner.contactSales")}
        </Button>
      </CardFooter>
    </Card>
  );
}


