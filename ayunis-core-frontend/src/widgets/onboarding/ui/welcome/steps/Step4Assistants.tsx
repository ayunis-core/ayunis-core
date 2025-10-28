// Utils
import { useTranslation } from "react-i18next";

// UI
import { DialogDescription, DialogHeader } from "@/shared/ui/shadcn/dialog";
import { Button } from "@/shared/ui/shadcn/button";
import WelcomeGradientTitle from "../WelcomeGradientTitle";

// Static
import onboarding_step3 from "@/shared/assets/onboarding/onboarding_step3.png";

interface Step4AssistantsProps {
  onBack: () => void;
  onNext: () => void;
}

export default function Step4Assistants({ onBack, onNext }: Step4AssistantsProps) {
  const { t } = useTranslation("onboarding");

  return (
    <div className="overflow-hidden rounded-3xl w-full mx-auto bg-white">
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="flex flex-col justify-center p-8 sm:p-12">
          <DialogHeader>
            <WelcomeGradientTitle>{t("step4.title")}</WelcomeGradientTitle>
            <DialogDescription>
              <span className="text-black">{t("step4.descriptionPrefix")}</span>
              {t("step4.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 flex gap-3">
            <Button className="min-w-[144px]" variant="outline" onClick={onBack}>{t("common.back", { ns: "common" })}</Button>
            <Button className="min-w-[144px]" variant="default" onClick={onNext}>{t("common.next", { ns: "common" })}</Button>
          </div>
        </div>

        <div className="hidden md:block">
          <img src={onboarding_step3} alt="Ayunis Assistant" className="w-full h-full object-cover mt-[51px]" />
        </div>
      </div>
    </div>
  );
}


