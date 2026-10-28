import type { AllowedImageContentType } from 'src/common/util/content-type.util';

export interface NormalizableImage {
  readonly buffer: Buffer;
  readonly contentType: AllowedImageContentType;
}

/**
 * Re-encodes an uploaded image for storage: applies its orientation, strips
 * metadata and fits it within the image upload policy. Rejects with
 * MessageContentInvalidError when the image cannot be decoded or exceeds the
 * decoder's pixel limit.
 */
export abstract class ImageNormalizerPort {
  abstract normalize(image: NormalizableImage): Promise<NormalizableImage>;
}
