// Utils
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import * as motion from "motion/react-client"

// UI
import { DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/shadcn/dialog";
import { Button } from "@/shared/ui/shadcn/button";

// Static
import welcomeBg from "@/shared/assets/onboarding/welcome_bg.jpg";
import logoWhite from "@/shared/assets/brand/brand-full-white.svg";

interface Step1WelcomeProps {
  onNext: () => void;
  hasBeenSeen?: boolean;
}

export default function Step1Welcome({ onNext, hasBeenSeen = false }: Step1WelcomeProps) {
  const { t } = useTranslation("common");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const animationProps = hasBeenSeen
    ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0 } as const }
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, ease: "easeOut" } as const };

  return (
    <div
      className={`flex overflow-hidden rounded-3xl w-full mx-auto bg-cover bg-center transition-opacity duration-500 ease-out ${
        mounted ? "opacity-100" : "opacity-0"
      }`}
      style={{ backgroundImage: `url(${welcomeBg})` }}
    >
      <div className="m-auto">
        <DialogHeader className="gap-0">
          <motion.div
            initial={animationProps.initial}
            animate={animationProps.animate}
            transition={{ ...animationProps.transition, delay: 0.0 }}
          >
            <DialogTitle className="text-center text-white text-2xl mb-1">
              {t("welcome.title")}
            </DialogTitle>
          </motion.div>

          <motion.img
            initial={animationProps.initial}
            animate={animationProps.animate}
            transition={{ ...animationProps.transition, delay: 0.1 }}
            src={logoWhite}
            alt="Ayunis Core"
            className="max-w-[305px] mx-auto mb-4"
          />

          <motion.div
            initial={animationProps.initial}
            animate={animationProps.animate}
            transition={{ ...animationProps.transition, delay: 0.2 }}
          >
            <DialogDescription className="max-w-[470px] mx-auto text-center text-white text-base leading-normal font-normal mt-6  mt-0">
              {t("welcome.subtitle")}
            </DialogDescription>
          </motion.div>
        </DialogHeader>

        <motion.div
          initial={animationProps.initial}
          animate={animationProps.animate}
          transition={{ ...animationProps.transition, delay: 0.3 }}
          className="mt-11 flex justify-center gap-3"
        >
          <Button size="lg" variant="outline" onClick={onNext}>
            {t("common.start")}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}


