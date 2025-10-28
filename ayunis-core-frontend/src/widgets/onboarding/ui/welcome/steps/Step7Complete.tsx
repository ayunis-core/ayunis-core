// Utils
import { useTranslation } from "react-i18next";

// UI
import { DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/shadcn/dialog";
import { Button } from "@/shared/ui/shadcn/button";

// Static
import welcomeBg from "@/shared/assets/onboarding/welcome_bg.jpg";

interface Step7CompleteProps {
  onNext: () => void;
}

export default function Step7Complete({ onNext }: Step7CompleteProps) {
  const { t } = useTranslation("onboarding");

  return (
    <div
      className="overflow-hidden rounded-3xl w-full mx-auto bg-cover bg-center"
      style={{ backgroundImage: `url(${welcomeBg})` }}
    >
      <div className="p-10 sm:p-35">
        <DialogHeader className="gap-5">
          <DialogTitle className="text-center text-white text-3xl">
            {t("step7.title")}
          </DialogTitle>
          <DialogDescription className="max-w-[718px] mx-auto text-center text-white text-base">
            {t("step7.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5 flex justify-center gap-3">
          <Button size="lg" variant="outline" onClick={onNext}>
            {t("step7.cta")}
          </Button>
        </div>
      </div>
    </div>
  );
}


