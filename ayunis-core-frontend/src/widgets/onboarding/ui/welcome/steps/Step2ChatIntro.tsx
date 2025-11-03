// Utils
import { useTranslation } from "react-i18next";
import * as motion from "motion/react-client"

// UI
import { DialogDescription, DialogHeader } from "@/shared/ui/shadcn/dialog";
import { Button } from "@/shared/ui/shadcn/button";
import WelcomeGradientTitle from "../WelcomeGradientTitle";

// Static
import onboarding_step1 from "@/shared/assets/onboarding/onboarding_step1.png";

interface Step2ChatIntroProps {
  onNext: () => void;
  hasBeenSeen?: boolean;
}

export default function Step2ChatIntro({ onNext, hasBeenSeen = false }: Step2ChatIntroProps) {
  const { t } = useTranslation("onboarding");

  const animationProps = hasBeenSeen
    ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0 } as const }
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, ease: "easeOut" } as const };

  const imageAnimationProps = hasBeenSeen
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, transition: { duration: 0 } as const }
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.5, ease: "easeOut" } as const };

  return (
    <div className="overflow-hidden rounded-3xl w-full mx-auto bg-white">
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="flex flex-col justify-center p-8 sm:p-12">
          <DialogHeader className="gap-3">
            
            <motion.div
              initial={animationProps.initial}
              animate={animationProps.animate}
              transition={{ ...animationProps.transition, delay: 0.0 }}
            >
              <WelcomeGradientTitle>{t("step2.title")}</WelcomeGradientTitle>
            </motion.div>

            <motion.div
              initial={animationProps.initial}
              animate={animationProps.animate}
              transition={{ ...animationProps.transition, delay: 0.1 }}
            >
              <DialogDescription className="text-base">
                <span className="text-black">{t("step2.descriptionPrefix")}</span>
                {t("step2.description")}
              </DialogDescription>
            </motion.div>
          </DialogHeader>

          <motion.div
            initial={animationProps.initial}
            animate={animationProps.animate}
            transition={{ ...animationProps.transition, delay: 0.2 }}
            className="mt-5 flex gap-3"
          >
            <Button variant="default" className="px-12" onClick={onNext}>{t("common.next", { ns: "common" })}</Button>
          </motion.div>
        </div>

        <motion.div
          initial={imageAnimationProps.initial}
          animate={imageAnimationProps.animate}
          transition={{ ...imageAnimationProps.transition, delay: 0.1 }}
          className="hidden md:block"
        >
          <img src={onboarding_step1} alt="Ayunis Core" className="w-full h-full object-cover" />
        </motion.div>
      </div>
    </div>
  );
}


