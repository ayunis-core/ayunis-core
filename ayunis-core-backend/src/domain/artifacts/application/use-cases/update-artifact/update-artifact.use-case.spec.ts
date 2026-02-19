import { Test, TestingModule } from '@nestjs/testing';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { UUID } from 'crypto';
import { UpdateArtifactUseCase } from './update-artifact.use-case';
import { UpdateArtifactCommand } from './update-artifact.command';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import {
  ArtifactNotFoundError,
  ArtifactVersionConflictError,
} from '../../artifacts.errors';
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
        UpdateArtifactUseCase,
        { provide: ArtifactsRepository, useValue: mockRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<UpdateArtifactUseCase>(UpdateArtifactUseCase);
    artifactsRepository = module.get(ArtifactsRepository);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
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
    artifactsRepository.addVersionAndUpdateCurrent.mockImplementation(
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

  it('should call addVersionAndUpdateCurrent with the new version', async () => {
    const existingArtifact = new Artifact({
      id: mockArtifactId,
      threadId: mockThreadId,
      userId: mockUserId,
      title: 'Policy Document',
      currentVersionNumber: 1,
    });

    artifactsRepository.findById.mockResolvedValue(existingArtifact);
    artifactsRepository.addVersionAndUpdateCurrent.mockImplementation(
      async (version) => version,
    );

    const command = new UpdateArtifactCommand({
      artifactId: mockArtifactId,
      content: '<p>Updated policy</p>',
      authorType: AuthorType.ASSISTANT,
    });

    await useCase.execute(command);

    expect(
      artifactsRepository.addVersionAndUpdateCurrent,
    ).toHaveBeenCalledTimes(1);
    const passedVersion =
      artifactsRepository.addVersionAndUpdateCurrent.mock.calls[0][0];
    expect(passedVersion.artifactId).toBe(mockArtifactId);
    expect(passedVersion.versionNumber).toBe(2);
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
    artifactsRepository.addVersionAndUpdateCurrent.mockImplementation(
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

  it('should sanitize HTML content by stripping script tags', async () => {
    const existingArtifact = new Artifact({
      id: mockArtifactId,
      threadId: mockThreadId,
      userId: mockUserId,
      title: 'XSS Update Test',
      currentVersionNumber: 1,
    });

    artifactsRepository.findById.mockResolvedValue(existingArtifact);
    artifactsRepository.addVersionAndUpdateCurrent.mockImplementation(
      async (version) => version,
    );

    const command = new UpdateArtifactCommand({
      artifactId: mockArtifactId,
      content: '<h1>Updated</h1><script>document.cookie</script><p>Content</p>',
      authorType: AuthorType.USER,
    });

    const result = await useCase.execute(command);

    expect(result.content).toBe('<h1>Updated</h1><p>Content</p>');
    expect(result.content).not.toContain('<script');
  });

  it('should sanitize HTML content by stripping event handlers', async () => {
    const existingArtifact = new Artifact({
      id: mockArtifactId,
      threadId: mockThreadId,
      userId: mockUserId,
      title: 'Event Handler Update Test',
      currentVersionNumber: 1,
    });

    artifactsRepository.findById.mockResolvedValue(existingArtifact);
    artifactsRepository.addVersionAndUpdateCurrent.mockImplementation(
      async (version) => version,
    );

    const command = new UpdateArtifactCommand({
      artifactId: mockArtifactId,
      content: '<p onmouseover="alert(1)">Hover me</p>',
      authorType: AuthorType.ASSISTANT,
    });

    const result = await useCase.execute(command);

    expect(result.content).toBe('<p>Hover me</p>');
    expect(result.content).not.toContain('onmouseover');
  });

  it('should preserve safe Tiptap HTML during update sanitization', async () => {
    const existingArtifact = new Artifact({
      id: mockArtifactId,
      threadId: mockThreadId,
      userId: mockUserId,
      title: 'Safe Update Test',
      currentVersionNumber: 1,
    });

    artifactsRepository.findById.mockResolvedValue(existingArtifact);
    artifactsRepository.addVersionAndUpdateCurrent.mockImplementation(
      async (version) => version,
    );

    const safeContent =
      '<h2>Section</h2><p><a href="https://example.com">Link</a></p><table><tr><td>Cell</td></tr></table>';

    const command = new UpdateArtifactCommand({
      artifactId: mockArtifactId,
      content: safeContent,
      authorType: AuthorType.USER,
    });

    const result = await useCase.execute(command);

    expect(result.content).toBe(safeContent);
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

  describe('retry on version conflict', () => {
    it('should retry and succeed when addVersionAndUpdateCurrent fails once with conflict', async () => {
      const artifactV2 = new Artifact({
        id: mockArtifactId,
        threadId: mockThreadId,
        userId: mockUserId,
        title: 'Concurrent Budget Report',
        currentVersionNumber: 2,
      });

      const artifactV3 = new Artifact({
        id: mockArtifactId,
        threadId: mockThreadId,
        userId: mockUserId,
        title: 'Concurrent Budget Report',
        currentVersionNumber: 3,
      });

      artifactsRepository.findById
        .mockResolvedValueOnce(artifactV2)
        .mockResolvedValueOnce(artifactV3);

      artifactsRepository.addVersionAndUpdateCurrent
        .mockRejectedValueOnce(new ArtifactVersionConflictError(mockArtifactId))
        .mockImplementationOnce(async (version) => version);

      const command = new UpdateArtifactCommand({
        artifactId: mockArtifactId,
        content: '<p>Concurrent update content</p>',
        authorType: AuthorType.USER,
      });

      const result = await useCase.execute(command);

      expect(result.versionNumber).toBe(4);
      expect(artifactsRepository.findById).toHaveBeenCalledTimes(2);
      expect(
        artifactsRepository.addVersionAndUpdateCurrent,
      ).toHaveBeenCalledTimes(2);
    });

    it('should throw ArtifactVersionConflictError after exhausting all retries', async () => {
      const artifact = new Artifact({
        id: mockArtifactId,
        threadId: mockThreadId,
        userId: mockUserId,
        title: 'Heavily Contended Report',
        currentVersionNumber: 5,
      });

      artifactsRepository.findById.mockResolvedValue(artifact);
      artifactsRepository.addVersionAndUpdateCurrent.mockRejectedValue(
        new ArtifactVersionConflictError(mockArtifactId),
      );

      const command = new UpdateArtifactCommand({
        artifactId: mockArtifactId,
        content: '<p>This update will fail</p>',
        authorType: AuthorType.USER,
      });

      await expect(useCase.execute(command)).rejects.toThrow(
        ArtifactVersionConflictError,
      );

      expect(artifactsRepository.findById).toHaveBeenCalledTimes(3);
      expect(
        artifactsRepository.addVersionAndUpdateCurrent,
      ).toHaveBeenCalledTimes(3);
    });

    it('should rethrow non-conflict errors without retrying', async () => {
      const artifact = new Artifact({
        id: mockArtifactId,
        threadId: mockThreadId,
        userId: mockUserId,
        title: 'Connection Error Report',
        currentVersionNumber: 1,
      });

      artifactsRepository.findById.mockResolvedValue(artifact);
      artifactsRepository.addVersionAndUpdateCurrent.mockRejectedValue(
        new Error('Connection refused'),
      );

      const command = new UpdateArtifactCommand({
        artifactId: mockArtifactId,
        content: '<p>Will fail with connection error</p>',
        authorType: AuthorType.USER,
      });

      await expect(useCase.execute(command)).rejects.toThrow(
        'Connection refused',
      );

      expect(artifactsRepository.findById).toHaveBeenCalledTimes(1);
      expect(
        artifactsRepository.addVersionAndUpdateCurrent,
      ).toHaveBeenCalledTimes(1);
    });
  });
});
