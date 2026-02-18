import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { UUID } from 'crypto';
import { FindArtifactsByThreadUseCase } from './find-artifacts-by-thread.use-case';
import { FindArtifactsByThreadQuery } from './find-artifacts-by-thread.query';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import { Artifact } from '../../../domain/artifact.entity';
import { ContextService } from 'src/common/context/services/context.service';

describe('FindArtifactsByThreadUseCase', () => {
  let useCase: FindArtifactsByThreadUseCase;
  let artifactsRepository: jest.Mocked<ArtifactsRepository>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
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
        FindArtifactsByThreadUseCase,
        { provide: ArtifactsRepository, useValue: mockRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<FindArtifactsByThreadUseCase>(
      FindArtifactsByThreadUseCase,
    );
    artifactsRepository = module.get(ArtifactsRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return all artifacts for a given thread scoped by userId', async () => {
    const artifacts = [
      new Artifact({
        threadId: mockThreadId,
        userId: mockUserId,
        title: 'Budget Report 2026',
        currentVersionNumber: 3,
      }),
      new Artifact({
        threadId: mockThreadId,
        userId: mockUserId,
        title: 'Meeting Minutes - February',
        currentVersionNumber: 1,
      }),
    ];

    artifactsRepository.findByThreadId.mockResolvedValue(artifacts);

    const query = new FindArtifactsByThreadQuery({ threadId: mockThreadId });
    const result = await useCase.execute(query);

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Budget Report 2026');
    expect(result[1].title).toBe('Meeting Minutes - February');
    expect(artifactsRepository.findByThreadId).toHaveBeenCalledWith(
      mockThreadId,
      mockUserId,
    );
  });

  it('should return an empty array when thread has no artifacts', async () => {
    artifactsRepository.findByThreadId.mockResolvedValue([]);

    const query = new FindArtifactsByThreadQuery({ threadId: mockThreadId });
    const result = await useCase.execute(query);

    expect(result).toEqual([]);
  });

  it('should throw UnauthorizedException when user is not authenticated', async () => {
    const mockContextService = {
      get: jest.fn(() => undefined),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindArtifactsByThreadUseCase,
        { provide: ArtifactsRepository, useValue: artifactsRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    const useCaseNoAuth = module.get<FindArtifactsByThreadUseCase>(
      FindArtifactsByThreadUseCase,
    );

    const query = new FindArtifactsByThreadQuery({ threadId: mockThreadId });

    await expect(useCaseNoAuth.execute(query)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
