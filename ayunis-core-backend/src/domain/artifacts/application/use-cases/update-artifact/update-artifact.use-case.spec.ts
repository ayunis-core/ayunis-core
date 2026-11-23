import type { TestingModule } from '@nestjs/testing';
import { getFromUserContext } from 'src/common/context/testing/context.fixtures';
import { Test } from '@nestjs/testing';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { UUID } from 'crypto';
import { UpdateArtifactUseCase } from './update-artifact.use-case';
import { UpdateArtifactCommand } from './update-artifact.command';
import { ArtifactsRepository } from 'src/domain/artifacts/application/ports/artifacts-repository.port';
import {
  ArtifactContentTooLargeError,
  ArtifactExpectedVersionMismatchError,
  ArtifactNotFoundError,
  ArtifactVersionConflictError,
  InvalidSpreadsheetContentError,
  UnexpectedArtifactError,
  ARTIFACT_MAX_CONTENT_LENGTH,
} from 'src/domain/artifacts/application/artifacts.errors';
import {
  DocumentArtifact,
  SpreadsheetArtifact,
} from 'src/domain/artifacts/domain/artifact.entity';
import { SPREADSHEET_CONTENT_FORMAT } from 'src/domain/artifacts/application/helpers/spreadsheet-content-format';
import { ArtifactVersion } from 'src/domain/artifacts/domain/artifact-version.entity';
import { AuthorType } from 'src/domain/artifacts/domain/value-objects/author-type.enum';
import { ContextService } from 'src/common/context/services/context.service';
import { FindLetterheadUseCase } from 'src/domain/letterheads/application/use-cases/find-letterhead/find-letterhead.use-case';
import { LetterheadNotFoundError } from 'src/domain/letterheads/application/letterheads.errors';
import { UserContentMaskingService } from 'src/domain/artifacts/application/services/user-content-masking.service';
import { AnonymizeTextForThreadUseCase } from 'src/domain/thread-pii-masks/application/use-cases/anonymize-text-for-thread/anonymize-text-for-thread.use-case';
import type { AnonymizeTextForThreadCommand } from 'src/domain/thread-pii-masks/application/use-cases/anonymize-text-for-thread/anonymize-text-for-thread.command';
import { FindThreadsByIdsUseCase } from 'src/domain/threads/application/use-cases/find-threads-by-ids/find-threads-by-ids.use-case';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { ProviderServerError } from 'src/common/errors/provider.errors';

