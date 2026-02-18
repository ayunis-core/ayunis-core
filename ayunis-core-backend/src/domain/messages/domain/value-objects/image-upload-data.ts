/**
 * Domain-layer data structure for image uploads.
 * Contains the raw binary data and metadata needed for image storage.
 *
 * This is a shared value object used by both messages (for storing images)
 * and runs (for passing image data during execution).
 */
export interface ImageUploadData {
  readonly buffer: Buffer;
  readonly contentType: string;
  readonly altText?: string;
}
