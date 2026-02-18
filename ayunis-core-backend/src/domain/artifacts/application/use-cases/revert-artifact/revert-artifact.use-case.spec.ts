jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (target: any, propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { Test, TestingModule } from '@nestjs/testing';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { UUID } from 'crypto';
import { RevertArtifactUseCase } from './revert-artifact.use-case';
import { RevertArtifactCommand } from './revert-artifact.command';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import {
  ArtifactNotFoundError,
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
        RevertArtifactUseCase,
        { provide: ArtifactsRepository, useValue: mockRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<RevertArtifactUseCase>(RevertArtifactUseCase);
    artifactsRepository = module.get(ArtifactsRepository);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
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
    artifactsRepository.addVersion.mockImplementation(
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

  it('should update the current version number after reverting', async () => {
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
    artifactsRepository.addVersion.mockImplementation(
      async (version) => version,
    );

    const command = new RevertArtifactCommand({
      artifactId: mockArtifactId,
      versionNumber: 1,
    });

    await useCase.execute(command);

    expect(artifactsRepository.updateCurrentVersionNumber).toHaveBeenCalledWith(
      mockArtifactId,
      3,
    );
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
});
