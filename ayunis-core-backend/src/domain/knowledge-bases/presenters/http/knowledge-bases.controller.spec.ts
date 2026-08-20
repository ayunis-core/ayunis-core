import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import type { UUID } from 'crypto';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { UploadedDocument } from 'src/common/http/document-upload';
import { KnowledgeBasesController } from './knowledge-bases.controller';

describe('KnowledgeBasesController', () => {
  it('cleans up an uploaded file when MIME validation rejects it', async () => {
    const userId: UUID = '123e4567-e89b-12d3-a456-426614174000';
    const knowledgeBaseId: UUID = '223e4567-e89b-12d3-a456-426614174001';
    const file: UploadedDocument = {
      fieldname: 'file',
      originalname: 'unsupported.exe',
      encoding: '7bit',
      mimetype: 'application/octet-stream',
      size: 128,
      path: path.join(process.cwd(), 'uploads', 'unsupported-upload.exe'),
    };
    const unlink = jest.spyOn(fs.promises, 'unlink').mockResolvedValue();
    const controller = new KnowledgeBasesController(
      createPinoLoggerMock(),
      null as never,
      null as never,
      null as never,
      null as never,
      null as never,
      null as never,
      null as never,
      null as never,
      null as never,
    );

    await expect(
      controller.addDocument(userId, knowledgeBaseId, file),
    ).rejects.toThrow(BadRequestException);

    expect(unlink).toHaveBeenCalledWith(file.path);
    unlink.mockRestore();
  });
});
