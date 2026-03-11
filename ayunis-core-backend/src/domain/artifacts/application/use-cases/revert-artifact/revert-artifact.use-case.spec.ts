import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger, UnauthorizedException } from '@nestjs/common';
import type { UUID } from 'crypto';
import { RevertArtifactUseCase } from './revert-artifact.use-case';
import { RevertArtifactCommand } from './revert-artifact.command';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import {
  ArtifactNotFoundError,
  ArtifactVersionConflictError,
  ArtifactVersionNotFoundError,
} from '../../artifacts.errors';
import { Artifact } from '../../../domain/artifact.entity';
import { ArtifactVersion } from '../../../domain/artifact-version.entity';
import { AuthorType } from '../../../domain/value-objects/author-type.enum';
import { ContextService } from 'src/common/context/services/context.service';

describe('RevertArtifactUseCase', () => {
  let useCase: RevertArtifactUseCase;
  let artifactsRepository: jest.Mocked<ArtifactsRepository>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockArtifactId = '323e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockThreadId = '223e4567-e89b-12d3-a456-426614174000' as UUID;

  const makeVersions = (currentVersionNumber: number) => [
    new ArtifactVersion({
      artifactId: mockArtifactId,
      versionNumber: 1,
      content: '<p>Original municipal plan</p>',
      authorType: AuthorType.ASSISTANT,
    }),
    ...Array.from(
      { length: currentVersionNumber - 1 },
      (_, i) =>
        new ArtifactVersion({
          artifactId: mockArtifactId,
          versionNumber: i + 2,
          content: `<p>Version ${i + 2}</p>`,
          authorType: AuthorType.USER,
          authorId: mockUserId,
        }),
    ),
  ];

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByThreadId: jest.fn(),
      findByIdWithVersions: jest.fn(),
      addVersion: jest.fn(),
      updateCurrentVersionNumber: jest.fn(),
      addVersionAndUpdateCurrent: jest.fn(),
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
        RevertArtifactUseCase,
        { provide: ArtifactsRepository, useValue: mockRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<RevertArtifactUseCase>(RevertArtifactUseCase);
    artifactsRepository = module.get(ArtifactsRepository);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new version with the content from the target version', async () => {
    const versions = [
      new ArtifactVersion({
        artifactId: mockArtifactId,
        versionNumber: 1,
        content: '<p>Original municipal plan</p>',
        authorType: AuthorType.ASSISTANT,
      }),
      new ArtifactVersion({
        artifactId: mockArtifactId,
        versionNumber: 2,
        content: '<p>Revised plan with errors</p>',
        authorType: AuthorType.USER,
        authorId: mockUserId,
      }),
    ];

    const artifact = new Artifact({
      id: mockArtifactId,
      threadId: mockThreadId,
      userId: mockUserId,
      title: 'Municipal Development Plan',
      currentVersionNumber: 2,
      versions,
    });

    artifactsRepository.findByIdWithVersions.mockResolvedValue(artifact);
    artifactsRepository.addVersionAndUpdateCurrent.mockImplementation(
      async (version) => version,
    );

    const command = new RevertArtifactCommand({
      artifactId: mockArtifactId,
      versionNumber: 1,
    });

    const result = await useCase.execute(command);

    expect(result.versionNumber).toBe(3);
    expect(result.content).toBe('<p>Original municipal plan</p>');
    expect(result.authorType).toBe(AuthorType.USER);
    expect(result.authorId).toBe(mockUserId);
    expect(artifactsRepository.findByIdWithVersions).toHaveBeenCalledWith(
      mockArtifactId,
      mockUserId,
    );
  });

  it('should call addVersionAndUpdateCurrent with the reverted version', async () => {
    const versions = [
      new ArtifactVersion({
        artifactId: mockArtifactId,
        versionNumber: 1,
        content: '<p>Content v1</p>',
        authorType: AuthorType.ASSISTANT,
      }),
      new ArtifactVersion({
        artifactId: mockArtifactId,
        versionNumber: 2,
        content: '<p>Content v2</p>',
        authorType: AuthorType.USER,
        authorId: mockUserId,
      }),
    ];

    const artifact = new Artifact({
      id: mockArtifactId,
      threadId: mockThreadId,
      userId: mockUserId,
      title: 'Zoning Regulations',
      currentVersionNumber: 2,
      versions,
    });

    artifactsRepository.findByIdWithVersions.mockResolvedValue(artifact);
    artifactsRepository.addVersionAndUpdateCurrent.mockImplementation(
      async (version) => version,
    );

    const command = new RevertArtifactCommand({
      artifactId: mockArtifactId,
      versionNumber: 1,
    });

    await useCase.execute(command);

    expect(
      artifactsRepository.addVersionAndUpdateCurrent,
    ).toHaveBeenCalledTimes(1);
    const passedVersion =
      artifactsRepository.addVersionAndUpdateCurrent.mock.calls[0][0];
    expect(passedVersion.artifactId).toBe(mockArtifactId);
    expect(passedVersion.versionNumber).toBe(3);
  });

  it('should throw ArtifactNotFoundError when artifact does not exist', async () => {
    artifactsRepository.findByIdWithVersions.mockResolvedValue(null);

    const command = new RevertArtifactCommand({
      artifactId: mockArtifactId,
      versionNumber: 1,
    });

    await expect(useCase.execute(command)).rejects.toThrow(
      ArtifactNotFoundError,
    );
  });

  it('should throw ArtifactVersionNotFoundError when target version does not exist', async () => {
    const artifact = new Artifact({
      id: mockArtifactId,
      threadId: mockThreadId,
      userId: mockUserId,
      title: 'Infrastructure Report',
      currentVersionNumber: 1,
      versions: [
        new ArtifactVersion({
          artifactId: mockArtifactId,
          versionNumber: 1,
          content: '<p>Only version</p>',
          authorType: AuthorType.ASSISTANT,
        }),
      ],
    });

    artifactsRepository.findByIdWithVersions.mockResolvedValue(artifact);

    const command = new RevertArtifactCommand({
      artifactId: mockArtifactId,
      versionNumber: 5,
    });

    await expect(useCase.execute(command)).rejects.toThrow(
      ArtifactVersionNotFoundError,
    );
  });

  it('should sanitize content when reverting to a previous version', async () => {
    const unsafeContent =
      '<p>Safe content</p><script>alert("xss")</script><img src=x onerror="alert(1)">';
    const versions = [
      new ArtifactVersion({
        artifactId: mockArtifactId,
        versionNumber: 1,
        content: unsafeContent,
        authorType: AuthorType.ASSISTANT,
      }),
      new ArtifactVersion({
        artifactId: mockArtifactId,
        versionNumber: 2,
        content: '<p>Current version</p>',
        authorType: AuthorType.USER,
        authorId: mockUserId,
      }),
    ];

    const artifact = new Artifact({
      id: mockArtifactId,
      threadId: mockThreadId,
      userId: mockUserId,
      title: 'Test Artifact',
      currentVersionNumber: 2,
      versions,
    });

    artifactsRepository.findByIdWithVersions.mockResolvedValue(artifact);
    artifactsRepository.addVersionAndUpdateCurrent.mockImplementation(
      async (version) => version,
    );

    const command = new RevertArtifactCommand({
      artifactId: mockArtifactId,
      versionNumber: 1,
    });

    const result = await useCase.execute(command);

    expect(result.content).not.toContain('<script>');
    expect(result.content).not.toContain('onerror');
    expect(result.content).toContain('<p>Safe content</p>');
  });

  it('should throw UnauthorizedException when user is not authenticated', async () => {
    const mockContextService = {
      get: jest.fn(() => undefined),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RevertArtifactUseCase,
        { provide: ArtifactsRepository, useValue: artifactsRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    const useCaseNoAuth = module.get<RevertArtifactUseCase>(
      RevertArtifactUseCase,
    );

    const command = new RevertArtifactCommand({
      artifactId: mockArtifactId,
      versionNumber: 1,
    });

    await expect(useCaseNoAuth.execute(command)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  describe('retry on version conflict', () => {
    it('should retry and succeed when addVersionAndUpdateCurrent fails once with conflict', async () => {
      const artifactV2 = new Artifact({
        id: mockArtifactId,
        threadId: mockThreadId,
        userId: mockUserId,
        title: 'Concurrent Revert Report',
        currentVersionNumber: 2,
        versions: makeVersions(2),
      });

      const artifactV3 = new Artifact({
        id: mockArtifactId,
        threadId: mockThreadId,
        userId: mockUserId,
        title: 'Concurrent Revert Report',
        currentVersionNumber: 3,
        versions: [
          ...makeVersions(2),
          new ArtifactVersion({
            artifactId: mockArtifactId,
            versionNumber: 3,
            content: '<p>Version 3</p>',
            authorType: AuthorType.USER,
            authorId: mockUserId,
          }),
        ],
      });

      artifactsRepository.findByIdWithVersions
        .mockResolvedValueOnce(artifactV2)
        .mockResolvedValueOnce(artifactV3);

      artifactsRepository.addVersionAndUpdateCurrent
        .mockRejectedValueOnce(new ArtifactVersionConflictError(mockArtifactId))
        .mockImplementationOnce(async (version) => version);

      const command = new RevertArtifactCommand({
        artifactId: mockArtifactId,
        versionNumber: 1,
      });

      const result = await useCase.execute(command);

      expect(result.versionNumber).toBe(4);
      expect(result.content).toBe('<p>Original municipal plan</p>');
      expect(artifactsRepository.findByIdWithVersions).toHaveBeenCalledTimes(2);
      expect(
        artifactsRepository.addVersionAndUpdateCurrent,
      ).toHaveBeenCalledTimes(2);
    });

    it('should throw ArtifactVersionConflictError after exhausting all retries', async () => {
      const artifact = new Artifact({
        id: mockArtifactId,
        threadId: mockThreadId,
        userId: mockUserId,
        title: 'Heavily Contended Revert',
        currentVersionNumber: 5,
        versions: makeVersions(5),
      });

      artifactsRepository.findByIdWithVersions.mockResolvedValue(artifact);
      artifactsRepository.addVersionAndUpdateCurrent.mockRejectedValue(
        new ArtifactVersionConflictError(mockArtifactId),
      );

      const command = new RevertArtifactCommand({
        artifactId: mockArtifactId,
        versionNumber: 1,
      });

      await expect(useCase.execute(command)).rejects.toThrow(
        ArtifactVersionConflictError,
      );

      expect(artifactsRepository.findByIdWithVersions).toHaveBeenCalledTimes(3);
      expect(
        artifactsRepository.addVersionAndUpdateCurrent,
      ).toHaveBeenCalledTimes(3);
    });

    it('should rethrow non-conflict errors without retrying', async () => {
      const artifact = new Artifact({
        id: mockArtifactId,
        threadId: mockThreadId,
        userId: mockUserId,
        title: 'Connection Error Revert',
        currentVersionNumber: 2,
        versions: makeVersions(2),
      });

      artifactsRepository.findByIdWithVersions.mockResolvedValue(artifact);
      artifactsRepository.addVersionAndUpdateCurrent.mockRejectedValue(
        new Error('Connection refused'),
      );

      const command = new RevertArtifactCommand({
        artifactId: mockArtifactId,
        versionNumber: 1,
      });

      await expect(useCase.execute(command)).rejects.toThrow(
        'Connection refused',
      );

      expect(artifactsRepository.findByIdWithVersions).toHaveBeenCalledTimes(1);
      expect(
        artifactsRepository.addVersionAndUpdateCurrent,
      ).toHaveBeenCalledTimes(1);
    });
  });
});
