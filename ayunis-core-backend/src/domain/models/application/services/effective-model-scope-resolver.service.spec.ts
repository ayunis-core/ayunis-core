import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { FindTeamsByUserIdUseCase } from 'src/iam/teams/application/use-cases/find-teams-by-user-id/find-teams-by-user-id.use-case';
import { Team } from 'src/iam/teams/domain/team.entity';
import { EffectiveModelScopeResolverService } from './effective-model-scope-resolver.service';

describe(EffectiveModelScopeResolverService.name, () => {
  const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
  const otherOrgId = '22222222-2222-2222-2222-222222222222' as UUID;
  const userId = '33333333-3333-3333-3333-333333333333' as UUID;
  let service: EffectiveModelScopeResolverService;
  let findTeams: jest.Mocked<FindTeamsByUserIdUseCase>;

  const team = (
    id: UUID,
    teamOrgId: UUID,
    modelOverrideEnabled: boolean,
  ): Team =>
    new Team({
      id,
      name: `Team ${id}`,
      orgId: teamOrgId,
      modelOverrideEnabled,
    });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EffectiveModelScopeResolverService,
        {
          provide: FindTeamsByUserIdUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();
    service = module.get(EffectiveModelScopeResolverService);
    findTeams = module.get(FindTeamsByUserIdUseCase);
  });

  it('selects organization scope when no authenticated user is supplied', async () => {
    await expect(service.resolve(orgId)).resolves.toEqual({
      orgId,
      overrideTeamIds: [],
    });
    expect(findTeams.execute).not.toHaveBeenCalled();
  });

  it('selects organization scope when all memberships have overrides disabled', async () => {
    findTeams.execute.mockResolvedValue([
      team('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', orgId, false),
    ]);

    await expect(service.resolve(orgId, userId)).resolves.toEqual({
      orgId,
      overrideTeamIds: [],
    });
  });

  it('selects every enabled team in the requested organization once', async () => {
    const enabledTeamId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' as UUID;
    const secondEnabledTeamId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' as UUID;
    findTeams.execute.mockResolvedValue([
      team(enabledTeamId, orgId, true),
      team(secondEnabledTeamId, orgId, true),
      team('cccccccc-cccc-cccc-cccc-cccccccccccc', orgId, false),
      team('dddddddd-dddd-dddd-dddd-dddddddddddd', otherOrgId, true),
    ]);

    await expect(service.resolve(orgId, userId)).resolves.toEqual({
      orgId,
      overrideTeamIds: [enabledTeamId, secondEnabledTeamId],
    });
    expect(findTeams.execute).toHaveBeenCalledTimes(1);
  });
});
