import type { ModelWithConfigResponseDto } from '@/shared/api';

interface TeamModelGrant {
  readonly id: string;
  readonly modelId: string;
  readonly anonymousOnly: boolean;
  readonly isDefault?: boolean;
}

export function buildTeamModelsForCard(
  candidates: ModelWithConfigResponseDto[],
  teamGrants: TeamModelGrant[],
): ModelWithConfigResponseDto[] {
  const grantsByModelId = new Map(
    teamGrants.map((grant) => [grant.modelId, grant]),
  );

  return candidates.map((candidate) => {
    const grant = grantsByModelId.get(candidate.modelId);
    return {
      ...candidate,
      isPermitted: grant !== undefined,
      isDefault: grant?.isDefault ?? false,
      permittedModelId: grant?.id ?? null,
      anonymousOnly: grant?.anonymousOnly ?? null,
    };
  });
}
