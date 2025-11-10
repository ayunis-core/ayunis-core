// Utils
import { useTranslation } from "react-i18next";

// UI
import { Button } from "@/shared/ui/shadcn/button";
import WelcomeGradientTitle from "../WelcomeGradientTitle";

// Static
import onboarding_step4 from "@/shared/assets/onboarding/onboarding_step4.png";

interface Step4InviteProps {
  onBack: () => void;
  onNext: () => void;
  hasBeenSeen?: boolean;
}

export default function Step4Invite({ onBack, onNext, hasBeenSeen: _hasBeenSeen = false }: Step4InviteProps) {
  const { t } = useTranslation("onboarding");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2">
      <div className="flex flex-col justify-center p-8 sm:p-12">
        <WelcomeGradientTitle>{t("step4.title")}</WelcomeGradientTitle>

        <p className="text-base text-muted-foreground mt-3">
          <span className="text-black">{t("step4.descriptionPrefix")}</span>
          {t("step4.description")}
        </p>

        <div className="flex mt-5 gap-3">
          <Button className="min-w-[144px]" variant="outline" onClick={onBack}>{t("common.back", { ns: "common" })}</Button>
          <Button className="min-w-[144px]" variant="default" onClick={onNext}>{t("common.next", { ns: "common" })}</Button>
        </div>
      </div>

      <div className="hidden md:block">
        <img src={onboarding_step4} alt="Ayunis Assistant" className="w-full h-full object-cover" />
      </div>
    </div>
  );
}


