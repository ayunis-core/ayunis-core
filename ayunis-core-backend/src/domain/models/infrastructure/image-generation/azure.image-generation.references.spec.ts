import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import { AzureImageGenerationHandler } from './azure.image-generation';
import { ImageGenerationInput } from 'src/domain/models/application/ports/image-generation.handler';
import { ImageGenerationFailedError } from 'src/domain/models/application/models.errors';
import { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

const mockImagesEdit = jest.fn();
jest.mock('openai', () => ({
  ...jest.requireActual('openai'),
  AzureOpenAI: jest.fn().mockImplementation(() => ({
    images: { edit: mockImagesEdit },
  })),
}));

const model = new ImageGenerationModel({
  name: 'gpt-image-2',
  provider: ModelProvider.AZURE,
  displayName: 'GPT Image 2',
  isArchived: false,
});

async function editReference(data: Buffer, contentType: string) {
  const config = { get: () => 'mock-value' } as unknown as ConfigService;
  const handler = new AzureImageGenerationHandler(config);
  await handler.generate(
    new ImageGenerationInput({
      model,
      prompt: 'Turn this photo into a coloring page',
      referenceImages: [{ data, contentType }],
    }),
  );
  const params = mockImagesEdit.mock.calls[0][0] as { image: File[] };
  const file = params.image[0];
  return { file, data: Buffer.from(await file.arrayBuffer()) };
}

describe('Azure image-edit reference files', () => {
  beforeEach(() => {
    mockImagesEdit.mockReset().mockResolvedValue({
      data: [{ b64_json: Buffer.from('generated-image').toString('base64') }],
    });
  });

  it('sends the oriented primary image from an iPhone-style MPO as a single JPEG', async () => {
    const original = readFileSync(join(__dirname, 'fixtures/mobile-hdr.jpg'));
    const unchanged = Buffer.from(original);
    const result = await editReference(original, 'image/jpeg');
    const metadata = await sharp(result.data).metadata();

    expect(result.file.name).toBe('reference-0.jpg');
    expect(result.file.type).toBe('image/jpeg');
    expect(metadata).toMatchObject({ format: 'jpeg', width: 16, height: 24 });
    expect(metadata.exif).toBeUndefined();
    expect(result.data.includes(Buffer.from('MPF\0'))).toBe(false);
    expect(original).toEqual(unchanged);
  });

  it.each(['jpeg', 'png', 'webp'] as const)(
    'sends a supported single-image file for %s references',
    async (format) => {
      const original = await sharp({
        create: { width: 8, height: 6, channels: 3, background: '#ffffff' },
      })
        .toFormat(format)
        .toBuffer();
      const result = await editReference(original, `image/${format}`);
      expect(await sharp(result.data).metadata()).toMatchObject({
        format,
        width: 8,
        height: 6,
        space: 'srgb',
      });
    },
  );

  it.each(['png', 'webp'] as const)(
    'preserves %s reference bytes without re-encoding',
    async (format) => {
      const original = await sharp({
        create: { width: 8, height: 6, channels: 4, background: '#ffffff' },
      })
        .withMetadata({ density: 300 })
        .toFormat(format)
        .toBuffer();
      const result = await editReference(original, `image/${format}`);
      expect(result.data).toEqual(original);
      expect(result.file.type).toBe(`image/${format}`);
    },
  );

  it('preserves transparency in references from generated images', async () => {
    const original = await sharp({
      create: {
        width: 8,
        height: 6,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png()
      .toBuffer();
    const result = await editReference(original, 'image/png');
    const pixels = await sharp(result.data).raw().toBuffer();
    expect((await sharp(result.data).metadata()).hasAlpha).toBe(true);
    expect(pixels[3]).toBe(0);
  });

  it('rejects a JPEG above 64 megapixels before decoding its pixels', async () => {
    const original = await sharp({
      create: { width: 8, height: 6, channels: 3, background: '#ffffff' },
    })
      .jpeg()
      .toBuffer();
    const frame = original.indexOf(Buffer.from([0xff, 0xc0]));
    expect(frame).toBeGreaterThan(0);
    original.writeUInt16BE(8001, frame + 5);
    original.writeUInt16BE(8000, frame + 7);
    await expect(editReference(original, 'image/jpeg')).rejects.toThrow(
      '64 megapixels',
    );
    expect(mockImagesEdit).not.toHaveBeenCalled();
  });

  it('rejects a normalized JPEG above the 10 MiB reference limit', async () => {
    const width = 4608;
    const pixels = Buffer.alloc(width * width * 3);
    let seed = 1306;
    for (let index = 0; index < pixels.length; index++) {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      pixels[index] = seed & 255;
    }
    const original = await sharp(pixels, {
      raw: { width, height: width, channels: 3 },
    })
      .jpeg({ quality: 30 })
      .toBuffer();
    expect(original.length).toBeLessThan(10 * 1024 * 1024);
    await expect(editReference(original, 'image/jpeg')).rejects.toThrow(
      '10 MiB',
    );
    expect(mockImagesEdit).not.toHaveBeenCalled();
  });

  it('rejects undecodable input before calling Azure', async () => {
    await expect(
      editReference(Buffer.from('broken JPEG'), 'image/jpeg'),
    ).rejects.toThrow(ImageGenerationFailedError);
    expect(mockImagesEdit).not.toHaveBeenCalled();
  });
});
