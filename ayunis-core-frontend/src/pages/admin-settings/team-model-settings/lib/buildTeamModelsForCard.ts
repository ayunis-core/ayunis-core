import type { ModelWithConfigResponseDto } from '@ayunis/api-client';

interface TeamModelGrant {
  readonly id: string;
  readonly modelId: string;
  readonly anonymousOnly: boolean;
  readonly memoryAccess?: boolean;
  readonly chatHistoryAccess?: boolean;
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
      memoryAccess: grant?.memoryAccess ?? null,
      chatHistoryAccess: grant?.chatHistoryAccess ?? null,
    };
  });
}
