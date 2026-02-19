import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import type { UUID } from 'crypto';
import { FindArtifactWithVersionsUseCase } from './find-artifact-with-versions.use-case';
import { FindArtifactWithVersionsQuery } from './find-artifact-with-versions.query';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import { ArtifactNotFoundError } from '../../artifacts.errors';
import { Artifact } from '../../../domain/artifact.entity';
import { ArtifactVersion } from '../../../domain/artifact-version.entity';
import { AuthorType } from '../../../domain/value-objects/author-type.enum';
import { ContextService } from 'src/common/context/services/context.service';

describe('FindArtifactWithVersionsUseCase', () => {
  let useCase: FindArtifactWithVersionsUseCase;
  let artifactsRepository: jest.Mocked<ArtifactsRepository>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockArtifactId = '323e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockThreadId = '223e4567-e89b-12d3-a456-426614174000' as UUID;

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByThreadId: jest.fn(),
      findByIdWithVersions: jest.fn(),
      addVersion: jest.fn(),
      updateCurrentVersionNumber: jest.fn(),
      delete: jest.fn(),
    };

    const mockContextService = {
      get: jest.fn((key: string) => {
        if (key === 'userId') return mockUserId;
        return undefined;
      }),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindArtifactWithVersionsUseCase,
        { provide: ArtifactsRepository, useValue: mockRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<FindArtifactWithVersionsUseCase>(
      FindArtifactWithVersionsUseCase,
    );
    artifactsRepository = module.get(ArtifactsRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return the artifact with all its versions', async () => {
    const versions = [
      new ArtifactVersion({
        artifactId: mockArtifactId,
        versionNumber: 1,
        content: '<p>Initial content</p>',
        authorType: AuthorType.ASSISTANT,
      }),
      new ArtifactVersion({
        artifactId: mockArtifactId,
        versionNumber: 2,
        content: '<p>Revised content</p>',
        authorType: AuthorType.USER,
        authorId: mockUserId,
      }),
    ];

    const artifact = new Artifact({
      id: mockArtifactId,
      threadId: mockThreadId,
      userId: mockUserId,
      title: 'Municipal Budget Proposal',
      currentVersionNumber: 2,
      versions,
    });

    artifactsRepository.findByIdWithVersions.mockResolvedValue(artifact);

    const query = new FindArtifactWithVersionsQuery({
      artifactId: mockArtifactId,
    });
    const result = await useCase.execute(query);

    expect(result.id).toBe(mockArtifactId);
    expect(result.title).toBe('Municipal Budget Proposal');
    expect(result.versions).toHaveLength(2);
    expect(result.versions[0].versionNumber).toBe(1);
    expect(result.versions[1].versionNumber).toBe(2);
    expect(artifactsRepository.findByIdWithVersions).toHaveBeenCalledWith(
      mockArtifactId,
      mockUserId,
    );
  });

  it('should throw ArtifactNotFoundError when artifact does not exist', async () => {
    artifactsRepository.findByIdWithVersions.mockResolvedValue(null);

    const query = new FindArtifactWithVersionsQuery({
      artifactId: mockArtifactId,
    });

    await expect(useCase.execute(query)).rejects.toThrow(ArtifactNotFoundError);
  });

  it('should throw UnauthorizedException when user is not authenticated', async () => {
    const mockContextService = {
      get: jest.fn(() => undefined),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindArtifactWithVersionsUseCase,
        { provide: ArtifactsRepository, useValue: artifactsRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    const useCaseNoAuth = module.get<FindArtifactWithVersionsUseCase>(
      FindArtifactWithVersionsUseCase,
    );

    const query = new FindArtifactWithVersionsQuery({
      artifactId: mockArtifactId,
    });

    await expect(useCaseNoAuth.execute(query)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
