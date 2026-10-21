import { AddFileSourceToThreadUseCase } from 'src/domain/threads/application/use-cases/add-file-source-to-thread/add-file-source-to-thread.use-case';
import {
  createUploadSurfaceHarness,
  expectRejectedAtDefaultLimit,
  OVER_DEFAULT_LIMIT_BYTES,
  RAISED_LIMIT_BYTES,
  type UploadSurfaceHarness,
} from 'src/common/http/testing/upload-surface.harness';
import { ThreadSourcesController } from './thread-sources.controller';

const THREAD_ID = '33333333-3333-4333-8333-333333333333';
const UPLOAD_PATH = `/threads/${THREAD_ID}/sources/file`;

// Each request streams a 26 MiB body; under a loaded full-suite run that
// takes far longer than Jest's 5 s default.
jest.setTimeout(60_000);

describe('thread file source upload limit (HTTP boundary)', () => {
  const addFileSource = { execute: jest.fn().mockResolvedValue([]) };
  const providers = [
    { provide: AddFileSourceToThreadUseCase, useValue: addFileSource },
  ];
  let defaultDeployment: UploadSurfaceHarness;
  let raisedDeployment: UploadSurfaceHarness;

  beforeAll(async () => {
    defaultDeployment = await createUploadSurfaceHarness({
      controller: ThreadSourcesController,
      providers,
    });
    raisedDeployment = await createUploadSurfaceHarness({
      controller: ThreadSourcesController,
      providers,
      maxFileSizeBytes: RAISED_LIMIT_BYTES,
    });
  });

  afterAll(async () => {
    await defaultDeployment.close();
    await raisedDeployment.close();
  });

  beforeEach(() => addFileSource.execute.mockClear());

  it('rejects a 26 MiB chat attachment on the default limit', async () => {
    const response = await defaultDeployment.upload(
      UPLOAD_PATH,
      OVER_DEFAULT_LIMIT_BYTES,
    );

    await expectRejectedAtDefaultLimit(response);
    expect(addFileSource.execute).not.toHaveBeenCalled();
  });

  it('accepts the same attachment when the deployment limit is 50 MiB', async () => {
    const response = await raisedDeployment.upload(
      UPLOAD_PATH,
      OVER_DEFAULT_LIMIT_BYTES,
    );

    expect(response.status).toBe(201);
    expect(addFileSource.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: THREAD_ID,
        file: expect.objectContaining({ size: OVER_DEFAULT_LIMIT_BYTES }),
      }),
    );
  });

  it('still rejects a file above the raised limit', async () => {
    const response = await raisedDeployment.upload(
      UPLOAD_PATH,
      RAISED_LIMIT_BYTES + 1,
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      code: 'FILE_TOO_LARGE',
      metadata: { maxFileSizeBytes: RAISED_LIMIT_BYTES },
    });
    expect(addFileSource.execute).not.toHaveBeenCalled();
  });
});
