// Types
import type { ModelProviderWithPermittedStatusResponseDto } from "@/shared/api";

// Utils
import { useTranslation } from "react-i18next";
import { useState } from "react";

// API
import { useModelsControllerGetPermittedLanguageModels } from "@/shared/api/generated/ayunisCoreAPI";

// UI
import { DialogDescription, DialogHeader } from "@/shared/ui/shadcn/dialog";
import { Button } from "@/shared/ui/shadcn/button";
import { Separator } from "@/shared/ui/shadcn/separator";
import WelcomeGradientTitle from "../WelcomeGradientTitle";
import WelcomeModelSwitcher from "../WelcomeModelSwitcher";

// Features
import { useApplyModelChoice } from "@/features/onboarding/useApplyModelChoice";
import ProviderConfirmationDialog from "@/entities/model/ui/ProviderConfirmationDialog";

type ModelSelection = "none" | "eu" | "own" | "both";

interface Step6ChoiceProps {
  onBack: () => void;
  onNext: () => void;
}

export default function Step6Choice({ onBack, onNext }: Step6ChoiceProps) {
  const { t } = useTranslation("onboarding");
  const { apply, isLoading } = useApplyModelChoice();
  const [submitting, setSubmitting] = useState(false);
  const [selection, setSelection] = useState<ModelSelection>("none");
  const { data: permittedModels } = useModelsControllerGetPermittedLanguageModels();
  const [providerDialogOpen, setProviderDialogOpen] = useState(false);
  const [dialogProvider, setDialogProvider] = useState<ModelProviderWithPermittedStatusResponseDto | null>(null);

  async function handleNext() {
    if (submitting || isLoading || selection === "none") return;
    setSubmitting(true);
    try {
      await apply(selection as Exclude<ModelSelection, "none">);
      onNext();
    } catch {
      // toast handled in hook
    } finally {
      setSubmitting(false);
    }
  }

  function handleEuToggle(checked: boolean) {
    // when enabling EU, if mistral isn't permitted, show confirmation dialog
    if (checked) {
      const hasMistral = (permittedModels || []).some((m) => m.provider === "mistral");
      if (!hasMistral && permittedModels !== undefined) {
        setDialogProvider({ provider: "mistral", displayName: t("step3.euModelsTitle"), isPermitted: false } as any);
        setProviderDialogOpen(true);
        return;
      }
    }

    // Update selection based on current state
    if (checked) {
      setSelection(selection === "own" ? "both" : "eu");
    } else {
      setSelection(selection === "both" ? "own" : "none");
    }
  }

  function handleOwnToggle(checked: boolean) {
    if (checked) {
      const hasOwn = (permittedModels || []).some((m) => ["ollama", "ayunis"].includes(m.provider));
      if (!hasOwn && permittedModels !== undefined) {
        setDialogProvider({ provider: "ollama", displayName: t("step3.ownModelsTitle"), isPermitted: false } as any);
        setProviderDialogOpen(true);
        return;
      }
    }

    // Update selection based on current state
    if (checked) {
      setSelection(selection === "eu" ? "both" : "own");
    } else {
      setSelection(selection === "both" ? "eu" : "none");
    }
  }

  return (
    <>
    <div className="overflow-hidden rounded-3xl w-full mx-auto bg-white">
      <div className="flex h-full flex-col p-8 sm:p-12">
        <DialogHeader className="gap-4">
          <WelcomeGradientTitle className="text-3xl text-center">{t("step6.title")}</WelcomeGradientTitle>
          <DialogDescription className="text-lg text-center max-w-[718px] mx-auto">
            {t("step6.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-12 mt-10">
          <div className="flex-1 py-7">
            <WelcomeModelSwitcher
              icon="🇪🇺"
              title={t("step3.euModelsTitle")}
              subtitle={t("step3.euModelsSubtitle")}
              checked={selection === "eu" || selection === "both"}
              onCheckedChange={handleEuToggle}
              className="mb-12"
            />
            <h4 className="text-base font-medium">{t("step6.euHighlightTitle")}</h4>
            <p className="text-base text-gray-500">{t("step6.euHighlightDesc")}</p>
          </div>

          <Separator orientation="vertical" className="h-full" />

          <div className="flex-1 py-7">
            <WelcomeModelSwitcher
              icon="🇩🇪"
              title={t("step3.ownModelsTitle")}
              subtitle="Ollama, Gwen"
              checked={selection === "own" || selection === "both"}
              onCheckedChange={handleOwnToggle}
              className="mb-12"
            />
            <h4 className="text-base font-medium">{t("step6.ownHighlightTitle")}</h4>
            <p className="text-base text-gray-500">{t("step6.ownHighlightDesc")}</p>
          </div>
        </div>

        <div className="mt-auto ml-auto flex gap-3 pt-9">
          <Button className="min-w-[144px]" variant="outline" onClick={onBack}>{t("common.back", { ns: "common" })}</Button>
          <Button className="min-w-[144px]" variant="default" onClick={handleNext} disabled={submitting || isLoading || selection === "none"}>
            {t("common.next", { ns: "common" })}
          </Button>
        </div>
      </div>
    </div>

    {dialogProvider && (
      <ProviderConfirmationDialog
        provider={dialogProvider!}
        isOpen={providerDialogOpen}
        onOpenChange={setProviderDialogOpen}
        onConfirm={() => {
          const p = dialogProvider;
          if (!p) return;
          if (p.provider === "mistral") {
            setSelection(selection === "own" ? "both" : "eu");
          } else {
            setSelection(selection === "eu" ? "both" : "own");
          }
          setProviderDialogOpen(false);
        }}
      />
    )}
    </>
  );
}


