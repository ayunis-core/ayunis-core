// Utils
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

// API
import {
  getModelsControllerGetUserSpecificDefaultModelQueryKey,
  getModelsControllerGetEffectiveDefaultModelQueryKey,
  getModelsControllerGetPermittedLanguageModelsQueryKey,
} from "@/shared/api/generated/ayunisCoreAPI";

// UI
import { Dialog, DialogContent } from "@/shared/ui/shadcn/dialog";

// Steps
import Step1Welcome from "./steps/Step1Welcome";
import Step2ChatIntro from "./steps/Step2ChatIntro";
import Step3ModelSelection from "./steps/Step3ModelSelection";
import Step4Assistants from "./steps/Step4Assistants";
import Step5Invite from "./steps/Step5Invite";
import Step6Choice from "./steps/Step6Choice";
import Step7Complete from "./steps/Step7Complete";

interface OnboardingDialogProps {
  userEmail?: string;
}

const STORAGE_KEY_PREFIX = "ayunis.onboarding.completed";

type WelcomeDialogStepType = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export default function OnboardingDialog({ userEmail }: OnboardingDialogProps) {
  useTranslation("common");
  const queryClient = useQueryClient();
  const router = useRouter();
  const storageKey = useMemo(() => {
    return `${STORAGE_KEY_PREFIX}:${userEmail ?? "anon"}`;
  }, [userEmail]);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<WelcomeDialogStepType>(1);
  const FIRST_STEP = 1 as const;
  const LAST_STEP = 7 as const;

  useEffect(() => {
    try {
      const completed = localStorage.getItem(storageKey);
      if (!completed) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [storageKey]);

  function completeAndClose() {
    localStorage.setItem(storageKey, "1");

    queryClient.invalidateQueries({ queryKey: getModelsControllerGetUserSpecificDefaultModelQueryKey() });
    queryClient.invalidateQueries({ queryKey: getModelsControllerGetEffectiveDefaultModelQueryKey() });
    queryClient.invalidateQueries({ queryKey: getModelsControllerGetPermittedLanguageModelsQueryKey() });
    router.invalidate();
    setOpen(false);
  }

  function goNext() {
    setStep((current) => {
      if (current < LAST_STEP) {
        return ((current + 1) as WelcomeDialogStepType);
      }

      completeAndClose();
      return current;
    });
  }

  function goBack() {
    setStep((current) => {
      if (current > FIRST_STEP) {
        return ((current - 1) as WelcomeDialogStepType);
      }

      setOpen(false);
      return current;
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? completeAndClose() : setOpen(o))}>
      <DialogContent showCloseButton={false} className="sm:max-w-5xl min-h-[552px] p-0 border-0 bg-transparent shadow-none rounded-4xl overflow-hidden">
        {step === 1 && <Step1Welcome onNext={goNext} />}
        {step === 2 && <Step2ChatIntro onNext={goNext} />}
        {step === 3 && (
          <Step3ModelSelection
            onBack={goBack}
            onNext={goNext}
          />
        )}
        {step === 4 && <Step4Assistants onBack={goBack} onNext={goNext} />}
        {step === 5 && <Step5Invite onBack={goBack} onNext={goNext} />}
        {step === 6 && (
          <Step6Choice
            onBack={goBack}
            onNext={goNext}
          />
        )}
        {step === 7 && <Step7Complete onNext={goNext} />}
      </DialogContent>
    </Dialog>
  );
}
