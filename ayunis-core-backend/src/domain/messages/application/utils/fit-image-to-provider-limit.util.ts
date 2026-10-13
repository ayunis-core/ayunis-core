import type { ProviderImageLimits } from '@ayunis/inference';
import sharp from 'sharp';
import {
  detectAllowedImageContentType,
  type AllowedImageContentType,
} from 'src/common/util/content-type.util';
import { MessageImageUnsupportedError } from 'src/domain/messages/application/messages.errors';
import { InferenceImageTooLargeError } from 'src/domain/models/application/models.errors';

// The strictest limits any provider declares (Anthropic's), used when the
// provider declares none. Every image already in a thread is sent again on
// each turn, so an image over the limit breaks the whole thread (AYC-1256).
export const PROVIDER_IMAGE_BASE64_LIMIT_BYTES = 5 * 1024 * 1024;
export const PROVIDER_IMAGE_MAX_EDGE_PX = 1568;
export const DEFAULT_PROVIDER_IMAGE_LIMITS: ProviderImageLimits = {
  maxBase64Bytes: PROVIDER_IMAGE_BASE64_LIMIT_BYTES,
  maxEdgePx: PROVIDER_IMAGE_MAX_EDGE_PX,
};

// sharp defaults to ~268 MP. A stored image is decoded again on every turn,
// so a crafted small file declaring a huge frame would cost that much each
// time. 64 MP still admits 8000×8000, Anthropic's own per-edge maximum.
const MAX_INPUT_PIXELS = 8000 * 8000;

const REENCODE_QUALITY = 85;

export interface ProviderImage {
  buffer: Buffer;
  contentType: AllowedImageContentType;
}

export async function fitImageToProviderLimit(
  buffer: Buffer,
  contentType: AllowedImageContentType,
  limits: ProviderImageLimits = DEFAULT_PROVIDER_IMAGE_LIMITS,
): Promise<ProviderImage> {
  if (base64Length(buffer.length) <= limits.maxBase64Bytes) {
    return { buffer, contentType };
  }
  const shrunk = await shrink(buffer, limits.maxEdgePx);
  if (base64Length(shrunk.buffer.length) > limits.maxBase64Bytes) {
    throw new InferenceImageTooLargeError({ bytes: buffer.length });
  }
  return shrunk;
}

// sharp picks its decoder from the bytes, not from the declared type, and the
// linked SVG, TIFF and HEIF decoders are not bounded by the pixel limit. Only
// bytes that carry an allowed raster signature reach it.
async function shrink(
  buffer: Buffer,
  maxEdgePx: number,
): Promise<ProviderImage> {
  if (!detectAllowedImageContentType(buffer)) {
    throw new MessageImageUnsupportedError({ bytes: buffer.length });
  }
  try {
    const image = sharp(buffer, {
      limitInputPixels: MAX_INPUT_PIXELS,
    })
      .rotate()
      .resize({
        width: maxEdgePx,
        height: maxEdgePx,
        fit: 'inside',
        withoutEnlargement: true,
      });
    const { hasAlpha } = await image.metadata();
    return hasAlpha
      ? {
          buffer: await image.webp({ quality: REENCODE_QUALITY }).toBuffer(),
          contentType: 'image/webp',
        }
      : {
          buffer: await image.jpeg({ quality: REENCODE_QUALITY }).toBuffer(),
          contentType: 'image/jpeg',
        };
  } catch {
    throw new InferenceImageTooLargeError({ bytes: buffer.length });
  }
}

function base64Length(byteLength: number): number {
  return Math.ceil(byteLength / 3) * 4;
}
