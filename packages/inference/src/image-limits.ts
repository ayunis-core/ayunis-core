/**
 * A provider's documented ceiling for one inline image. A host that stores
 * images and resends them on later turns applies the strictest limit among
 * the providers a conversation may reach.
 */
export interface ImageLimits {
  /** Largest image the provider accepts, in raw bytes before base64 encoding. */
  readonly maxImageBytes: number;
}

/** Raw bytes that encode within a base64 ceiling: base64 writes every 3 bytes as 4 characters. */
export const rawBytesWithinBase64 = (base64Bytes: number): number =>
  Math.floor(base64Bytes / 4) * 3;
