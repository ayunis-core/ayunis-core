// Utils
import { useEffect, useMemo, useState } from "react";
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
import Step4Assistants from "./steps/Step4Assistants";
import Step5Invite from "./steps/Step5Invite";
import Step7Complete from "./steps/Step7Complete";

interface OnboardingDialogProps {
  userEmail?: string;
}

const STORAGE_KEY_PREFIX = "ayunis.onboarding.completed";

type WelcomeDialogStepType = 1 | 2 | 3 | 4 | 5;

export default function OnboardingDialog({ userEmail }: OnboardingDialogProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const storageKey = useMemo(() => {
    return `${STORAGE_KEY_PREFIX}:${userEmail ?? "anon"}`;
  }, [userEmail]);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<WelcomeDialogStepType>(1);
  const [visitedSteps, setVisitedSteps] = useState<Set<WelcomeDialogStepType>>(new Set([]));
  const FIRST_STEP = 1 as const;
  const LAST_STEP = 5 as const;

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
    console.log("goNext", visitedSteps);
    setStep((current) => {
      if (current < LAST_STEP) {
        const nextStep = ((current + 1) as WelcomeDialogStepType);
        setVisitedSteps((prev) => new Set([...prev, current]));
        return nextStep;
      }

      completeAndClose();
      return current;
    });
  }

  function goBack() {
    setStep((current) => {
      if (current > FIRST_STEP) {
        if (!visitedSteps.has(current)) {
          setVisitedSteps((prev) => new Set([...prev, current]));
        }
        return ((current - 1) as WelcomeDialogStepType);
      }

      setOpen(false);
      return current;
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen} >
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        showCloseButton={false}
        className="sm:max-w-5xl min-h-[552px] p-0 border-0 bg-transparent shadow-none overflow-hidden"
      >
        {step === 1 && <Step1Welcome onNext={goNext} hasBeenSeen={visitedSteps.has(1)} />}
        {step === 2 && <Step2ChatIntro onNext={goNext} hasBeenSeen={visitedSteps.has(2)} />}
        {step === 3 && <Step4Assistants onBack={goBack} onNext={goNext} hasBeenSeen={visitedSteps.has(3)} />}
        {step === 4 && <Step5Invite onBack={goBack} onNext={goNext} hasBeenSeen={visitedSteps.has(4)} />}
        {step === 5 && <Step7Complete onNext={goNext} hasBeenSeen={visitedSteps.has(5)} />}
      </DialogContent>
    </Dialog>
  );
}
