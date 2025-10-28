// Utils
import { useTranslation } from "react-i18next";

// UI
import { DialogDescription, DialogHeader } from "@/shared/ui/shadcn/dialog";
import { Button } from "@/shared/ui/shadcn/button";
import WelcomeGradientTitle from "../WelcomeGradientTitle";

// Static
import onboarding_step4 from "@/shared/assets/onboarding/onboarding_step4.png";

interface Step5InviteProps {
  onBack: () => void;
  onNext: () => void;
}

export default function Step5Invite({ onBack, onNext }: Step5InviteProps) {
  const { t } = useTranslation("onboarding");

  return (
    <div className="overflow-hidden rounded-3xl w-full mx-auto bg-white">
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="flex flex-col justify-center p-8 sm:p-12">
          <DialogHeader>
            <WelcomeGradientTitle>{t("step5.title")}</WelcomeGradientTitle>
            <DialogDescription className="text-base text-black">
              {t("step5.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 flex gap-3">
            <Button className="min-w-[144px]" variant="outline" onClick={onBack}>{t("common.back", { ns: "common" })}</Button>
            <Button className="min-w-[144px]" variant="default" onClick={onNext}>{t("common.next", { ns: "common" })}</Button>
          </div>
        </div>

        <div className="hidden md:block">
          <img src={onboarding_step4} alt="Ayunis Assistant" className="w-full h-full object-cover" />
        </div>
      </div>
    </div>
  );
}


