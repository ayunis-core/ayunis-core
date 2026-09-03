import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  EffectiveImageGenerationModelConflictError,
  ImageGenerationModelProviderNotSupportedError,
  PermittedImageGenerationModelNotFoundForOrgError,
} from 'src/domain/models/application/models.errors';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import { EffectiveModelScopeResolverService } from 'src/domain/models/application/services/effective-model-scope-resolver.service';
import { ModelPolicyService } from 'src/domain/models/application/services/model-policy.service';
import { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import { PermittedImageGenerationModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { GetPermittedImageGenerationModelQuery } from './get-permitted-image-generation-model.query';
import { GetPermittedImageGenerationModelUseCase } from './get-permitted-image-generation-model.use-case';

describe(GetPermittedImageGenerationModelUseCase.name, () => {
  const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
  const userId = '22222222-2222-2222-2222-222222222222' as UUID;
  const teamAId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' as UUID;
  const teamBId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' as UUID;
  let useCase: GetPermittedImageGenerationModelUseCase;
  let repository: jest.Mocked<PermittedModelsRepository>;
  let scopeResolver: jest.Mocked<EffectiveModelScopeResolverService>;
  let contextService: jest.Mocked<ContextService>;

  const permit = (
    catalogModelId: UUID,
    teamId?: UUID,
    provider: ModelProvider = ModelProvider.AZURE,
  ): PermittedImageGenerationModel =>
    new PermittedImageGenerationModel({
      model: new ImageGenerationModel({
        id: catalogModelId,
        name: `image-${catalogModelId}`,
        provider,
        displayName: 'Municipal Image Generator',
        isArchived: false,
      }),
      orgId,
      scope: teamId ? PermittedModelScope.TEAM : PermittedModelScope.ORG,
      scopeId: teamId ?? null,
    });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GetPermittedImageGenerationModelUseCase,
        ModelPolicyService,
        {
          provide: PermittedModelsRepository,
          useValue: {
            findOneImageGeneration: jest.fn(),
            findManyImageGenerationByTeams: jest.fn(),
          },
        },
        {
          provide: EffectiveModelScopeResolverService,
          useValue: { resolve: jest.fn() },
        },
        { provide: ContextService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    useCase = module.get(GetPermittedImageGenerationModelUseCase);
    repository = module.get(PermittedModelsRepository);
    scopeResolver = module.get(EffectiveModelScopeResolverService);
    contextService = module.get(ContextService);
    contextService.get.mockImplementation((key) => {
      if (key === 'orgId') return orgId;
      if (key === 'userId') return userId;
      if (key === 'systemRole') return SystemRole.CUSTOMER;
      return undefined;
    });
  });

  it('rejects another organization for a customer principal', async () => {
    contextService.get.mockImplementation((key) => {
      if (key === 'orgId') return '99999999-9999-9999-9999-999999999999';
      if (key === 'systemRole') return SystemRole.CUSTOMER;
      return undefined;
    });

    await expect(
      useCase.execute(new GetPermittedImageGenerationModelQuery({ orgId })),
    ).rejects.toThrow(UnauthorizedAccessError);
  });

  it('uses the organization image grant without an enabled override', async () => {
    const orgGrant = permit('10000000-0000-0000-0000-000000000001');
    scopeResolver.resolve.mockResolvedValue({ orgId, overrideTeamIds: [] });
    repository.findOneImageGeneration.mockResolvedValue(orgGrant);

    await expect(
      useCase.execute(new GetPermittedImageGenerationModelQuery({ orgId })),
    ).resolves.toBe(orgGrant);
    expect(repository.findManyImageGenerationByTeams).not.toHaveBeenCalled();
  });

  it('reports image access unavailable for an empty enabled override', async () => {
    scopeResolver.resolve.mockResolvedValue({
      orgId,
      overrideTeamIds: [teamAId],
    });
    repository.findManyImageGenerationByTeams.mockResolvedValue([]);

    await expect(
      useCase.execute(new GetPermittedImageGenerationModelQuery({ orgId })),
    ).rejects.toThrow(PermittedImageGenerationModelNotFoundForOrgError);
    expect(repository.findOneImageGeneration).not.toHaveBeenCalled();
  });

  it('deduplicates the same catalog image granted through multiple teams', async () => {
    const catalogModelId = '10000000-0000-0000-0000-000000000001' as UUID;
    const firstGrant = permit(catalogModelId, teamAId);
    scopeResolver.resolve.mockResolvedValue({
      orgId,
      overrideTeamIds: [teamAId, teamBId],
    });
    repository.findManyImageGenerationByTeams.mockResolvedValue([
      firstGrant,
      permit(catalogModelId, teamBId),
    ]);

    await expect(
      useCase.execute(new GetPermittedImageGenerationModelQuery({ orgId })),
    ).resolves.toBe(firstGrant);
    expect(repository.findManyImageGenerationByTeams).toHaveBeenCalledTimes(1);
  });

  it('raises a typed conflict for different team image grants', async () => {
    scopeResolver.resolve.mockResolvedValue({
      orgId,
      overrideTeamIds: [teamAId, teamBId],
    });
    repository.findManyImageGenerationByTeams.mockResolvedValue([
      permit('10000000-0000-0000-0000-000000000001', teamAId),
      permit('10000000-0000-0000-0000-000000000002', teamBId),
    ]);

    await expect(
      useCase.execute(new GetPermittedImageGenerationModelQuery({ orgId })),
    ).rejects.toThrow(EffectiveImageGenerationModelConflictError);
  });

  it('preserves provider policy validation for the effective grant', async () => {
    scopeResolver.resolve.mockResolvedValue({ orgId, overrideTeamIds: [] });
    repository.findOneImageGeneration.mockResolvedValue(
      permit(
        '10000000-0000-0000-0000-000000000001',
        undefined,
        ModelProvider.OPENAI,
      ),
    );

    await expect(
      useCase.execute(new GetPermittedImageGenerationModelQuery({ orgId })),
    ).rejects.toThrow(ImageGenerationModelProviderNotSupportedError);
  });
});
