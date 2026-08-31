import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@ayunis/ui/components/alert';
import { Switch } from '@ayunis/ui/components/switch';
import { Label } from '@ayunis/ui/components/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { useLanguageModels, useImageGenerationModels } from '@/features/models';
import { ModelTypeCard } from '@/widgets/model-type-card';
import type { ModelActions } from '@/widgets/model-type-card';
import { TriangleAlert } from 'lucide-react';
import type {
  ModelWithConfigResponseDto,
  TeamResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { getTeamsControllerGetTeamQueryKey } from '@/shared/api/generated/ayunisCoreAPI';
import { useTeamPermittedModels } from '@/pages/admin-settings/team-detail/api/useTeamPermittedModels';
import { useTeamPermittedImageGenerationModels } from '@/pages/admin-settings/team-detail/api/useTeamPermittedImageGenerationModels';
import { useCreateTeamPermittedModel } from '@/pages/admin-settings/team-detail/api/useCreateTeamPermittedModel';
import { useDeleteTeamPermittedModel } from '@/pages/admin-settings/team-detail/api/useDeleteTeamPermittedModel';
import { useUpdateTeamPermittedModel } from '@/pages/admin-settings/team-detail/api/useUpdateTeamPermittedModel';
import { useToggleModelOverride } from '@/pages/admin-settings/team-detail/api/useToggleModelOverride';
import { buildTeamModelsForCard } from '@/pages/admin-settings/team-detail/lib/buildTeamModelsForCard';
import { TeamDefaultModelCard } from './TeamDefaultModelCard';

interface TeamModelsTabProps {
  readonly teamId: string;
  readonly teamName: string;
  readonly modelOverrideEnabled: boolean;
}

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

  const languageModelsForCard = buildTeamModelsForCard(
    languageModels,
    teamPermittedModels,
  );
  const imageModelsForCard = buildTeamModelsForCard(
    imageGenerationModels,
    teamPermittedImageModels,
  );
  const hasSelectedImageModel = imageModelsForCard.some(
    (model) => model.isPermitted,
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
              data-testid="team-model-override-toggle"
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
              testIdPrefix="team-model"
            />
          )}
          {hasImageGenerationError || hasTeamImageError ? (
            <ModelLoadError />
          ) : (
            imageModelsForCard.length > 0 && (
              <ModelTypeCard
                type="image-generation"
                models={imageModelsForCard}
                actions={imageActions}
                testIdPrefix="team-model"
                isToggleDisabled={(model) =>
                  hasSelectedImageModel && !model.isPermitted
                }
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
