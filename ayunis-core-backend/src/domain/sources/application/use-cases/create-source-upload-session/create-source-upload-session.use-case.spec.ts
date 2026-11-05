import type { ContextService } from 'src/common/context/services/context.service';
import { CreateSourceUploadSessionUseCase } from './create-source-upload-session.use-case';
import { CreateSourceUploadSessionCommand } from './create-source-upload-session.command';
import {
  EmptyFileDataError,
  UnsupportedFileTypeError,
} from 'src/domain/sources/application/sources.errors';
import { PermittedEmbeddingModelNotFoundForOrgError } from 'src/domain/models/application/models.errors';
import { SourceUploadTargetType } from 'src/domain/sources/domain/upload/source-upload-target-type.enum';
import { SOURCE_UPLOAD_MULTIPART_THRESHOLD_BYTES } from 'src/domain/sources/domain/upload/source-upload.constants';
import {
  createMockSourceUploadSessionRepository,
  createOwnerContext,
  UPLOAD_ORG_ID,
  UPLOAD_TARGET_ID,
} from 'src/domain/sources/application/testing/source-upload.fixtures';

describe('CreateSourceUploadSessionUseCase', () => {
  const sessions = createMockSourceUploadSessionRepository();
  const assertOrgActive = { execute: jest.fn().mockResolvedValue({}) };
  const getPermittedEmbeddingModel = {
    execute: jest.fn().mockResolvedValue({}),
  };
  const useCase = new CreateSourceUploadSessionUseCase(
    sessions,
    assertOrgActive as never,
    getPermittedEmbeddingModel as never,
    createOwnerContext() as unknown as ContextService,
  );
  const MAX = 25 * 1024 * 1024;

  function command(
    overrides: Partial<
      ConstructorParameters<typeof CreateSourceUploadSessionCommand>[0]
    > = {},
  ) {
    return new CreateSourceUploadSessionCommand({
      targetType: SourceUploadTargetType.THREAD,
      targetId: UPLOAD_TARGET_ID,
      fileName: 'Protokoll.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024,
      maxFileSizeBytes: MAX,
      ...overrides,
    });
  }

  beforeEach(() => jest.clearAllMocks());

  it('reserves an org-scoped key for a single-request upload', async () => {
    const { session, partSizeBytes } = await useCase.execute(command());

    expect(session.storageKey).toBe(
      `${UPLOAD_ORG_ID}/uploads/${session.id}/Protokoll.pdf`,
    );
    expect(session.multipart).toBe(false);
    expect(session.fileType).toBe('application/pdf');
    expect(partSizeBytes).toBeGreaterThan(0);
    expect(sessions.save).toHaveBeenCalledTimes(1);
  });

  it.each(['.', '..', 'folder/.', 'folder/..', '/'])(
    'reserves a literal cleanable object key for file name %s',
    async (fileName) => {
      const { session } = await useCase.execute(command({ fileName }));
      const url = new URL('https://storage.example.org/bucket/');
      url.pathname = `/bucket/${session.storageKey}`;
      expect(decodeURIComponent(url.pathname)).toBe(
        `/bucket/${session.storageKey}`,
      );
      expect(session.storageKey.split('/').at(-1)).not.toMatch(/^\.{0,2}$/);
    },
  );

  it('marks large files for multipart transfer', async () => {
    const { session } = await useCase.execute(
      command({ fileSize: SOURCE_UPLOAD_MULTIPART_THRESHOLD_BYTES + 1 }),
    );

    expect(session.multipart).toBe(true);
    expect(session.multipartUploadId).toBeNull();
  });

  it('derives the canonical type from the file name when the browser sends none', async () => {
    const { session } = await useCase.execute(
      command({ fileName: 'notes.docx', mimeType: '' }),
    );

    expect(session.fileType).toContain('wordprocessingml');
  });

  it('rejects unsupported files before touching storage', async () => {
    await expect(
      useCase.execute(
        command({
          fileName: 'binary.exe',
          mimeType: 'application/octet-stream',
        }),
      ),
    ).rejects.toBeInstanceOf(UnsupportedFileTypeError);
    expect(sessions.save).not.toHaveBeenCalled();
  });

  it('rejects files above the caller-supplied limit with FILE_TOO_LARGE', async () => {
    await expect(
      useCase.execute(command({ fileSize: MAX + 1 })),
    ).rejects.toMatchObject({ code: 'FILE_TOO_LARGE', statusCode: 413 });
  });

  it('rejects empty files', async () => {
    await expect(
      useCase.execute(command({ fileSize: 0 })),
    ).rejects.toBeInstanceOf(EmptyFileDataError);
  });

  it('fails fast when the org has no embedding model for a document', async () => {
    getPermittedEmbeddingModel.execute.mockRejectedValueOnce(
      new PermittedEmbeddingModelNotFoundForOrgError(UPLOAD_ORG_ID),
    );

    await expect(useCase.execute(command())).rejects.toBeInstanceOf(
      PermittedEmbeddingModelNotFoundForOrgError,
    );
    expect(sessions.save).not.toHaveBeenCalled();
  });

  it('does not require an embedding model for a thread table upload', async () => {
    await useCase.execute(
      command({ fileName: 'data.csv', mimeType: 'text/csv' }),
    );

    expect(getPermittedEmbeddingModel.execute).not.toHaveBeenCalled();
  });

  it('requires an embedding model for a knowledge-base table upload', async () => {
    await useCase.execute(
      command({
        targetType: SourceUploadTargetType.KNOWLEDGE_BASE,
        fileName: 'data.csv',
        mimeType: 'text/csv',
      }),
    );

    expect(getPermittedEmbeddingModel.execute).toHaveBeenCalled();
  });
});
