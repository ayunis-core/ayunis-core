import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import {
  ImageNormalizerPort,
  type NormalizableImage,
} from 'src/domain/messages/application/ports/image-normalizer.port';
import { MessageContentInvalidError } from 'src/domain/messages/application/messages.errors';
import {
  MAX_IMAGE_INPUT_PIXELS,
  MAX_IMAGE_LONG_EDGE_PX,
  MAX_IMAGE_SIZE_BYTES,
} from 'src/domain/messages/application/utils/image-upload.policy';

const LOSSY_QUALITY = 85;

@Injectable()
export class SharpImageNormalizer extends ImageNormalizerPort {
  async normalize(image: NormalizableImage): Promise<NormalizableImage> {
    try {
      const normalized = await this.encode(image.buffer, image.contentType);
      if (normalized.buffer.length <= MAX_IMAGE_SIZE_BYTES) {
        return normalized;
      }
      // A photo saved as PNG can stay above the ceiling after downscaling;
      // WebP keeps transparency and every supported provider accepts it.
      return await this.encode(image.buffer, 'image/webp');
    } catch (error) {
      throw new MessageContentInvalidError('Image could not be processed', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async encode(
    buffer: Buffer,
    sourceType: NormalizableImage['contentType'],
  ): Promise<NormalizableImage> {
    // Sharp decodes only the first frame, so an animated GIF or WebP keeps
    // its first frame, which is all the providers read anyway. EXIF, GPS and
    // other metadata are dropped because withMetadata() is never called.
    const pipeline = sharp(buffer, { limitInputPixels: MAX_IMAGE_INPUT_PIXELS })
      .rotate()
      .resize(MAX_IMAGE_LONG_EDGE_PX, MAX_IMAGE_LONG_EDGE_PX, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    switch (sourceType) {
      case 'image/jpeg':
        return {
          buffer: await pipeline.jpeg({ quality: LOSSY_QUALITY }).toBuffer(),
          contentType: 'image/jpeg',
        };
      case 'image/webp':
        return {
          buffer: await pipeline.webp({ quality: LOSSY_QUALITY }).toBuffer(),
          contentType: 'image/webp',
        };
      case 'image/png':
      case 'image/gif':
        return {
          buffer: await pipeline.png().toBuffer(),
          contentType: 'image/png',
        };
    }
  }
}
