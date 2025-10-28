// Types
import type { ModelProviderInfoResponseDtoProvider } from "@/shared/api/generated/ayunisCoreAPI.schemas";

// Utils
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

// API
import {
  useModelsControllerGetPermittedLanguageModels,
  useModelsControllerManageUserDefaultModel,
  useModelsControllerGetAvailableModelsWithConfig,
  useModelsControllerCreatePermittedProvider,
  useModelsControllerCreatePermittedModel,
} from "@/shared/api/generated/ayunisCoreAPI";
import { useMe } from "@/widgets/app-sidebar/api/useMe";

// Lib
import { showError, showSuccess } from "@/shared/lib/toast";

type Choice = "eu" | "own" | "both";
type ProviderId = ModelProviderInfoResponseDtoProvider;

export function useApplyModelChoice() {
  const { t } = useTranslation(["onboarding", "common"]);
  const { user } = useMe();

  const {
    data: permittedModels,
    isLoading: isLoadingModels,
    error: loadError,
    refetch: refetchPermitted,
  } = useModelsControllerGetPermittedLanguageModels();

  const { mutateAsync: manageDefaultModel, isPending } = useModelsControllerManageUserDefaultModel();
  const { mutateAsync: createPermittedProvider } = useModelsControllerCreatePermittedProvider();
  const { mutateAsync: createPermittedModel } = useModelsControllerCreatePermittedModel();
  const { data: availableModels } = useModelsControllerGetAvailableModelsWithConfig();

  const isLoading = isLoadingModels || isPending;

  const providersByChoice = useMemo<Record<"eu" | "own", ProviderId[]>>(
    () => ({ eu: ["mistral"], own: ["ollama", "ayunis"] }),
    [],
  );

  const pickPermitted = (permitted: Array<{ provider: string; id: string }>, providers: ProviderId[]) =>
    permitted.find((m) => providers.includes(m.provider as ProviderId));

  const apply = async (choice: Choice) => {
    if (loadError) {
      return showError(t("applyErrorGeneric", { ns: "onboarding" }));
    }

    const providerTitleMap = {
      eu: t("step3.euModelsTitle", { ns: "onboarding" }),
      own: t("step3.ownModelsTitle", { ns: "onboarding" }),
      both: `${t("step3.euModelsTitle", { ns: "onboarding" })} & ${t("step3.ownModelsTitle", { ns: "onboarding" })}`,
    };
    const providerTitle = providerTitleMap[choice];

    const targetProviders: ProviderId[] =
      choice === "both"
        ? [...providersByChoice.eu, ...providersByChoice.own]
        : providersByChoice[choice];

    const ensureProviderHasPermittedModel = async (provider: ProviderId) => {
      const existing = pickPermitted(permittedModels || [], [provider]);
      if (existing) return existing;

      if (user?.role !== "admin") return null;

      try {
        await createPermittedProvider({ data: { provider } });
      } catch (err) {
        console.error("Error creating permitted provider", err);
      }

      if (!availableModels) return null;

      const candidate = availableModels
        .filter((m) => m.provider === provider && !m.isEmbedding)
        .sort((a, b) => a.displayName.localeCompare(b.displayName))[0];

      if (!candidate) return null;

      await createPermittedModel({ data: { modelId: candidate.modelId } });
      return candidate;
    };

    for (const provider of new Set(targetProviders)) {
      const has = pickPermitted(permittedModels || [], [provider]);
      if (!has) {
        const created = await ensureProviderHasPermittedModel(provider);
        if (!created) {
          showError(t("applyErrorGeneric", { ns: "onboarding" }));
          return;
        }
      }
    }

    const refreshed = await refetchPermitted();
    const refreshedPermitted = refreshed.data || permittedModels || [];

    let candidate = pickPermitted(refreshedPermitted, providersByChoice.eu);
    if (!candidate) candidate = pickPermitted(refreshedPermitted, targetProviders);

    if (!candidate) {
      showError(t("applyErrorGeneric", { ns: "onboarding" }));
      return;
    }

    await manageDefaultModel({ data: { permittedModelId: candidate.id } });
    showSuccess(t("applySuccess", { ns: "onboarding", provider: providerTitle }));
  };

  return { apply, isLoading };
}

export type { Choice };