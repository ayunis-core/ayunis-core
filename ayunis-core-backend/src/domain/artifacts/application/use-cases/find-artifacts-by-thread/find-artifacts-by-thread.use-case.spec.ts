import { Test, TestingModule } from '@nestjs/testing';
import { UUID } from 'crypto';
import { FindArtifactsByThreadUseCase } from './find-artifacts-by-thread.use-case';
import { FindArtifactsByThreadQuery } from './find-artifacts-by-thread.query';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import { Artifact } from '../../../domain/artifact.entity';

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindArtifactsByThreadUseCase,
        { provide: ArtifactsRepository, useValue: mockRepository },
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

  it('should return all artifacts for a given thread', async () => {
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
    );
  });

  it('should return an empty array when thread has no artifacts', async () => {
    artifactsRepository.findByThreadId.mockResolvedValue([]);

    const query = new FindArtifactsByThreadQuery({ threadId: mockThreadId });
    const result = await useCase.execute(query);

    expect(result).toEqual([]);
  });
});
