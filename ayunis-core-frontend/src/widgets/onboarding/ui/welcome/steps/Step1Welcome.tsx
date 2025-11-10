// Utils  
import { useTranslation } from "react-i18next";

// UI
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
      className="flex w-full bg-cover bg-center"
      style={{ backgroundImage: `url(${welcomeBg})` }}
    >
      <div className="m-auto">
        <h2 className="text-center text-white text-2xl font-semibold mb-1">
          {t("welcome.title")}
        </h2>

        <img
          src={logoWhite}
          alt="Ayunis Core"
          className="max-w-[305px] mx-auto mb-4"
        />

        <p className="max-w-[470px] mx-auto text-center text-white text-base leading-normal font-normal">
          {t("welcome.subtitle")}
        </p>

        <div className="mt-11 flex justify-center gap-3">
          <Button size="lg" variant="outline" onClick={onNext}>
            {t("common.start")}
          </Button>
        </div>
      </div>
    </div>
  );
}


