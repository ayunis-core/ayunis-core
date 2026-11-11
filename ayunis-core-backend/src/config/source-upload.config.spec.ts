import sourceUploadConfig from './source-upload.config';

describe('sourceUploadConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.PDF_MAX_UPLOAD_BYTES;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('allows PDFs up to 100 MiB unless told otherwise', () => {
    expect(sourceUploadConfig().pdfMaxBytes).toBe(100 * 1024 * 1024);
  });

  it('reads the PDF limit from the environment', () => {
    process.env.PDF_MAX_UPLOAD_BYTES = '52428800';

    expect(sourceUploadConfig().pdfMaxBytes).toBe(52_428_800);
  });
});
