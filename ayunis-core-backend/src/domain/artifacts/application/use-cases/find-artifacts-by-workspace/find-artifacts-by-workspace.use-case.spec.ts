import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import type { UUID } from 'crypto';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { ContextService } from 'src/common/context/services/context.service';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { DocumentArtifact } from 'src/domain/artifacts/domain/artifact.entity';
import { ArtifactsRepository } from 'src/domain/artifacts/application/ports/artifacts-repository.port';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import { FindWorkspaceUseCase } from 'src/domain/workspaces/application/use-cases/find-workspace/find-workspace.use-case';
import { FindArtifactsByWorkspaceQuery } from './find-artifacts-by-workspace.query';
import { FindArtifactsByWorkspaceUseCase } from './find-artifacts-by-workspace.use-case';
import { Paginated } from 'src/common/pagination/paginated.entity';

describe('FindArtifactsByWorkspaceUseCase', () => {
  let useCase: FindArtifactsByWorkspaceUseCase;
  let artifactsRepository: jest.Mocked<ArtifactsRepository>;
  let contextService: jest.Mocked<ContextService>;
  let findWorkspaceUseCase: jest.Mocked<FindWorkspaceUseCase>;

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
    const findWorkspace = {
      execute: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<FindWorkspaceUseCase>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindArtifactsByWorkspaceUseCase,
        {
          provide: getLoggerToken(FindArtifactsByWorkspaceUseCase.name),
          useValue: createPinoLoggerMock(),
        },
        { provide: ArtifactsRepository, useValue: repository },
        { provide: ContextService, useValue: context },
        { provide: FindWorkspaceUseCase, useValue: findWorkspace },
      ],
    }).compile();

    useCase = module.get(FindArtifactsByWorkspaceUseCase);
    artifactsRepository = repository;
    contextService = context;
    findWorkspaceUseCase = findWorkspace;
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
    const paginatedArtifacts = new Paginated({
      data: artifacts,
      limit: 20,
      offset: 0,
      total: 1,
    });
    artifactsRepository.findByWorkspaceId.mockResolvedValue(paginatedArtifacts);

    const result = await useCase.execute(
      new FindArtifactsByWorkspaceQuery({ workspaceId }),
    );

    expect(result).toEqual(paginatedArtifacts);
    expect(artifactsRepository.findByWorkspaceId).toHaveBeenCalledWith(
      workspaceId,
      userId,
      {
        search: undefined,
        type: undefined,
        limit: 20,
        offset: 0,
      },
    );
  });

  it('returns an empty list when the workspace has no artifacts', async () => {
    artifactsRepository.findByWorkspaceId.mockResolvedValue(
      new Paginated({ data: [], limit: 20, offset: 0, total: 0 }),
    );

    await expect(
      useCase.execute(new FindArtifactsByWorkspaceQuery({ workspaceId })),
    ).resolves.toEqual(
      new Paginated({ data: [], limit: 20, offset: 0, total: 0 }),
    );
  });

  it('rejects unauthenticated requests', async () => {
    contextService.get.mockReturnValue(undefined);

    await expect(
      useCase.execute(new FindArtifactsByWorkspaceQuery({ workspaceId })),
    ).rejects.toThrow(UnauthorizedAccessError);
    expect(artifactsRepository.findByWorkspaceId).not.toHaveBeenCalled();
  });

  it('rejects requests for workspaces unavailable to the caller', async () => {
    findWorkspaceUseCase.execute.mockRejectedValue(
      new WorkspaceNotFoundError(workspaceId),
    );

    await expect(
      useCase.execute(new FindArtifactsByWorkspaceQuery({ workspaceId })),
    ).rejects.toThrow(WorkspaceNotFoundError);
    expect(artifactsRepository.findByWorkspaceId).not.toHaveBeenCalled();
  });
});
