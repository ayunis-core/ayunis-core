// Utils
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/shared/lib/shadcn/utils";
import { useTranslation } from "react-i18next";

// UI
import { Button } from "@/shared/ui/shadcn/button";
import {
  Avatar,
  AvatarImage,
} from "@/shared/ui/shadcn/avatar"

// Static
import avatar1 from "@/shared/assets/brand/avatar-1.png";
import avatar2 from "@/shared/assets/brand/avatar-2.png";
import avatar3 from "@/shared/assets/brand/avatar-3.png";

interface TrialLimitBannerProps {
  animate?: boolean;
}

export default function TrialLimitBanner({
  animate = false,
}: TrialLimitBannerProps) {
  const { t } = useTranslation("admin-settings-billing");
  const navigate = useNavigate();
  function handleExtendTrial() {
    window.location.href = "tel:+4989215470960";
  }

  function handleContactSales() {
    navigate({ to: "/admin-settings/billing" });
  }

  return (
    <div
      className={cn(
        "mt-3 rounded-2xl bg-black text-white p-5 shadow-lg transition-transform duration-300 ease-out max-w-[454px] mx-auto mt-9",
        animate && "scale-105 ring-4 ring-primary/50"
      )}
    >
      <div className="text-lg font-semibold mb-2">{t("trialLimitBanner.title")}</div>
      <p className="text-sm text-white/50 mb-4">
        <span className="text-white">{t("trialLimitBanner.descriptionPart1")}</span>
        {t("trialLimitBanner.descriptionPart2")}
      </p>

      <div className="flex items-center justify-between flex-wrap">
        <div className="*:data-[slot=avatar]:ring-background flex -space-x-2 *:data-[slot=avatar]:size-8 *:data-[slot=avatar]:ring-0">
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

        <div className="flex gap-3 mt-5 w-full">
          <Button variant="ghost" className="flex-1" onClick={handleExtendTrial}>
            +49 89 2154 7096-0
          </Button>

          <Button variant="secondary" className="flex-1" onClick={handleContactSales}>
            {t("trialLimitBanner.contactSales")}
          </Button>
        </div>
      </div>
    </div>
  );
}


