import type { TestingModule } from '@nestjs/testing';
import { getFromUserContext } from 'src/common/context/testing/context.fixtures';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { ApplyEditsToArtifactUseCase } from './apply-edits-to-artifact.use-case';
import { ApplyEditsToArtifactCommand } from './apply-edits-to-artifact.command';
import { ArtifactsRepository } from 'src/domain/artifacts/application/ports/artifacts-repository.port';
import {
  ArtifactContentTooLargeError,
  ArtifactEditAmbiguousError,
  ArtifactEditNotFoundError,
  ArtifactExpectedVersionMismatchError,
  ArtifactNotFoundError,
  ARTIFACT_MAX_CONTENT_LENGTH,
} from 'src/domain/artifacts/application/artifacts.errors';
import { DocumentArtifact } from 'src/domain/artifacts/domain/artifact.entity';
import { ArtifactVersion } from 'src/domain/artifacts/domain/artifact-version.entity';
import { AuthorType } from 'src/domain/artifacts/domain/value-objects/author-type.enum';
import { ContextService } from 'src/common/context/services/context.service';
import { ArtifactPlaceholdersService } from 'src/domain/artifacts/application/services/artifact-placeholders.service';
import { ArtifactMaskAllocationLock } from 'src/domain/artifacts/application/services/artifact-mask-allocation-lock.service';
import { GetThreadPiiMasksUseCase } from 'src/domain/thread-pii-masks/application/use-cases/get-thread-pii-masks/get-thread-pii-masks.use-case';
import { AllocateThreadPiiMasksUseCase } from 'src/domain/thread-pii-masks/application/use-cases/allocate-thread-pii-masks/allocate-thread-pii-masks.use-case';
import { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';
import { ArtifactPiiMask } from 'src/domain/artifacts/domain/artifact-pii-mask.entity';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import { ArtifactUnknownPlaceholderError } from 'src/domain/artifacts/application/artifacts.errors';

describe('ApplyEditsToArtifactUseCase', () => {
  let useCase: ApplyEditsToArtifactUseCase;
  let artifactsRepository: jest.Mocked<ArtifactsRepository>;
  let getThreadPiiMasksUseCase: { execute: jest.Mock };

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;

  const mockOrgId = '223e4567-e89b-12d3-a456-426614174999' as UUID;
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
      addVersionAndUpdateArtifact: jest.fn(async ({ version }) => version),
      findPiiMasks: jest.fn().mockResolvedValue([]),
      addPiiMasks: jest.fn(),
      delete: jest.fn(),
    };

    const mockContextService = {
      get: jest.fn(
        getFromUserContext({ userId: mockUserId, orgId: mockOrgId }),
      ),
    } as unknown as jest.Mocked<ContextService>;

    getThreadPiiMasksUseCase = { execute: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplyEditsToArtifactUseCase,
        { provide: ArtifactsRepository, useValue: mockRepository },
        { provide: ContextService, useValue: mockContextService },
        ArtifactPlaceholdersService,
        ArtifactMaskAllocationLock,
        {
          provide: GetThreadPiiMasksUseCase,
          useValue: getThreadPiiMasksUseCase,
        },
        { provide: AllocateThreadPiiMasksUseCase, useValue: {} },
      ],
    }).compile();

    useCase = module.get<ApplyEditsToArtifactUseCase>(
      ApplyEditsToArtifactUseCase,
    );
    artifactsRepository = module.get(ArtifactsRepository);
  });

  function storedContent(): string {
    return artifactsRepository.addVersionAndUpdateArtifact.mock.calls[0][0]
      .version.content;
  }

  function givenArtifact(artifact: DocumentArtifact): void {
    artifactsRepository.findByIdWithVersions.mockResolvedValue(artifact);
    artifactsRepository.findById.mockResolvedValue(artifact);
  }

  function createArtifactWithVersions(
    currentContent: string,
    params: { isAnonymous?: boolean; piiMasks?: ArtifactPiiMask[] } = {},
  ): DocumentArtifact {
    const currentVersion = new ArtifactVersion({
      artifactId: mockArtifactId,
      versionNumber: 1,
      content: currentContent,
      authorType: AuthorType.USER,
      authorId: mockUserId,
    });

    return new DocumentArtifact({
      id: mockArtifactId,
      owner: { type: 'personal', userId: mockUserId },
      creatorId: mockUserId,
      title: 'Test Document',
      ...params,
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

      givenArtifact(mockArtifact);

      const command = new ApplyEditsToArtifactCommand({
        artifactId: mockArtifactId,
        edits: [{ oldText: 'world', newText: 'universe' }],
        authorType: AuthorType.ASSISTANT,
      });

      const result = await useCase.execute(command);

      expect(result).toMatchObject({
        artifactId: mockArtifactId,
        versionNumber: 2,
        content: '<p>Hello universe</p>',
        authorType: AuthorType.ASSISTANT,
        authorId: null,
      });
    });

    it('should successfully apply multiple sequential edits', async () => {
      const originalContent = '<p>The quick brown fox</p>';
      const mockArtifact = createArtifactWithVersions(originalContent);

      givenArtifact(mockArtifact);

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

      expect(storedContent()).toBe('<p>The slow red cat</p>');
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

    it('should throw ArtifactExpectedVersionMismatchError when expected version does not match', async () => {
      const advancedArtifact = new DocumentArtifact({
        id: mockArtifactId,
        owner: { type: 'personal', userId: mockUserId },
        creatorId: mockUserId,
        title: 'Test Document',
        currentVersionNumber: 5,
        versions: [
          new ArtifactVersion({
            artifactId: mockArtifactId,
            versionNumber: 5,
            content: '<p>User-edited content</p>',
            authorType: AuthorType.USER,
            authorId: mockUserId,
          }),
        ],
      });

      artifactsRepository.findByIdWithVersions.mockResolvedValue(
        advancedArtifact,
      );

      const command = new ApplyEditsToArtifactCommand({
        artifactId: mockArtifactId,
        edits: [{ oldText: 'Hello', newText: 'Hi' }],
        authorType: AuthorType.ASSISTANT,
        expectedVersionNumber: 1,
      });

      await expect(useCase.execute(command)).rejects.toThrow(
        ArtifactExpectedVersionMismatchError,
      );
    });

    it('should succeed when expected version matches current version', async () => {
      const originalContent = '<p>Hello world</p>';
      const mockArtifact = createArtifactWithVersions(originalContent);

      givenArtifact(mockArtifact);

      const command = new ApplyEditsToArtifactCommand({
        artifactId: mockArtifactId,
        edits: [{ oldText: 'world', newText: 'universe' }],
        authorType: AuthorType.ASSISTANT,
        expectedVersionNumber: 1,
      });

      const result = await useCase.execute(command);
      expect(result.versionNumber).toBe(2);
    });

    it('rejects the edit instead of overwriting a version written while it was prepared', async () => {
      artifactsRepository.findByIdWithVersions.mockResolvedValue(
        createArtifactWithVersions('<p>Hello world</p>'),
      );
      artifactsRepository.findById.mockResolvedValue(
        new DocumentArtifact({
          id: mockArtifactId,
          owner: { type: 'personal', userId: mockUserId },
          creatorId: mockUserId,
          title: 'Test Document',
          currentVersionNumber: 2,
        }),
      );

      await expect(
        useCase.execute(
          new ApplyEditsToArtifactCommand({
            artifactId: mockArtifactId,
            edits: [{ oldText: 'world', newText: 'universe' }],
            authorType: AuthorType.ASSISTANT,
            expectedVersionNumber: 1,
          }),
        ),
      ).rejects.toThrow(ArtifactExpectedVersionMismatchError);
      expect(
        artifactsRepository.addVersionAndUpdateArtifact,
      ).not.toHaveBeenCalled();
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

  describe('anonymous artifacts', () => {
    const run = { threadId: mockThreadId, isAnonymous: true };

    const person = (maskIndex: number, value: string) => ({
      category: PiiCategory.PERSON_NAME,
      maskIndex,
      value,
    });

    beforeEach(() => {
      givenArtifact(
        createArtifactWithVersions(
          '<p>Sehr geehrte {{pii:PERSON_NAME_1}},</p>',
          {
            isAnonymous: true,
          },
        ),
      );
      artifactsRepository.findPiiMasks.mockResolvedValue([
        new ArtifactPiiMask({
          artifactId: mockArtifactId,
          ...person(1, 'Anna Schmidt'),
        }),
      ]);
      getThreadPiiMasksUseCase.execute.mockResolvedValue([
        new ThreadPiiMask({
          threadId: mockThreadId,
          ...person(3, 'Anna Schmidt'),
        }),
        new ThreadPiiMask({
          threadId: mockThreadId,
          ...person(4, 'Bernd Bauer'),
        }),
      ]);
    });

    it('matches old_text and writes new_text of a run in the artifact’s placeholders', async () => {
      await useCase.execute(
        new ApplyEditsToArtifactCommand({
          artifactId: mockArtifactId,
          edits: [
            {
              oldText: '{{pii:PERSON_NAME_3}},',
              newText: '{{pii:PERSON_NAME_3}} und {{pii:PERSON_NAME_4}},',
            },
          ],
          authorType: AuthorType.ASSISTANT,
          run,
        }),
      );

      expect(storedContent()).toBe(
        '<p>Sehr geehrte {{pii:PERSON_NAME_1}} und {{pii:PERSON_NAME_2}},</p>',
      );
      const [[{ piiMasks }]] =
        artifactsRepository.addVersionAndUpdateArtifact.mock.calls;
      expect(piiMasks?.map((mask) => [mask.token, mask.value])).toEqual([
        ['{{pii:PERSON_NAME_2}}', 'Bernd Bauer'],
      ]);
    });

    it('rejects an edit with a placeholder the chat does not know and stores nothing', async () => {
      await expect(
        useCase.execute(
          new ApplyEditsToArtifactCommand({
            artifactId: mockArtifactId,
            edits: [
              { oldText: '{{pii:PERSON_NAME_9}}', newText: 'Frau Schmidt' },
            ],
            authorType: AuthorType.ASSISTANT,
            run,
          }),
        ),
      ).rejects.toThrow(ArtifactUnknownPlaceholderError);
      expect(artifactsRepository.addPiiMasks).not.toHaveBeenCalled();
      expect(
        artifactsRepository.addVersionAndUpdateArtifact,
      ).not.toHaveBeenCalled();
    });

    it('adds no dictionary entries for an edit that does not match', async () => {
      await expect(
        useCase.execute(
          new ApplyEditsToArtifactCommand({
            artifactId: mockArtifactId,
            edits: [
              { oldText: '{{pii:PERSON_NAME_4}}', newText: 'Herr Bauer' },
            ],
            authorType: AuthorType.ASSISTANT,
            run,
          }),
        ),
      ).rejects.toThrow(ArtifactEditNotFoundError);
      expect(artifactsRepository.addPiiMasks).not.toHaveBeenCalled();
      expect(
        artifactsRepository.addVersionAndUpdateArtifact,
      ).not.toHaveBeenCalled();
    });

    it('adds no dictionary entries when a version written meanwhile rejects the edit', async () => {
      artifactsRepository.findById.mockResolvedValue(
        new DocumentArtifact({
          id: mockArtifactId,
          owner: { type: 'personal', userId: mockUserId },
          creatorId: mockUserId,
          title: 'Test Document',
          isAnonymous: true,
          currentVersionNumber: 2,
        }),
      );

      await expect(
        useCase.execute(
          new ApplyEditsToArtifactCommand({
            artifactId: mockArtifactId,
            edits: [
              {
                oldText: '{{pii:PERSON_NAME_3}},',
                newText: '{{pii:PERSON_NAME_3}} und {{pii:PERSON_NAME_4}},',
              },
            ],
            authorType: AuthorType.ASSISTANT,
            expectedVersionNumber: 1,
            run,
          }),
        ),
      ).rejects.toThrow(ArtifactExpectedVersionMismatchError);
      expect(artifactsRepository.addPiiMasks).not.toHaveBeenCalled();
      expect(
        artifactsRepository.addVersionAndUpdateArtifact,
      ).not.toHaveBeenCalled();
    });
  });
});
