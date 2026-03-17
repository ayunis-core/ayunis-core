import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ApplyEditsToArtifactUseCase } from './apply-edits-to-artifact.use-case';
import { ApplyEditsToArtifactCommand } from './apply-edits-to-artifact.command';
import { ArtifactsRepository } from '../../ports/artifacts-repository.port';
import {
  ArtifactContentTooLargeError,
  ArtifactEditAmbiguousError,
  ArtifactEditNotFoundError,
  ArtifactNotFoundError,
  ARTIFACT_MAX_CONTENT_LENGTH,
} from '../../artifacts.errors';
import { Artifact } from '../../../domain/artifact.entity';
import { ArtifactVersion } from '../../../domain/artifact-version.entity';
import { AuthorType } from '../../../domain/value-objects/author-type.enum';
import { ContextService } from 'src/common/context/services/context.service';
import { UpdateArtifactUseCase } from '../update-artifact/update-artifact.use-case';

describe('ApplyEditsToArtifactUseCase', () => {
  let useCase: ApplyEditsToArtifactUseCase;
  let artifactsRepository: jest.Mocked<ArtifactsRepository>;
  let updateArtifactUseCase: jest.Mocked<UpdateArtifactUseCase>;

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
      updateLetterheadId: jest.fn(),
      delete: jest.fn(),
    };

    const mockContextService = {
      get: jest.fn((key: string) => {
        if (key === 'userId') return mockUserId;
        return undefined;
      }),
    } as unknown as jest.Mocked<ContextService>;

    const mockUpdateUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplyEditsToArtifactUseCase,
        { provide: ArtifactsRepository, useValue: mockRepository },
        { provide: ContextService, useValue: mockContextService },
        { provide: UpdateArtifactUseCase, useValue: mockUpdateUseCase },
      ],
    })
      .setLogger(new Logger())
      .compile();

    useCase = module.get<ApplyEditsToArtifactUseCase>(
      ApplyEditsToArtifactUseCase,
    );
    artifactsRepository = module.get(ArtifactsRepository);
    updateArtifactUseCase = module.get(UpdateArtifactUseCase);
  });

  function createArtifactWithVersions(currentContent: string): Artifact {
    const currentVersion = new ArtifactVersion({
      artifactId: mockArtifactId,
      versionNumber: 1,
      content: currentContent,
      authorType: AuthorType.USER,
      authorId: mockUserId,
    });

    return new Artifact({
      id: mockArtifactId,
      threadId: mockThreadId,
      userId: mockUserId,
      title: 'Test Document',
      currentVersionNumber: 1,
      versions: [currentVersion],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  describe('execute', () => {
    it('should successfully apply a single edit', async () => {
      const originalContent = '<p>Hello world</p>';
      const mockArtifact = createArtifactWithVersions(originalContent);

      const mockVersion = new ArtifactVersion({
        artifactId: mockArtifactId,
        versionNumber: 2,
        content: '<p>Hello universe</p>',
        authorType: AuthorType.ASSISTANT,
        authorId: null,
      });

      artifactsRepository.findByIdWithVersions.mockResolvedValue(mockArtifact);
      updateArtifactUseCase.execute.mockResolvedValue(mockVersion);

      const command = new ApplyEditsToArtifactCommand({
        artifactId: mockArtifactId,
        edits: [{ oldText: 'world', newText: 'universe' }],
        authorType: AuthorType.ASSISTANT,
      });

      const result = await useCase.execute(command);

      expect(artifactsRepository.findByIdWithVersions).toHaveBeenCalledWith(
        mockArtifactId,
        mockUserId,
      );
      expect(updateArtifactUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          artifactId: mockArtifactId,
          content: '<p>Hello universe</p>',
          authorType: AuthorType.ASSISTANT,
        }),
      );
      expect(result).toBe(mockVersion);
    });

    it('should successfully apply multiple sequential edits', async () => {
      const originalContent = '<p>The quick brown fox</p>';
      const mockArtifact = createArtifactWithVersions(originalContent);

      const mockVersion = new ArtifactVersion({
        artifactId: mockArtifactId,
        versionNumber: 2,
        content: '<p>The slow red cat</p>',
        authorType: AuthorType.ASSISTANT,
        authorId: null,
      });

      artifactsRepository.findByIdWithVersions.mockResolvedValue(mockArtifact);
      updateArtifactUseCase.execute.mockResolvedValue(mockVersion);

      const command = new ApplyEditsToArtifactCommand({
        artifactId: mockArtifactId,
        edits: [
          { oldText: 'quick', newText: 'slow' },
          { oldText: 'brown', newText: 'red' },
          { oldText: 'fox', newText: 'cat' },
        ],
        authorType: AuthorType.ASSISTANT,
      });

      await useCase.execute(command);

      expect(updateArtifactUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          content: '<p>The slow red cat</p>',
        }),
      );
    });

    it('should throw ArtifactEditNotFoundError when old_text is not found', async () => {
      const originalContent = '<p>Hello world</p>';
      const mockArtifact = createArtifactWithVersions(originalContent);

      artifactsRepository.findByIdWithVersions.mockResolvedValue(mockArtifact);

      const command = new ApplyEditsToArtifactCommand({
        artifactId: mockArtifactId,
        edits: [{ oldText: 'nonexistent', newText: 'replacement' }],
        authorType: AuthorType.ASSISTANT,
      });

      await expect(useCase.execute(command)).rejects.toThrow(
        ArtifactEditNotFoundError,
      );
    });

    it('should throw ArtifactEditAmbiguousError when old_text matches multiple locations', async () => {
      const originalContent = '<p>test test</p>';
      const mockArtifact = createArtifactWithVersions(originalContent);

      artifactsRepository.findByIdWithVersions.mockResolvedValue(mockArtifact);

      const command = new ApplyEditsToArtifactCommand({
        artifactId: mockArtifactId,
        edits: [{ oldText: 'test', newText: 'replacement' }],
        authorType: AuthorType.ASSISTANT,
      });

      await expect(useCase.execute(command)).rejects.toThrow(
        ArtifactEditAmbiguousError,
      );
    });

    it('should throw ArtifactContentTooLargeError when content exceeds maximum length', async () => {
      const originalContent = '<p>short</p>';
      const mockArtifact = createArtifactWithVersions(originalContent);

      artifactsRepository.findByIdWithVersions.mockResolvedValue(mockArtifact);

      // Create a very large replacement string
      const largeText = 'x'.repeat(ARTIFACT_MAX_CONTENT_LENGTH + 1);

      const command = new ApplyEditsToArtifactCommand({
        artifactId: mockArtifactId,
        edits: [{ oldText: 'short', newText: largeText }],
        authorType: AuthorType.ASSISTANT,
      });

      await expect(useCase.execute(command)).rejects.toThrow(
        ArtifactContentTooLargeError,
      );
    });

    it('should throw ArtifactNotFoundError when artifact does not exist', async () => {
      artifactsRepository.findByIdWithVersions.mockResolvedValue(null);

      const command = new ApplyEditsToArtifactCommand({
        artifactId: mockArtifactId,
        edits: [{ oldText: 'test', newText: 'replacement' }],
        authorType: AuthorType.ASSISTANT,
      });

      await expect(useCase.execute(command)).rejects.toThrow(
        ArtifactNotFoundError,
      );
    });
  });
});
