import type { INestApplication, Provider, Type } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { ApplicationErrorFilter } from 'src/common/filters/application-error.filter';
import { DEFAULT_SOURCE_FILE_SIZE_LIMIT_BYTES } from 'src/common/util/source-file-upload';
import { uploadConfig } from 'src/config/upload.config';

export const RAISED_LIMIT_BYTES = 50 * 1024 * 1024;
/** Over the 25 MiB default, under a 50 MiB deployment limit. */
export const OVER_DEFAULT_LIMIT_BYTES = 26 * 1024 * 1024;

export interface UploadSurfaceHarness {
  upload(path: string, bytes: number, fileName?: string): Promise<Response>;
  close(): Promise<void>;
}

/**
 * Boots one real upload controller behind an HTTP listener so Multer, the
 * upload limit interceptor and the error filter run exactly as in production,
 * with the deployment's limit set to `maxFileSizeBytes`. Every controller
 * dependency not listed in `providers` is auto-mocked.
 */
export async function createUploadSurfaceHarness(options: {
  controller: Type<unknown>;
  providers?: Provider[];
  maxFileSizeBytes?: number;
}): Promise<UploadSurfaceHarness> {
  const app = await startApp(options);
  const server = app.getHttpServer() as Server;
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    upload(path, bytes, fileName = 'Bebauungsplan.pdf') {
      const form = new FormData();
      form.append(
        'file',
        new Blob([Buffer.alloc(bytes, 0x20)], { type: 'application/pdf' }),
        fileName,
      );
      return fetch(`${baseUrl}${path}`, { method: 'POST', body: form });
    },
    close: () => app.close(),
  };
}

async function startApp(options: {
  controller: Type<unknown>;
  providers?: Provider[];
  maxFileSizeBytes?: number;
}): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [options.controller],
    providers: [
      ...(options.providers ?? []),
      {
        provide: uploadConfig.KEY,
        useValue: {
          maxFileSizeBytes:
            options.maxFileSizeBytes ?? DEFAULT_SOURCE_FILE_SIZE_LIMIT_BYTES,
        },
      },
    ],
  })
    .useMocker(() => ({
      execute: jest.fn(),
      toDto: jest.fn(),
      toDocumentDto: jest.fn(),
    }))
    .compile();

  const app: INestApplication = moduleRef.createNestApplication();
  app.useGlobalFilters(
    new ApplicationErrorFilter(app.get(HttpAdapterHost).httpAdapter),
  );
  await app.listen(0, '127.0.0.1');
  return app;
}

export async function expectRejectedAtDefaultLimit(
  response: Response,
): Promise<void> {
  expect(response.status).toBe(413);
  await expect(response.json()).resolves.toMatchObject({
    code: 'FILE_TOO_LARGE',
    metadata: { maxFileSizeBytes: DEFAULT_SOURCE_FILE_SIZE_LIMIT_BYTES },
  });
}
