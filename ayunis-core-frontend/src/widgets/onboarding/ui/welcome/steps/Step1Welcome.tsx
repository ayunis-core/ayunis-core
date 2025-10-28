// Utils
import { useTranslation } from "react-i18next";

// UI
import { DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/shadcn/dialog";
import { Button } from "@/shared/ui/shadcn/button";

// Static
import welcomeBg from "@/shared/assets/onboarding/welcome_bg.jpg";
import logoWhite from "@/shared/assets/brand/brand-full-white.svg";

interface Step1WelcomeProps {
  onNext: () => void;
}

export default function Step1Welcome({ onNext }: Step1WelcomeProps) {
  const { t } = useTranslation("common");

  return (
    <div
      className="overflow-hidden rounded-3xl w-full mx-auto bg-cover bg-center"
      style={{ backgroundImage: `url(${welcomeBg})` }}
    >
      <div className="p-10 sm:p-35">
        <DialogHeader>
          <DialogTitle className="text-center text-white text-2xl mb-5">
            {t("welcome.title")}
          </DialogTitle>
          <img src={logoWhite} alt="Ayunis Core" className="max-w-[305px] mx-auto mb-6" />
          <DialogDescription className="max-w-[470px] mx-auto text-center text-white text-base sm:text-lg mt-6 leading-relaxed">
            {t("welcome.subtitle")}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-10 flex justify-center gap-3">
          <Button size="lg" variant="outline" onClick={onNext}>
            {t("common.start")}
          </Button>
        </div>
      </div>
    </div>
  );
}


