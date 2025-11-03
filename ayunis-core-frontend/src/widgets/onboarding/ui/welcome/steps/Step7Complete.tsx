// Utils
import { Trans, useTranslation } from "react-i18next";
import * as motion from "motion/react-client";

// UI
import { DialogHeader, DialogTitle } from "@/shared/ui/shadcn/dialog";
import { Button } from "@/shared/ui/shadcn/button";

// Static
import welcomeBg from "@/shared/assets/onboarding/welcome_bg.jpg";

interface Step7CompleteProps {
  onNext: () => void;
  hasBeenSeen?: boolean;
}

export default function Step7Complete({ onNext, hasBeenSeen = false }: Step7CompleteProps) {
  const { t } = useTranslation("onboarding");

  const animationProps = hasBeenSeen
    ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0 } as const }
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, ease: "easeOut" } as const };

  return (
    <div
      className="flex overflow-hidden rounded-3xl w-full mx-auto bg-cover bg-center"
      style={{ backgroundImage: `url(${welcomeBg})` }}
    >
      <div className="m-auto">
        <DialogHeader className="gap-5">
          <motion.div
            initial={animationProps.initial}
            animate={animationProps.animate}
            transition={{ ...animationProps.transition, delay: 0.0 }}
          >
            <DialogTitle className="text-center text-white text-3xl">
              <Trans i18nKey="step7.title" ns="onboarding" />
            </DialogTitle>
          </motion.div>
        </DialogHeader>

        <motion.div
          initial={animationProps.initial}
          animate={animationProps.animate}
          transition={{ ...animationProps.transition, delay: 0.2 }}
          className="mt-5 flex justify-center gap-3"
        >
          <Button size="lg" variant="outline" onClick={onNext}>
            {t("step7.cta")}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}


