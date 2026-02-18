jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (target: any, propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { Test, TestingModule } from '@nestjs/testing';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { UUID } from 'crypto';
import { UpdateArtifactUseCase } from './update-artifact.use-case';
import { UpdateArtifactCommand } from './update-artifact.command';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import { ArtifactNotFoundError } from '../../artifacts.errors';
import { Artifact } from '../../../domain/artifact.entity';
import { AuthorType } from '../../../domain/value-objects/author-type.enum';
import { ContextService } from 'src/common/context/services/context.service';

describe('UpdateArtifactUseCase', () => {
  let useCase: UpdateArtifactUseCase;
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
        UpdateArtifactUseCase,
        { provide: ArtifactsRepository, useValue: mockRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<UpdateArtifactUseCase>(UpdateArtifactUseCase);
    artifactsRepository = module.get(ArtifactsRepository);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should add a new version with incremented version number', async () => {
    const existingArtifact = new Artifact({
      id: mockArtifactId,
      threadId: mockThreadId,
      userId: mockUserId,
      title: 'Budget Report',
      currentVersionNumber: 2,
    });

    artifactsRepository.findById.mockResolvedValue(existingArtifact);
    artifactsRepository.addVersion.mockImplementation(
      async (version) => version,
    );

    const command = new UpdateArtifactCommand({
      artifactId: mockArtifactId,
      content: '<h1>Updated Budget Report</h1><p>Revised figures...</p>',
      authorType: AuthorType.USER,
    });

    const result = await useCase.execute(command);

    expect(result.versionNumber).toBe(3);
    expect(result.content).toBe(
      '<h1>Updated Budget Report</h1><p>Revised figures...</p>',
    );
    expect(result.authorType).toBe(AuthorType.USER);
    expect(result.authorId).toBe(mockUserId);
    expect(artifactsRepository.findById).toHaveBeenCalledWith(
      mockArtifactId,
      mockUserId,
    );
  });

  it('should update the current version number on the artifact', async () => {
    const existingArtifact = new Artifact({
      id: mockArtifactId,
      threadId: mockThreadId,
      userId: mockUserId,
      title: 'Policy Document',
      currentVersionNumber: 1,
    });

    artifactsRepository.findById.mockResolvedValue(existingArtifact);
    artifactsRepository.addVersion.mockImplementation(
      async (version) => version,
    );

    const command = new UpdateArtifactCommand({
      artifactId: mockArtifactId,
      content: '<p>Updated policy</p>',
      authorType: AuthorType.ASSISTANT,
    });

    await useCase.execute(command);

    expect(artifactsRepository.updateCurrentVersionNumber).toHaveBeenCalledWith(
      mockArtifactId,
      2,
    );
  });

  it('should throw ArtifactNotFoundError when artifact does not exist', async () => {
    artifactsRepository.findById.mockResolvedValue(null);

    const command = new UpdateArtifactCommand({
      artifactId: mockArtifactId,
      content: '<p>Content for nonexistent artifact</p>',
      authorType: AuthorType.USER,
    });

    await expect(useCase.execute(command)).rejects.toThrow(
      ArtifactNotFoundError,
    );
  });

  it('should set authorId to null for ASSISTANT-authored versions', async () => {
    const existingArtifact = new Artifact({
      id: mockArtifactId,
      threadId: mockThreadId,
      userId: mockUserId,
      title: 'Auto-Generated Report',
      currentVersionNumber: 1,
    });

    artifactsRepository.findById.mockResolvedValue(existingArtifact);
    artifactsRepository.addVersion.mockImplementation(
      async (version) => version,
    );

    const command = new UpdateArtifactCommand({
      artifactId: mockArtifactId,
      content: '<p>AI-updated content</p>',
      authorType: AuthorType.ASSISTANT,
    });

    const result = await useCase.execute(command);

    expect(result.authorId).toBeNull();
  });

  it('should throw UnauthorizedException when user is not authenticated', async () => {
    const mockContextService = {
      get: jest.fn(() => undefined),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateArtifactUseCase,
        { provide: ArtifactsRepository, useValue: artifactsRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    const useCaseNoAuth = module.get<UpdateArtifactUseCase>(
      UpdateArtifactUseCase,
    );

    const command = new UpdateArtifactCommand({
      artifactId: mockArtifactId,
      content: '<p>Should not be updated</p>',
      authorType: AuthorType.USER,
    });

    await expect(useCaseNoAuth.execute(command)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
