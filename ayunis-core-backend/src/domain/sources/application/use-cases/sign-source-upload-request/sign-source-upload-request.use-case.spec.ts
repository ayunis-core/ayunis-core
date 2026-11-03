import type { ContextService } from 'src/common/context/services/context.service';
import { SignSourceUploadRequestUseCase } from './sign-source-upload-request.use-case';
import { SignSourceUploadRequestCommand } from './sign-source-upload-request.command';
import { SourceUploadSessionAccessService } from 'src/domain/sources/application/services/source-upload-session-access.service';
import {
  SourceUploadExpiredError,
  SourceUploadRequestNotAllowedError,
} from 'src/domain/sources/application/sources.errors';
import {
  buildUploadSession,
  createMockSourceUploadSessionRepository,
  createOwnerContext,
  UPLOAD_SESSION_ID,
} from 'src/domain/sources/application/testing/source-upload.fixtures';
import { SourceUploadSessionStatus } from 'src/domain/sources/domain/upload/source-upload-session-status.enum';

describe('SignSourceUploadRequestUseCase', () => {
  const sessions = createMockSourceUploadSessionRepository();
  const presign = { execute: jest.fn().mockResolvedValue('https://signed') };
  const useCase = new SignSourceUploadRequestUseCase(
    new SourceUploadSessionAccessService(
      sessions,
      createOwnerContext() as unknown as ContextService,
    ),
    sessions,
    presign as never,
  );

  function sign(
    overrides: Partial<
      ConstructorParameters<typeof SignSourceUploadRequestCommand>[0]
    >,
  ) {
    return useCase.execute(
      new SignSourceUploadRequestCommand({
        uploadId: UPLOAD_SESSION_ID,
        method: 'PUT',
        ...overrides,
      }),
    );
  }

  function signedRequest() {
    return (presign.execute.mock.calls[0][0] as { request: unknown }).request;
  }

  beforeEach(() => jest.clearAllMocks());

  describe('single-request session', () => {
    beforeEach(() => sessions.findById.mockResolvedValue(buildUploadSession()));

    it('signs a whole-object PUT on the session key', async () => {
      const result = await sign({});

      expect(result.url).toBe('https://signed');
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(presign.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          objectName: buildUploadSession().storageKey,
          request: { method: 'PUT', query: {} },
        }),
      );
    });

    it.each([
      ['multipart initiation', { method: 'POST' as const }],
      [
        'a part upload',
        { method: 'PUT' as const, multipartUploadId: 'mp', partNumber: 1 },
      ],
    ])('refuses %s', async (_label, overrides) => {
      await expect(sign(overrides)).rejects.toBeInstanceOf(
        SourceUploadRequestNotAllowedError,
      );
      expect(presign.execute).not.toHaveBeenCalled();
    });
  });

  describe('multipart session', () => {
    beforeEach(() =>
      sessions.findById.mockResolvedValue(
        buildUploadSession({ multipart: true, fileSize: 50 * 1024 * 1024 }),
      ),
    );

    it('signs initiation with the uploads marker', async () => {
      await sign({ method: 'POST' });

      expect(signedRequest()).toEqual({
        method: 'POST',
        query: { uploads: '' },
      });
      expect(sessions.recordMultipartUploadId).not.toHaveBeenCalled();
    });

    it('signs a part upload and remembers the upload id', async () => {
      await sign({ method: 'PUT', multipartUploadId: 'mp-1', partNumber: 3 });

      expect(signedRequest()).toEqual({
        method: 'PUT',
        query: { uploadId: 'mp-1', partNumber: '3' },
      });
      expect(sessions.recordMultipartUploadId).toHaveBeenCalledWith(
        UPLOAD_SESSION_ID,
        'mp-1',
      );
    });

    it.each([
      ['listing parts', 'GET' as const],
      ['completion', 'POST' as const],
      ['abort', 'DELETE' as const],
    ])('signs %s with the upload id', async (_label, method) => {
      await sign({ method, multipartUploadId: 'mp-1' });

      expect(signedRequest()).toEqual({ method, query: { uploadId: 'mp-1' } });
    });

    it('does not rewrite an upload id it already knows', async () => {
      sessions.findById.mockResolvedValue(
        buildUploadSession({ multipart: true, multipartUploadId: 'mp-1' }),
      );

      await sign({ method: 'GET', multipartUploadId: 'mp-1' });

      expect(sessions.recordMultipartUploadId).not.toHaveBeenCalled();
    });

    it.each([
      [
        'a part without a part number',
        { method: 'PUT' as const, multipartUploadId: 'mp-1' },
      ],
      ['a whole-object PUT', { method: 'PUT' as const }],
      ['a listing without an upload id', { method: 'GET' as const }],
    ])('refuses %s', async (_label, overrides) => {
      await expect(sign(overrides)).rejects.toBeInstanceOf(
        SourceUploadRequestNotAllowedError,
      );
    });
  });

  it('refuses to sign for a session that is no longer transferable', async () => {
    sessions.findById.mockResolvedValue(
      buildUploadSession({ status: SourceUploadSessionStatus.COMPLETED }),
    );

    await expect(sign({})).rejects.toBeInstanceOf(SourceUploadExpiredError);
  });
});
