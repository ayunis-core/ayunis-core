// Utils
import { useTranslation } from "react-i18next";

// UI
import { DialogDescription, DialogHeader } from "@/shared/ui/shadcn/dialog";
import { Button } from "@/shared/ui/shadcn/button";
import WelcomeGradientTitle from "../WelcomeGradientTitle";
import WelcomeModelSwitcher from "../WelcomeModelSwitcher";

interface Step3ModelSelectionProps {
  onBack: () => void;
  onNext: () => void;
}

export default function Step3ModelSelection({ onBack, onNext }: Step3ModelSelectionProps) {
  const { t } = useTranslation("onboarding");

  return (
    <div className="overflow-hidden rounded-3xl w-full mx-auto bg-white">
      <div className="grid grid-cols-1 md:grid-cols-2 h-full">
        <div className="flex flex-col justify-center p-8 sm:p-12">
          <DialogHeader className="gap-3">
            <WelcomeGradientTitle>{t("step3.title")}</WelcomeGradientTitle>
            <DialogDescription className="text-base text-black">
              {t("step3.description")}
            </DialogDescription>
            <DialogDescription className="text-base text-black">
              {t("step3.note")}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 flex gap-3">
            <Button className="min-w-[144px]" variant="outline" onClick={onBack}>{t("common.back", { ns: "common" })}</Button>
            <Button className="min-w-[144px]" variant="default" onClick={onNext}>{t("common.next", { ns: "common" })}</Button>
          </div>
        </div>

        <div className="hidden md:flex">
          <div className="flex flex-col gap-6 my-auto w-full max-w-[362px] mx-auto pointer-events-none">
            <WelcomeModelSwitcher
              icon="🇪🇺"
              title={t("step3.euModelsTitle")}
              subtitle={t("step3.euModelsSubtitle")}
              checked={true}
            />
            <WelcomeModelSwitcher
              icon="🇺🇸"
              title={t("step3.usModelsTitle")}
              subtitle={t("step3.usModelsSubtitle")}
              defaultChecked={false}
            />
            <WelcomeModelSwitcher
              icon="🇩🇪"
              title={t("step3.ownModelsTitle")}
              subtitle={t("step3.ownModelsSubtitle")}
              defaultChecked={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}


