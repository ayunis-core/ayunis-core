import { Readable } from 'stream';
import * as fs from 'fs';
import multer, { type Options } from 'multer';
import {
  removeUploadedFile,
  SOURCE_FILE_UPLOAD_OPTIONS,
  type UploadedSourceFile,
} from './source-file-upload';

// Browsers send the filename in the multipart part header as raw UTF-8 bytes.
// Busboy (via multer) decodes those bytes as latin1 unless defParamCharset is
// set, which turns umlauts into mojibake (e.g. "ü" -> "Ã¼"). This exercises the
// real upload options over a crafted request to prove the name survives intact.
function buildMultipartRequest(filename: string): Readable & {
  headers: Record<string, string>;
} {
  const boundary = '----testboundary1234567890';
  const header = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
      `Content-Type: text/plain\r\n\r\n`,
    'utf8',
  );
  const body = Buffer.from('hello world', 'utf8');
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
  const payload = Buffer.concat([header, body, footer]);

  const req = Readable.from(payload) as Readable & {
    headers: Record<string, string>;
  };
  req.headers = {
    'content-type': `multipart/form-data; boundary=${boundary}`,
    'content-length': String(payload.length),
  };
  return req;
}

function runUpload(filename: string): Promise<UploadedSourceFile> {
  const req = buildMultipartRequest(filename);
  const res = {} as unknown as Parameters<
    ReturnType<ReturnType<typeof multer>['single']>
  >[1];
  // NestJS's MulterOptions and @types/multer's Options diverge only on the
  // `dest` declaration, which this config never sets, so the runtime shape is
  // compatible.
  const middleware = multer(
    SOURCE_FILE_UPLOAD_OPTIONS as unknown as Options,
  ).single('file');

  return new Promise((resolvePromise, reject) => {
    middleware(req as never, res, (err: unknown) => {
      if (err) {
        reject(err instanceof Error ? err : new Error('upload failed'));
        return;
      }
      resolvePromise((req as unknown as { file: UploadedSourceFile }).file);
    });
  });
}

describe('SOURCE_FILE_UPLOAD_OPTIONS', () => {
  beforeAll(() => {
    fs.mkdirSync('./uploads', { recursive: true });
  });

  it('preserves umlauts and other special characters in the filename', async () => {
    const originalName = 'Grüße_Köln_Straße_€.txt';

    const file = await runUpload(originalName);

    try {
      expect(file.originalname).toBe(originalName);
    } finally {
      removeUploadedFile(file.path);
    }
  });
});
