import { uploadConfig } from './upload.config';

const DEFAULT_MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

describe('uploadConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.UPLOAD_MAX_FILE_SIZE_BYTES;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('defaults to the 25 MiB limit when the env var is unset', () => {
    expect(uploadConfig().maxFileSizeBytes).toBe(DEFAULT_MAX_FILE_SIZE_BYTES);
  });

  it('honors a valid positive override', () => {
    process.env.UPLOAD_MAX_FILE_SIZE_BYTES = '52428800';

    expect(uploadConfig().maxFileSizeBytes).toBe(52_428_800);
  });

  it.each(['0', '-5', '25MB', '1.5', ''])(
    'falls back to the default for the invalid value %p',
    (value) => {
      process.env.UPLOAD_MAX_FILE_SIZE_BYTES = value;

      expect(uploadConfig().maxFileSizeBytes).toBe(DEFAULT_MAX_FILE_SIZE_BYTES);
    },
  );
});
