import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/shadcn/alert';
import { Switch } from '@/shared/ui/shadcn/switch';
import { Label } from '@/shared/ui/shadcn/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { useLanguageModels, useImageGenerationModels } from '@/features/models';
import { ModelTypeCard } from '@/widgets/model-type-card';
import type { ModelActions } from '@/widgets/model-type-card';
import { TriangleAlert } from 'lucide-react';
import type {
  ModelWithConfigResponseDto,
  PermittedImageGenerationModelResponseDto,
  PermittedLanguageModelResponseDto,
  TeamResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { getTeamsControllerGetTeamQueryKey } from '@/shared/api/generated/ayunisCoreAPI';
import { useTeamPermittedModels } from '../api/useTeamPermittedModels';
import { useTeamPermittedImageGenerationModels } from '../api/useTeamPermittedImageGenerationModels';
import { useCreateTeamPermittedModel } from '../api/useCreateTeamPermittedModel';
import { useDeleteTeamPermittedModel } from '../api/useDeleteTeamPermittedModel';
import { useUpdateTeamPermittedModel } from '../api/useUpdateTeamPermittedModel';
import { useToggleModelOverride } from '../api/useToggleModelOverride';
import { TeamDefaultModelCard } from './TeamDefaultModelCard';

interface TeamModelsTabProps {
  readonly teamId: string;
  readonly teamName: string;
  readonly modelOverrideEnabled: boolean;
}

type TeamPermittedModel =
  PermittedLanguageModelResponseDto | PermittedImageGenerationModelResponseDto;

/**
 * Merges the org-permitted models with the team's overrides into the shape the
 * shared ModelTypeCard expects, flagging which models the team has enabled.
 */
function buildModelsForCard(
  orgModels: ModelWithConfigResponseDto[],
  teamPermittedModels: TeamPermittedModel[],
): ModelWithConfigResponseDto[] {
  const permittedByModelId = new Map(
    teamPermittedModels.map((m) => [m.modelId, m]),
  );
  return orgModels
    .filter((model) => model.isPermitted)
    .map((model) => {
      const teamModel = permittedByModelId.get(model.modelId);
      return {
        ...model,
        isPermitted: permittedByModelId.has(model.modelId),
        isDefault: false,
        permittedModelId: teamModel?.id ?? null,
        anonymousOnly: teamModel?.anonymousOnly ?? null,
      };
    });
}

/**
 * Destructive alert shown when a model list fails to load, so a transient API
 * error is never mistaken for "no models configured".
 */
function ModelLoadError() {
  const { t: tModels } = useTranslation('admin-settings-models');
  return (
    <Alert variant="destructive">
      <TriangleAlert className="h-4 w-4" />
      <AlertTitle>{tModels('models.loadErrorTitle')}</AlertTitle>
      <AlertDescription>
        {tModels('models.loadErrorDescription')}
      </AlertDescription>
    </Alert>
  );
}

export function TeamModelsTab({
  teamId,
  teamName,
  modelOverrideEnabled,
}: TeamModelsTabProps) {
  const queryClient = useQueryClient();
  const cachedTeam = queryClient.getQueryData<TeamResponseDto>(
    getTeamsControllerGetTeamQueryKey(teamId),
  );
  const effectiveOverrideEnabled =
    cachedTeam?.modelOverrideEnabled ?? modelOverrideEnabled;
  const { t } = useTranslation('admin-settings-teams');
  const { toggleModelOverride, isToggling } = useToggleModelOverride(
    teamId,
    teamName,
  );
  const { models: languageModels, isError: hasLanguageError } =
    useLanguageModels();
  const { models: imageGenerationModels, isError: hasImageGenerationError } =
    useImageGenerationModels();
  const {
    models: teamPermittedModels,
    isLoading: isLoadingTeamModels,
    isError: hasTeamLanguageError,
  } = useTeamPermittedModels(teamId);
  const { models: teamPermittedImageModels, isError: hasTeamImageError } =
    useTeamPermittedImageGenerationModels(teamId);
  const { createTeamPermittedModel, isCreating } =
    useCreateTeamPermittedModel(teamId);
  const { deleteTeamPermittedModel, isDeleting } =
    useDeleteTeamPermittedModel(teamId);
  const { updateTeamPermittedModel } = useUpdateTeamPermittedModel(teamId);

  const languageModelsForCard = buildModelsForCard(
    languageModels,
    teamPermittedModels,
  ).map((model) => {
    const teamModel = teamPermittedModels.find(
      (m) => m.modelId === model.modelId,
    );
    return { ...model, isDefault: teamModel?.isDefault ?? false };
  });

  const imageModelsForCard = buildModelsForCard(
    imageGenerationModels,
    teamPermittedImageModels,
  );

  const languageActions: ModelActions = {
    enableModel: (model: ModelWithConfigResponseDto) => {
      createTeamPermittedModel(model.modelId);
    },
    deletePermittedModel: (permittedModelId: string) => {
      deleteTeamPermittedModel(permittedModelId);
    },
    updatePermittedModel: (params) => {
      updateTeamPermittedModel(params);
    },
    isEnabling: isCreating,
    isDisabling: isDeleting,
  };

  // Image generation is a binary enable/disable per team — no anonymous-only
  // mode and no per-team default model.
  const imageActions: ModelActions = {
    enableModel: (model: ModelWithConfigResponseDto) => {
      createTeamPermittedModel(model.modelId);
    },
    deletePermittedModel: (permittedModelId: string) => {
      deleteTeamPermittedModel(permittedModelId);
    },
    isEnabling: isCreating,
    isDisabling: isDeleting,
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('teamDetail.models.overrideTitle')}</CardTitle>
          <CardDescription>
            {t('teamDetail.models.overrideDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch
              id="model-override-toggle"
              checked={effectiveOverrideEnabled}
              disabled={isToggling}
              onCheckedChange={toggleModelOverride}
            />
            <Label htmlFor="model-override-toggle">
              {t('teamDetail.models.overrideLabel')}
            </Label>
          </div>
        </CardContent>
      </Card>

      {effectiveOverrideEnabled ? (
        <>
          {/* Team default model card kept on top for consistency with the
              organization model settings view. */}
          <TeamDefaultModelCard
            teamId={teamId}
            models={languageModelsForCard}
            isLoading={isLoadingTeamModels}
          />
          {hasLanguageError || hasTeamLanguageError ? (
            <ModelLoadError />
          ) : (
            <ModelTypeCard
              type="language"
              models={languageModelsForCard}
              actions={languageActions}
            />
          )}
          {/* Surface a load failure like language models do; only stay hidden
              when the list genuinely has no image-generation models. */}
          {hasImageGenerationError || hasTeamImageError ? (
            <ModelLoadError />
          ) : (
            imageModelsForCard.length > 0 && (
              <ModelTypeCard
                type="image-generation"
                models={imageModelsForCard}
                actions={imageActions}
              />
            )
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-6">
            <p className="text-muted-foreground text-center">
              {t('teamDetail.models.overrideDisabledMessage')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
