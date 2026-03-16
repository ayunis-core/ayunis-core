import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Switch } from '@/shared/ui/shadcn/switch';
import { Label } from '@/shared/ui/shadcn/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { useModelsWithConfig } from '@/features/models';
import { ModelTypeCard } from '@/widgets/model-type-card';
import type { ModelActions } from '@/widgets/model-type-card';
import type {
  ModelWithConfigResponseDto,
  TeamResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { getTeamsControllerGetTeamQueryKey } from '@/shared/api/generated/ayunisCoreAPI';
import { useTeamPermittedModels } from '../api/useTeamPermittedModels';
import { useCreateTeamPermittedModel } from '../api/useCreateTeamPermittedModel';
import { useDeleteTeamPermittedModel } from '../api/useDeleteTeamPermittedModel';
import { useToggleModelOverride } from '../api/useToggleModelOverride';

interface TeamModelsTabProps {
  readonly teamId: string;
  readonly teamName: string;
  readonly modelOverrideEnabled: boolean;
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
  const { models: orgModels } = useModelsWithConfig();
  const { models: teamPermittedModels } = useTeamPermittedModels(teamId);
  const { createTeamPermittedModel, isCreating } =
    useCreateTeamPermittedModel(teamId);
  const { deleteTeamPermittedModel, isDeleting } =
    useDeleteTeamPermittedModel(teamId);

  const permittedModelIds = new Set(teamPermittedModels.map((m) => m.modelId));
  const permittedModelByModelId = new Map(
    teamPermittedModels.map((m) => [m.modelId, m]),
  );

  const orgLanguageModels = orgModels.filter(
    (m) => !m.isEmbedding && m.isPermitted,
  );

  const modelsForCard: ModelWithConfigResponseDto[] = orgLanguageModels.map(
    (model) => {
      const teamModel = permittedModelByModelId.get(model.modelId);
      return {
        ...model,
        isPermitted: permittedModelIds.has(model.modelId),
        permittedModelId: teamModel?.id ?? null,
        anonymousOnly: teamModel?.anonymousOnly ?? null,
      };
    },
  );

  const actions: ModelActions = {
    enableModel: (model: ModelWithConfigResponseDto) => {
      createTeamPermittedModel(model.modelId);
    },
    deletePermittedModel: (permittedModelId: string) => {
      deleteTeamPermittedModel(permittedModelId);
    },
    updatePermittedModel: undefined,
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
        <ModelTypeCard
          type="language"
          models={modelsForCard}
          actions={actions}
        />
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
