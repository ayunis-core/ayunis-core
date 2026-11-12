import retrievalConfig from './retrieval.config';

describe('retrievalConfig', () => {
  const original = process.env.OCR_IMAGE_TEXT_ENABLED;

  afterEach(() => {
    if (original === undefined) delete process.env.OCR_IMAGE_TEXT_ENABLED;
    else process.env.OCR_IMAGE_TEXT_ENABLED = original;
  });

  it.each([
    [undefined, true],
    ['', true],
    ['true', true],
    ['false', false],
  ])('reads OCR_IMAGE_TEXT_ENABLED=%s as image text %s', (value, expected) => {
    if (value === undefined) delete process.env.OCR_IMAGE_TEXT_ENABLED;
    else process.env.OCR_IMAGE_TEXT_ENABLED = value;

    expect(retrievalConfig().ocrImageText).toBe(expected);
  });
});
