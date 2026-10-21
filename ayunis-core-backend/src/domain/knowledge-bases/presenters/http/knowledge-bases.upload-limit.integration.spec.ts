import * as fs from 'fs';
import type { AddDocumentToKnowledgeBaseCommand } from 'src/domain/knowledge-bases/application/use-cases/add-document-to-knowledge-base/add-document-to-knowledge-base.command';
import { AddDocumentToKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/add-document-to-knowledge-base/add-document-to-knowledge-base.use-case';
import {
  createUploadSurfaceHarness,
  expectRejectedAtDefaultLimit,
  OVER_DEFAULT_LIMIT_BYTES,
  RAISED_LIMIT_BYTES,
  type UploadSurfaceHarness,
} from 'src/common/http/testing/upload-surface.harness';
import { KnowledgeBasesController } from './knowledge-bases.controller';

const KNOWLEDGE_BASE_ID = '55555555-5555-4555-8555-555555555555';
const UPLOAD_PATH = `/knowledge-bases/${KNOWLEDGE_BASE_ID}/documents`;

// Each request streams a 26 MiB body; under a loaded full-suite run that
// takes far longer than Jest's 5 s default.
jest.setTimeout(60_000);

describe('knowledge base document upload limit (HTTP boundary)', () => {
  // The temp file is unlinked once the request ends, so its size is read
  // while the use case still has it.
  let receivedBytes: number | undefined;
  const addDocument = {
    execute: jest
      .fn()
      .mockImplementation((command: AddDocumentToKnowledgeBaseCommand) => {
        receivedBytes = fs.statSync(command.file.path).size;
        return Promise.resolve({});
      }),
  };
  const providers = [
    { provide: AddDocumentToKnowledgeBaseUseCase, useValue: addDocument },
  ];
  let defaultDeployment: UploadSurfaceHarness;
  let raisedDeployment: UploadSurfaceHarness;

  beforeAll(async () => {
    defaultDeployment = await createUploadSurfaceHarness({
      controller: KnowledgeBasesController,
      providers,
    });
    raisedDeployment = await createUploadSurfaceHarness({
      controller: KnowledgeBasesController,
      providers,
      maxFileSizeBytes: RAISED_LIMIT_BYTES,
    });
  });

  afterAll(async () => {
    await defaultDeployment.close();
    await raisedDeployment.close();
  });

  beforeEach(() => {
    addDocument.execute.mockClear();
    receivedBytes = undefined;
  });

  it('rejects a 26 MiB document on the default limit', async () => {
    const response = await defaultDeployment.upload(
      UPLOAD_PATH,
      OVER_DEFAULT_LIMIT_BYTES,
    );

    await expectRejectedAtDefaultLimit(response);
    expect(addDocument.execute).not.toHaveBeenCalled();
  });

  it('accepts the same document when the deployment limit is 50 MiB', async () => {
    const response = await raisedDeployment.upload(
      UPLOAD_PATH,
      OVER_DEFAULT_LIMIT_BYTES,
    );

    expect(response.status).toBe(202);
    expect(addDocument.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        knowledgeBaseId: KNOWLEDGE_BASE_ID,
        file: expect.objectContaining({
          name: 'Bebauungsplan.pdf',
          type: 'application/pdf',
          path: expect.stringContaining('uploads'),
        }),
      }),
    );
    expect(receivedBytes).toBe(OVER_DEFAULT_LIMIT_BYTES);
  });
});
