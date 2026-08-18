import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { ContextService } from 'src/common/context/services/context.service';
import { DocumentArtifact } from 'src/domain/artifacts/domain/artifact.entity';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import { FindArtifactsByWorkspaceQuery } from './find-artifacts-by-workspace.query';
import { FindArtifactsByWorkspaceUseCase } from './find-artifacts-by-workspace.use-case';

describe('FindArtifactsByWorkspaceUseCase', () => {
  let useCase: FindArtifactsByWorkspaceUseCase;
  let artifactsRepository: jest.Mocked<ArtifactsRepository>;
  let contextService: jest.Mocked<ContextService>;

  const userId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const workspaceId = '223e4567-e89b-12d3-a456-426614174000' as UUID;
  const threadId = '323e4567-e89b-12d3-a456-426614174000' as UUID;

  beforeEach(async () => {
    const repository = {
      findByWorkspaceId: jest.fn(),
    } as unknown as jest.Mocked<ArtifactsRepository>;
    const context = {
      get: jest.fn((key: string) => (key === 'userId' ? userId : undefined)),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindArtifactsByWorkspaceUseCase,
        { provide: ArtifactsRepository, useValue: repository },
        { provide: ContextService, useValue: context },
      ],
    }).compile();

    useCase = module.get(FindArtifactsByWorkspaceUseCase);
    artifactsRepository = repository;
    contextService = context;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns artifacts for the workspace scoped to the authenticated user', async () => {
    const artifacts = [
      new DocumentArtifact({
        threadId,
        userId,
        title: 'Project brief',
      }),
    ];
    artifactsRepository.findByWorkspaceId.mockResolvedValue(artifacts);

    const result = await useCase.execute(
      new FindArtifactsByWorkspaceQuery({ workspaceId }),
    );

    expect(result).toEqual(artifacts);
    expect(artifactsRepository.findByWorkspaceId).toHaveBeenCalledWith(
      workspaceId,
      userId,
    );
  });

  it('returns an empty list when the workspace has no artifacts', async () => {
    artifactsRepository.findByWorkspaceId.mockResolvedValue([]);

    await expect(
      useCase.execute(new FindArtifactsByWorkspaceQuery({ workspaceId })),
    ).resolves.toEqual([]);
  });

  it('rejects unauthenticated requests', async () => {
    contextService.get.mockReturnValue(undefined);

    await expect(
      useCase.execute(new FindArtifactsByWorkspaceQuery({ workspaceId })),
    ).rejects.toThrow(UnauthorizedAccessError);
    expect(artifactsRepository.findByWorkspaceId).not.toHaveBeenCalled();
  });
});
