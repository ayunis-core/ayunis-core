// Utils
import { useTranslation } from "react-i18next";

// UI
import { DialogDescription, DialogHeader } from "@/shared/ui/shadcn/dialog";
import { Button } from "@/shared/ui/shadcn/button";
import WelcomeGradientTitle from "../WelcomeGradientTitle";

// Static
import onboarding_step1 from "@/shared/assets/onboarding/onboarding_step1.png";

interface Step2ChatIntroProps {
  onNext: () => void;
}

export default function Step2ChatIntro({ onNext }: Step2ChatIntroProps) {
  const { t } = useTranslation("onboarding");

  return (
    <div className="overflow-hidden rounded-3xl w-full mx-auto bg-white">
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="flex flex-col justify-center p-8 sm:p-12">
          <DialogHeader className="gap-3">
            <WelcomeGradientTitle>{t("step2.title")}</WelcomeGradientTitle>
            <DialogDescription className="text-base">
              <span className="text-black">{t("step2.descriptionPrefix")}</span>
              {t("step2.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 flex gap-3">
            <Button variant="default" className="px-12" onClick={onNext}>{t("common.next", { ns: "common" })}</Button>
          </div>
        </div>

        <div className="hidden md:block">
          <img src={onboarding_step1} alt="Ayunis Core" className="w-full h-full object-cover" />
        </div>
      </div>
    </div>
  );
}


