// Utils
import { Trans, useTranslation } from "react-i18next";

// UI
import { Button } from "@/shared/ui/shadcn/button";

// Static
import welcomeBg from "@/shared/assets/onboarding/welcome_bg.jpg";

interface Step5CompleteProps {
  onNext: () => void;
}

export default function Step5Complete({ onNext }: Step5CompleteProps) {
  const { t } = useTranslation("onboarding");

  return (
    <div
      className="flex w-full bg-cover bg-center"
      style={{ backgroundImage: `url(${welcomeBg})` }}
    >
      <div className="m-auto">
        <h2 className="text-center text-white text-3xl font-semibold">
          <Trans i18nKey="step5.title" ns="onboarding" />
        </h2>

        <div className="mt-5 flex justify-center gap-3">
          <Button size="lg" variant="outline" onClick={onNext}>
            {t("step5.cta")}
          </Button>
        </div>
      </div>
    </div>
  );
}


