// Utils
import { useTranslation } from "react-i18next";

// UI
import { Button } from "@/shared/ui/shadcn/button";
import WelcomeGradientTitle from "../WelcomeGradientTitle";

// Static
import onboarding_step1 from "@/shared/assets/onboarding/onboarding_step1.png";

interface Step2ChatIntroProps {
  onNext: () => void;
  hasBeenSeen?: boolean;
}

export default function Step2ChatIntro({ onNext, hasBeenSeen: _hasBeenSeen = false }: Step2ChatIntroProps) {
  const { t } = useTranslation("onboarding");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2">
      <div className="flex flex-col justify-center p-8 sm:p-12">
        <WelcomeGradientTitle>{t("step2.title")}</WelcomeGradientTitle>

        <p className="text-base text-muted-foreground mt-3">
          <span className="text-black">{t("step2.descriptionPrefix")}</span>
          {t("step2.description")}
        </p>

        <div className="flex mt-5 gap-3">
          <Button variant="default" className="min-w-[144px]" onClick={onNext}>{t("common.next", { ns: "common" })}</Button>
        </div>
      </div>

      <div className="hidden md:block">
        <img src={onboarding_step1} alt="Ayunis Core" className="w-full h-full object-cover" />
      </div>
    </div>
  );
}