describe('UpdateArtifactUseCase', () => {
  let useCase: UpdateArtifactUseCase;
  let artifactsRepository: jest.Mocked<ArtifactsRepository>;
  let findLetterheadUseCase: jest.Mocked<FindLetterheadUseCase>;
  let findThreadsByIdsUseCase: { execute: jest.Mock };
  let anonymizeTextForThreadUseCase: { execute: jest.Mock };

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
      findVersion: jest.fn().mockResolvedValue(null),
      addVersion: jest.fn(),
      updateCurrentVersionNumber: jest.fn(),
      addVersionAndUpdateArtifact: jest.fn(),
      updateLetterheadId: jest.fn(),
      delete: jest.fn(),
    };

    const mockContextService = {
      get: jest.fn(
        getFromUserContext({ userId: mockUserId, orgId: mockOrgId }),
      ),
    } as unknown as jest.Mocked<ContextService>;

    const mockFindLetterheadUseCase = {
      execute: jest.fn().mockResolvedValue({}),
    };

    findThreadsByIdsUseCase = {
      execute: jest
        .fn()
        .mockResolvedValue([
          new Thread({ id: mockThreadId, userId: mockUserId, messages: [] }),
        ]),
    };
    anonymizeTextForThreadUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateArtifactUseCase,
        { provide: ArtifactsRepository, useValue: mockRepository },
        { provide: ContextService, useValue: mockContextService },
        {
          provide: FindLetterheadUseCase,
          useValue: mockFindLetterheadUseCase,
        },
        { provide: FindThreadsByIdsUseCase, useValue: findThreadsByIdsUseCase },
        UserContentMaskingService,
        {
          provide: AnonymizeTextForThreadUseCase,
          useValue: anonymizeTextForThreadUseCase,
        },
      ],
    }).compile();

    useCase = module.get<UpdateArtifactUseCase>(UpdateArtifactUseCase);
    artifactsRepository = module.get(ArtifactsRepository);
    findLetterheadUseCase = module.get(FindLetterheadUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should add a new version with incremented version number', async () => {
    const existingArtifact = new DocumentArtifact({
      id: mockArtifactId,
      threadId: mockThreadId,
      userId: mockUserId,
      title: 'Budget Report',
      currentVersionNumber: 2,
    });

    artifactsRepository.findById.mockResolvedValue(existingArtifact);
    artifactsRepository.addVersionAndUpdateArtifact.mockImplementation(
      async ({ version }) => version,
    );

    const command = new UpdateArtifactCommand({
      artifactId: mockArtifactId,
      content: '<h1>Updated Budget Report</h1><p>Revised figures...</p>',
      authorType: AuthorType.USER,
    });

    const result = (await useCase.execute(command)) as ArtifactVersion;
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

  it('should call addVersionAndUpdateArtifact with the new version', async () => {
    const existingArtifact = new DocumentArtifact({
      id: mockArtifactId,
      threadId: mockThreadId,
      userId: mockUserId,
      title: 'Policy Document',
      currentVersionNumber: 1,
    });

    artifactsRepository.findById.mockResolvedValue(existingArtifact);
    artifactsRepository.addVersionAndUpdateArtifact.mockImplementation(
      async ({ version }) => version,
    );

    const command = new UpdateArtifactCommand({
      artifactId: mockArtifactId,
      content: '<p>Updated policy</p>',
      authorType: AuthorType.ASSISTANT,
    });

    await useCase.execute(command);

    expect(
      artifactsRepository.addVersionAndUpdateArtifact,
    ).toHaveBeenCalledTimes(1);
    const passedParams =
      artifactsRepository.addVersionAndUpdateArtifact.mock.calls[0][0];
    expect(passedParams.version.artifactId).toBe(mockArtifactId);
    expect(passedParams.version.versionNumber).toBe(2);
    expect(passedParams.expectedCurrentVersionNumber).toBe(1);
    expect(passedParams.letterheadId).toBeUndefined();
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
    const existingArtifact = new DocumentArtifact({
      id: mockArtifactId,
      threadId: mockThreadId,
      userId: mockUserId,
      title: 'Auto-Generated Report',
      currentVersionNumber: 1,
    });

    artifactsRepository.findById.mockResolvedValue(existingArtifact);
    artifactsRepository.addVersionAndUpdateArtifact.mockImplementation(
      async ({ version }) => version,
    );

    const command = new UpdateArtifactCommand({
      artifactId: mockArtifactId,
      content: '<p>AI-updated content</p>',
      authorType: AuthorType.ASSISTANT,
    });

    const result = (await useCase.execute(command)) as ArtifactVersion;
    expect(result.authorId).toBeNull();
  });

  it('should sanitize HTML content by stripping script tags', async () => {
    const existingArtifact = new DocumentArtifact({
      id: mockArtifactId,
      threadId: mockThreadId,
      userId: mockUserId,
      title: 'XSS Update Test',
      currentVersionNumber: 1,
    });

    artifactsRepository.findById.mockResolvedValue(existingArtifact);
    artifactsRepository.addVersionAndUpdateArtifact.mockImplementation(
      async ({ version }) => version,
    );

    const command = new UpdateArtifactCommand({
      artifactId: mockArtifactId,
      content: '<h1>Updated</h1><script>document.cookie</script><p>Content</p>',
      authorType: AuthorType.USER,
    });

    const result = (await useCase.execute(command)) as ArtifactVersion;
    expect(result.content).toBe('<h1>Updated</h1><p>Content</p>');
    expect(result.content).not.toContain('<script');
  });

  it('should sanitize HTML content by stripping event handlers', async () => {
    const existingArtifact = new DocumentArtifact({
      id: mockArtifactId,
      threadId: mockThreadId,
      userId: mockUserId,
      title: 'Event Handler Update Test',
      currentVersionNumber: 1,
    });

    artifactsRepository.findById.mockResolvedValue(existingArtifact);
    artifactsRepository.addVersionAndUpdateArtifact.mockImplementation(
      async ({ version }) => version,
    );

    const command = new UpdateArtifactCommand({
      artifactId: mockArtifactId,
      content: '<p onmouseover="alert(1)">Hover me</p>',
      authorType: AuthorType.ASSISTANT,
    });

    const result = (await useCase.execute(command)) as ArtifactVersion;
    expect(result.content).toBe('<p>Hover me</p>');
    expect(result.content).not.toContain('onmouseover');
  });

  it('should preserve safe Tiptap HTML during update sanitization', async () => {
    const existingArtifact = new DocumentArtifact({
      id: mockArtifactId,
      threadId: mockThreadId,
      userId: mockUserId,
      title: 'Safe Update Test',
      currentVersionNumber: 1,
    });

    artifactsRepository.findById.mockResolvedValue(existingArtifact);
    artifactsRepository.addVersionAndUpdateArtifact.mockImplementation(
      async ({ version }) => version,
    );

    const safeContent =
      '<h2>Section</h2><p><a href="https://example.com">Link</a></p><table><tr><td>Cell</td></tr></table>';

    const command = new UpdateArtifactCommand({
      artifactId: mockArtifactId,
      content: safeContent,
      authorType: AuthorType.USER,
    });

    const result = (await useCase.execute(command)) as ArtifactVersion;
    expect(result.content).toBe(safeContent);
  });

  it('should reject content exceeding the maximum allowed length', async () => {
    const oversizedContent =
      '<p>' + 'A'.repeat(ARTIFACT_MAX_CONTENT_LENGTH) + '</p>';
    artifactsRepository.findById.mockResolvedValue(
      new DocumentArtifact({
        id: mockArtifactId,
        threadId: mockThreadId,
        userId: mockUserId,
        title: 'Oversized Document',
        currentVersionNumber: 1,
      }),
    );

    const command = new UpdateArtifactCommand({
      artifactId: mockArtifactId,
      content: oversizedContent,
      authorType: AuthorType.USER,
    });

    await expect(useCase.execute(command)).rejects.toThrow(
      ArtifactContentTooLargeError,
    );
    expect(
      artifactsRepository.addVersionAndUpdateArtifact,
    ).not.toHaveBeenCalled();
  });

  it('should accept content at exactly the maximum allowed length', async () => {
    const maxContent = 'A'.repeat(ARTIFACT_MAX_CONTENT_LENGTH);

    const existingArtifact = new DocumentArtifact({
      id: mockArtifactId,
      threadId: mockThreadId,
      userId: mockUserId,
      title: 'Maximum Size Update',
      currentVersionNumber: 1,
    });

    artifactsRepository.findById.mockResolvedValue(existingArtifact);
    artifactsRepository.addVersionAndUpdateArtifact.mockImplementation(
      async ({ version }) => version,
    );

    const command = new UpdateArtifactCommand({
      artifactId: mockArtifactId,
      content: maxContent,
      authorType: AuthorType.USER,
    });

    const result = (await useCase.execute(command)) as ArtifactVersion;
    expect(result.versionNumber).toBe(2);
  });

  it('should pass letterheadId to the atomic artifact update when provided in command', async () => {
    const mockLetterheadId = '423e4567-e89b-12d3-a456-426614174000' as UUID;

    const existingArtifact = new DocumentArtifact({
      id: mockArtifactId,
      threadId: mockThreadId,
      userId: mockUserId,
      title: 'Official Letter',
      currentVersionNumber: 1,
    });

    artifactsRepository.findById.mockResolvedValue(existingArtifact);
    artifactsRepository.addVersionAndUpdateArtifact.mockImplementation(
      async ({ version }) => version,
    );

    const command = new UpdateArtifactCommand({
      artifactId: mockArtifactId,
      content: '<p>Updated content</p>',
      authorType: AuthorType.USER,
      letterheadId: mockLetterheadId,
    });

    await useCase.execute(command);

    expect(
      artifactsRepository.addVersionAndUpdateArtifact,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedCurrentVersionNumber: 1,
        letterheadId: mockLetterheadId,
        version: expect.objectContaining({
          artifactId: mockArtifactId,
          versionNumber: 2,
        }),
      }),
    );
  });

  it('should leave letterheadId unchanged when not provided in command', async () => {
    const existingArtifact = new DocumentArtifact({
      id: mockArtifactId,
      threadId: mockThreadId,
      userId: mockUserId,
      title: 'Regular Document',
      currentVersionNumber: 1,
    });

    artifactsRepository.findById.mockResolvedValue(existingArtifact);
    artifactsRepository.addVersionAndUpdateArtifact.mockImplementation(
      async ({ version }) => version,
    );

    const command = new UpdateArtifactCommand({
      artifactId: mockArtifactId,
      content: '<p>Updated content</p>',
      authorType: AuthorType.USER,
    });

    await useCase.execute(command);

    expect(
      artifactsRepository.addVersionAndUpdateArtifact,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedCurrentVersionNumber: 1,
        letterheadId: undefined,
      }),
    );
  });

  it('should pass letterheadId as null to remove letterhead atomically', async () => {
    const existingArtifact = new DocumentArtifact({
      id: mockArtifactId,
      threadId: mockThreadId,
      userId: mockUserId,
      title: 'Letter with letterhead',
      letterheadId: '423e4567-e89b-12d3-a456-426614174000',
      currentVersionNumber: 1,
    });

    artifactsRepository.findById.mockResolvedValue(existingArtifact);
    artifactsRepository.addVersionAndUpdateArtifact.mockImplementation(
      async ({ version }) => version,
    );

    const command = new UpdateArtifactCommand({
      artifactId: mockArtifactId,
      content: '<p>Content without letterhead</p>',
      authorType: AuthorType.USER,
      letterheadId: null,
    });

    await useCase.execute(command);

    expect(
      artifactsRepository.addVersionAndUpdateArtifact,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedCurrentVersionNumber: 1,
        letterheadId: null,
      }),
    );
  });

  it('should throw UnauthorizedAccessError when user is not authenticated', async () => {
    const mockContextService = {
      get: jest.fn(() => undefined),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateArtifactUseCase,
        { provide: ArtifactsRepository, useValue: artifactsRepository },
        { provide: ContextService, useValue: mockContextService },
        {
          provide: FindLetterheadUseCase,
          useValue: findLetterheadUseCase,
        },
        { provide: FindThreadsByIdsUseCase, useValue: findThreadsByIdsUseCase },
        { provide: UserContentMaskingService, useValue: {} },
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
      UnauthorizedAccessError,
    );
  });

  describe('expected version check', () => {
    it('should throw ArtifactExpectedVersionMismatchError when expected version does not match', async () => {
      const existingArtifact = new DocumentArtifact({
        id: mockArtifactId,
        threadId: mockThreadId,
        userId: mockUserId,
        title: 'User-Edited Report',
        currentVersionNumber: 5,
      });

      artifactsRepository.findById.mockResolvedValue(existingArtifact);

      const command = new UpdateArtifactCommand({
        artifactId: mockArtifactId,
        content: '<p>Stale content</p>',
        authorType: AuthorType.ASSISTANT,
        expectedVersionNumber: 3,
      });

      await expect(useCase.execute(command)).rejects.toThrow(
        ArtifactExpectedVersionMismatchError,
      );
    });

    it('should succeed when expected version matches current version', async () => {
      const existingArtifact = new DocumentArtifact({
        id: mockArtifactId,
        threadId: mockThreadId,
        userId: mockUserId,
        title: 'Current Report',
        currentVersionNumber: 3,
      });

      artifactsRepository.findById.mockResolvedValue(existingArtifact);
      artifactsRepository.addVersionAndUpdateArtifact.mockImplementation(
        async ({ version }) => version,
      );

      const command = new UpdateArtifactCommand({
        artifactId: mockArtifactId,
        content: '<p>Updated content</p>',
        authorType: AuthorType.ASSISTANT,
        expectedVersionNumber: 3,
      });

      const result = await useCase.execute(command);

      expect(result?.versionNumber).toBe(4);
    });

    it('should skip version check when expectedVersionNumber is not provided', async () => {
      const existingArtifact = new DocumentArtifact({
        id: mockArtifactId,
        threadId: mockThreadId,
        userId: mockUserId,
        title: 'No Version Check Report',
        currentVersionNumber: 5,
      });

      artifactsRepository.findById.mockResolvedValue(existingArtifact);
      artifactsRepository.addVersionAndUpdateArtifact.mockImplementation(
        async ({ version }) => version,
      );

      const command = new UpdateArtifactCommand({
        artifactId: mockArtifactId,
        content: '<p>Content without version check</p>',
        authorType: AuthorType.USER,
      });

      const result = await useCase.execute(command);

      expect(result?.versionNumber).toBe(6);
    });
  });

  it('should update only letterheadId without creating a new version when no content is provided', async () => {
    const mockLetterheadId = '423e4567-e89b-12d3-a456-426614174000' as UUID;

    const existingArtifact = new DocumentArtifact({
      id: mockArtifactId,
      threadId: mockThreadId,
      userId: mockUserId,
      title: 'Official Letter',
      currentVersionNumber: 1,
    });

    artifactsRepository.findById.mockResolvedValue(existingArtifact);

    const command = new UpdateArtifactCommand({
      artifactId: mockArtifactId,
      letterheadId: mockLetterheadId,
    });

    const result = await useCase.execute(command);

    expect(result).toBeUndefined();
    expect(artifactsRepository.findById).toHaveBeenCalledWith(
      mockArtifactId,
      mockUserId,
    );
    expect(artifactsRepository.updateLetterheadId).toHaveBeenCalledWith(
      mockArtifactId,
      mockLetterheadId,
    );
    expect(
      artifactsRepository.addVersionAndUpdateArtifact,
    ).not.toHaveBeenCalled();
  });

  it('should not call the atomic artifact update when artifact is not found', async () => {
    const mockLetterheadId = '423e4567-e89b-12d3-a456-426614174000' as UUID;

    artifactsRepository.findById.mockResolvedValue(null);

    const command = new UpdateArtifactCommand({
      artifactId: mockArtifactId,
      content: '<p>Unauthorized letterhead change</p>',
      authorType: AuthorType.USER,
      letterheadId: mockLetterheadId,
    });

    await expect(useCase.execute(command)).rejects.toThrow(
      ArtifactNotFoundError,
    );
    expect(artifactsRepository.updateLetterheadId).not.toHaveBeenCalled();
    expect(
      artifactsRepository.addVersionAndUpdateArtifact,
    ).not.toHaveBeenCalled();
  });

  it('should throw LetterheadNotFoundError when letterheadId does not belong to org before atomic update', async () => {
    const crossOrgLetterheadId = '523e4567-e89b-12d3-a456-426614174000' as UUID;

    findLetterheadUseCase.execute.mockRejectedValue(
      new LetterheadNotFoundError(crossOrgLetterheadId),
    );

    const command = new UpdateArtifactCommand({
      artifactId: mockArtifactId,
      content: '<p>Cross-org letterhead attempt</p>',
      authorType: AuthorType.USER,
      letterheadId: crossOrgLetterheadId,
    });

    await expect(useCase.execute(command)).rejects.toThrow(
      LetterheadNotFoundError,
    );
    expect(
      artifactsRepository.addVersionAndUpdateArtifact,
    ).not.toHaveBeenCalled();
  });

  it('should validate letterheadId belongs to org before updating', async () => {
    const mockLetterheadId = '423e4567-e89b-12d3-a456-426614174000' as UUID;

    const existingArtifact = new DocumentArtifact({
      id: mockArtifactId,
      threadId: mockThreadId,
      userId: mockUserId,
      title: 'Official Letter',
      currentVersionNumber: 1,
    });

    artifactsRepository.findById.mockResolvedValue(existingArtifact);
    artifactsRepository.addVersionAndUpdateArtifact.mockImplementation(
      async ({ version }) => version,
    );

    const command = new UpdateArtifactCommand({
      artifactId: mockArtifactId,
      content: '<p>Content with valid letterhead</p>',
      authorType: AuthorType.USER,
      letterheadId: mockLetterheadId,
    });

    await useCase.execute(command);

    expect(findLetterheadUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ letterheadId: mockLetterheadId }),
    );
  });

  describe('retry on version conflict', () => {
    it('should retry and succeed when addVersionAndUpdateArtifact fails once with conflict', async () => {
      const artifactV2 = new DocumentArtifact({
        id: mockArtifactId,
        threadId: mockThreadId,
        userId: mockUserId,
        title: 'Concurrent Budget Report',
        currentVersionNumber: 2,
      });

      const artifactV3 = new DocumentArtifact({
        id: mockArtifactId,
        threadId: mockThreadId,
        userId: mockUserId,
        title: 'Concurrent Budget Report',
        currentVersionNumber: 3,
      });

      // 1st call: ownership check, 2nd call: buildVersion attempt 1, 3rd call: buildVersion retry
      artifactsRepository.findById
        .mockResolvedValueOnce(artifactV2)
        .mockResolvedValueOnce(artifactV2)
        .mockResolvedValueOnce(artifactV3);

      artifactsRepository.addVersionAndUpdateArtifact
        .mockRejectedValueOnce(new ArtifactVersionConflictError(mockArtifactId))
        .mockImplementationOnce(async ({ version }) => version);

      const command = new UpdateArtifactCommand({
        artifactId: mockArtifactId,
        content: '<p>Concurrent update content</p>',
        authorType: AuthorType.USER,
      });

      const result = (await useCase.execute(command)) as ArtifactVersion;
      expect(result.versionNumber).toBe(4);
      // 1 ownership check + 2 buildVersion calls
      expect(artifactsRepository.findById).toHaveBeenCalledTimes(3);
      expect(
        artifactsRepository.addVersionAndUpdateArtifact,
      ).toHaveBeenCalledTimes(2);
    });

    it('should throw ArtifactVersionConflictError after exhausting all retries', async () => {
      const artifact = new DocumentArtifact({
        id: mockArtifactId,
        threadId: mockThreadId,
        userId: mockUserId,
        title: 'Heavily Contended Report',
        currentVersionNumber: 5,
      });

      artifactsRepository.findById.mockResolvedValue(artifact);
      artifactsRepository.addVersionAndUpdateArtifact.mockRejectedValue(
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

      // 1 ownership check + 3 buildVersion retries
      expect(artifactsRepository.findById).toHaveBeenCalledTimes(4);
      expect(
        artifactsRepository.addVersionAndUpdateArtifact,
      ).toHaveBeenCalledTimes(3);
    });

    it('should rethrow non-conflict errors without retrying', async () => {
      const artifact = new DocumentArtifact({
        id: mockArtifactId,
        threadId: mockThreadId,
        userId: mockUserId,
        title: 'Connection Error Report',
        currentVersionNumber: 1,
      });

      artifactsRepository.findById.mockResolvedValue(artifact);
      artifactsRepository.addVersionAndUpdateArtifact.mockRejectedValue(
        new Error('Connection refused'),
      );

      const command = new UpdateArtifactCommand({
        artifactId: mockArtifactId,
        content: '<p>Will fail with connection error</p>',
        authorType: AuthorType.USER,
      });

      const error = await useCase
        .execute(command)
        .catch((caughtError: unknown) => caughtError);

      expect(error).toBeInstanceOf(UnexpectedArtifactError);
      expect((error as UnexpectedArtifactError).message).toBe(
        'Unexpected artifact error',
      );
      expect((error as UnexpectedArtifactError).metadata).toBeUndefined();

      // 1 ownership check + 1 buildVersion attempt
      expect(artifactsRepository.findById).toHaveBeenCalledTimes(2);
      expect(
        artifactsRepository.addVersionAndUpdateArtifact,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('spreadsheet artifacts', () => {
    const spreadsheetArtifact = () =>
      new SpreadsheetArtifact({
        id: mockArtifactId,
        threadId: mockThreadId,
        userId: mockUserId,
        title: 'Budget Sheet',
        currentVersionNumber: 1,
      });

    beforeEach(() => {
      artifactsRepository.findById.mockResolvedValue(spreadsheetArtifact());
      artifactsRepository.addVersionAndUpdateArtifact.mockImplementation(
        async ({ version }) => version,
      );
    });

    it('should canonicalize spreadsheet content on user save', async () => {
      const command = new UpdateArtifactCommand({
        artifactId: mockArtifactId,
        content: JSON.stringify({
          format: SPREADSHEET_CONTENT_FORMAT,
          columns: ['A', 'B'],
          rows: [['x'], ['y', 1, 'extra']],
        }),
        authorType: AuthorType.USER,
      });

      const result = (await useCase.execute(command)) as ArtifactVersion;

      expect(JSON.parse(result.content)).toEqual({
        format: SPREADSHEET_CONTENT_FORMAT,
        columns: ['A', 'B'],
        rows: [
          ['x', null],
          ['y', 1],
        ],
      });
    });

    it('should measure the canonical spreadsheet content for the size limit', async () => {
      const compactContent = JSON.stringify({
        format: SPREADSHEET_CONTENT_FORMAT,
        columns: ['Value'],
        rows: [['A'.repeat(ARTIFACT_MAX_CONTENT_LENGTH - 120)]],
      });
      const paddedContent = compactContent.replace(
        '{',
        `{${' '.repeat(ARTIFACT_MAX_CONTENT_LENGTH - compactContent.length + 1)}`,
      );
      const command = new UpdateArtifactCommand({
        artifactId: mockArtifactId,
        content: paddedContent,
        authorType: AuthorType.USER,
      });

      const result = (await useCase.execute(command)) as ArtifactVersion;

      expect(result.content).toBe(compactContent);
    });

    it('should reject invalid spreadsheet content without saving a version', async () => {
      const command = new UpdateArtifactCommand({
        artifactId: mockArtifactId,
        content: '{"format":"wrong-format","columns":["A"],"rows":[]}',
        authorType: AuthorType.USER,
      });

      await expect(useCase.execute(command)).rejects.toThrow(
        InvalidSpreadsheetContentError,
      );
      expect(
        artifactsRepository.addVersionAndUpdateArtifact,
      ).not.toHaveBeenCalled();
    });

    it('should not sanitize spreadsheet content as HTML', async () => {
      const contentWithAngleBrackets = JSON.stringify({
        format: SPREADSHEET_CONTENT_FORMAT,
        columns: ['Comparison'],
        rows: [['a < b > c']],
      });

      const command = new UpdateArtifactCommand({
        artifactId: mockArtifactId,
        content: contentWithAngleBrackets,
        authorType: AuthorType.USER,
      });

      const result = (await useCase.execute(command)) as ArtifactVersion;

      expect(JSON.parse(result.content).rows).toEqual([['a < b > c']]);
    });
  });

  describe('user saves in an anonymous chat', () => {
    const maskedValues: Record<string, string> = {
      'Max Mustermann': '{{pii:PERSON_NAME_2}}',
      'max@example.org': '{{pii:EMAIL_ADDRESS_1}}',
    };

    // Stands in for the chat's detection: replaces every known real value.
    const maskKnownValues = (command: AnonymizeTextForThreadCommand) =>
      Promise.resolve({
        anonymizedText: Object.entries(maskedValues).reduce(
          (text, [value, token]) => text.replaceAll(value, token),
          command.text,
        ),
      });

    const givenArtifact = (
      artifact: DocumentArtifact | SpreadsheetArtifact,
    ) => {
      artifactsRepository.findById.mockResolvedValue(artifact);
      artifactsRepository.addVersionAndUpdateArtifact.mockImplementation(
        async ({ version }) => version,
      );
    };

    const documentArtifact = () =>
      new DocumentArtifact({
        id: mockArtifactId,
        threadId: mockThreadId,
        userId: mockUserId,
        title: 'Brief',
        currentVersionNumber: 1,
      });

    beforeEach(() => {
      findThreadsByIdsUseCase.execute.mockResolvedValue([
        new Thread({
          id: mockThreadId,
          userId: mockUserId,
          messages: [],
          isAnonymous: true,
        }),
      ]);
      anonymizeTextForThreadUseCase.execute.mockImplementation(maskKnownValues);
    });

    it('stores typed real values as placeholders so the model cannot read them', async () => {
      givenArtifact(documentArtifact());

      const result = (await useCase.execute(
        new UpdateArtifactCommand({
          artifactId: mockArtifactId,
          content:
            '<p>Hallo {{pii:PERSON_NAME_1}}, hier Max Mustermann, max@example.org</p>',
          authorType: AuthorType.USER,
        }),
      )) as ArtifactVersion;

      expect(result.content).toBe(
        '<p>Hallo {{pii:PERSON_NAME_1}}, hier {{pii:PERSON_NAME_2}}, {{pii:EMAIL_ADDRESS_1}}</p>',
      );
    });

    it('stores assistant writes unchanged because they already contain placeholders', async () => {
      givenArtifact(documentArtifact());

      const result = (await useCase.execute(
        new UpdateArtifactCommand({
          artifactId: mockArtifactId,
          content: '<p>Max Mustermann</p>',
          authorType: AuthorType.ASSISTANT,
        }),
      )) as ArtifactVersion;

      expect(result.content).toBe('<p>Max Mustermann</p>');
    });

    it('stores user saves of a normal chat unchanged', async () => {
      findThreadsByIdsUseCase.execute.mockResolvedValue([
        new Thread({ id: mockThreadId, userId: mockUserId, messages: [] }),
      ]);
      givenArtifact(documentArtifact());

      const result = (await useCase.execute(
        new UpdateArtifactCommand({
          artifactId: mockArtifactId,
          content: '<p>Max Mustermann</p>',
          authorType: AuthorType.USER,
        }),
      )) as ArtifactVersion;

      expect(result.content).toBe('<p>Max Mustermann</p>');
    });

    it('stores no version when masking fails, so content is never stored unmasked', async () => {
      givenArtifact(documentArtifact());
      anonymizeTextForThreadUseCase.execute.mockRejectedValue(
        new ProviderServerError({ provider: 'anonymize' }),
      );

      await expect(
        useCase.execute(
          new UpdateArtifactCommand({
            artifactId: mockArtifactId,
            content: '<p>Max Mustermann</p>',
            authorType: AuthorType.USER,
          }),
        ),
      ).rejects.toThrow(ProviderServerError);
      expect(
        artifactsRepository.addVersionAndUpdateArtifact,
      ).not.toHaveBeenCalled();
    });

    it('stores no version when the chat cannot be found to decide on masking', async () => {
      givenArtifact(documentArtifact());
      findThreadsByIdsUseCase.execute.mockResolvedValue([]);

      await expect(
        useCase.execute(
          new UpdateArtifactCommand({
            artifactId: mockArtifactId,
            content: '<p>Max Mustermann</p>',
            authorType: AuthorType.USER,
          }),
        ),
      ).rejects.toThrow(ArtifactNotFoundError);
      expect(
        artifactsRepository.addVersionAndUpdateArtifact,
      ).not.toHaveBeenCalled();
    });

    it('masks spreadsheet headers and string cells one by one and leaves formulas and numbers alone', async () => {
      givenArtifact(
        new SpreadsheetArtifact({
          id: mockArtifactId,
          threadId: mockThreadId,
          userId: mockUserId,
          title: 'Kontakte',
          currentVersionNumber: 1,
        }),
      );
      // A quote in a masked value must not leak into or break the JSON.
      maskedValues['Max "Maxi" Mustermann'] = '{{pii:PERSON_NAME_3}}';

      const result = (await useCase.execute(
        new UpdateArtifactCommand({
          artifactId: mockArtifactId,
          content: JSON.stringify({
            format: SPREADSHEET_CONTENT_FORMAT,
            columns: ['Name', 'E-Mail', 'Betrag'],
            rows: [
              ['Max "Maxi" Mustermann', 'max@example.org', 120],
              ['=A2', '=IF(B2="max@example.org",1,0)', '=SUM(C2:C2)'],
            ],
          }),
          authorType: AuthorType.USER,
        }),
      )) as ArtifactVersion;
      delete maskedValues['Max "Maxi" Mustermann'];

      expect(JSON.parse(result.content)).toEqual({
        format: SPREADSHEET_CONTENT_FORMAT,
        columns: ['Name', 'E-Mail', 'Betrag'],
        rows: [
          ['{{pii:PERSON_NAME_3}}', '{{pii:EMAIL_ADDRESS_1}}', 120],
          ['=A2', '=IF(B2="max@example.org",1,0)', '=SUM(C2:C2)'],
        ],
      });
    });

    it('does not run detection again on spreadsheet strings the current version already stores', async () => {
      givenArtifact(
        new SpreadsheetArtifact({
          id: mockArtifactId,
          threadId: mockThreadId,
          userId: mockUserId,
          title: 'Kontakte',
          currentVersionNumber: 4,
        }),
      );
      artifactsRepository.findVersion.mockResolvedValue(
        new ArtifactVersion({
          artifactId: mockArtifactId,
          versionNumber: 4,
          content: JSON.stringify({
            format: SPREADSHEET_CONTENT_FORMAT,
            columns: ['Name'],
            rows: [['{{pii:PERSON_NAME_1}}']],
          }),
          authorType: AuthorType.ASSISTANT,
          authorId: null,
        }),
      );

      await useCase.execute(
        new UpdateArtifactCommand({
          artifactId: mockArtifactId,
          content: JSON.stringify({
            format: SPREADSHEET_CONTENT_FORMAT,
            columns: ['Name'],
            rows: [['{{pii:PERSON_NAME_1}}'], ['Max Mustermann']],
          }),
          authorType: AuthorType.USER,
        }),
      );

      expect(artifactsRepository.findVersion).toHaveBeenCalledWith(
        mockArtifactId,
        4,
      );
      expect(
        anonymizeTextForThreadUseCase.execute.mock.calls.map(
          ([command]: [AnonymizeTextForThreadCommand]) => command.text,
        ),
      ).toEqual(['Max Mustermann']);
    });
  });
});
