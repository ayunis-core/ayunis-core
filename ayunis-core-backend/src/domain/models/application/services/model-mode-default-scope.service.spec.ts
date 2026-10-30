import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { GetTeamUseCase } from 'src/iam/teams/application/use-cases/get-team/get-team.use-case';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { TeamNotFoundInOrgError } from 'src/domain/models/application/models.errors';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import { GetEffectiveLanguageModelsUseCase } from 'src/domain/models/application/use-cases/get-effective-language-models/get-effective-language-models.use-case';
import { ModelModeDefaultLevel } from 'src/domain/models/domain/value-objects/model-mode-default-level.enum';
import { TeamPermittedModelValidator } from './team-permitted-model-validator.service';
import { ModelModeDefaultScopeService } from './model-mode-default-scope.service';

describe('ModelModeDefaultScopeService', () => {
  const orgId = randomUUID();
  const otherOrgId = randomUUID();
  const userId = randomUUID();
  const teamId = randomUUID();
  const foreignTeamId = randomUUID();

  let service: ModelModeDefaultScopeService;
  let context: Record<string, string>;

  const as = (role: UserRole) => {
    context = { userId, orgId, role, systemRole: SystemRole.CUSTOMER };
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ModelModeDefaultScopeService,
        TeamPermittedModelValidator,
        {
          provide: ContextService,
          useValue: { get: jest.fn((key: string) => context[key]) },
        },
        {
          provide: GetTeamUseCase,
          useValue: {
            execute: jest.fn(({ teamId: id }: { teamId: string }) =>
              Promise.resolve({
                id,
                orgId: id === foreignTeamId ? otherOrgId : orgId,
              }),
            ),
          },
        },
        { provide: PermittedModelsRepository, useValue: {} },
        { provide: GetEffectiveLanguageModelsUseCase, useValue: {} },
      ],
    }).compile();
    service = module.get(ModelModeDefaultScopeService);
  });

  it('targets the calling user for the personal level', async () => {
    as(UserRole.USER);
    const scope = await service.resolve(ModelModeDefaultLevel.USER);
    expect(scope.target).toEqual({ userId });
  });

  it('denies a non-admin the organization level', async () => {
    as(UserRole.USER);
    await expect(service.resolve(ModelModeDefaultLevel.ORG)).rejects.toThrow(
      UnauthorizedAccessError,
    );
  });

  it('gives an org admin the organization level of their own org', async () => {
    as(UserRole.ADMIN);
    const scope = await service.resolve(ModelModeDefaultLevel.ORG);
    expect(scope.target).toEqual({ orgId });
  });

  it('denies a non-admin the team level', async () => {
    as(UserRole.USER);
    await expect(
      service.resolve(ModelModeDefaultLevel.TEAM, teamId),
    ).rejects.toThrow(UnauthorizedAccessError);
  });

  it("rejects an admin targeting another organization's team", async () => {
    as(UserRole.ADMIN);
    await expect(
      service.resolve(ModelModeDefaultLevel.TEAM, foreignTeamId),
    ).rejects.toThrow(TeamNotFoundInOrgError);
  });

  it('gives an org admin a team of their org', async () => {
    as(UserRole.ADMIN);
    const scope = await service.resolve(ModelModeDefaultLevel.TEAM, teamId);
    expect(scope.target).toEqual({ teamId });
  });
});
