/**
 * Owns an upload's bytes on behalf of Multer's file record. Multer keeps a
 * second copy of every completed record in a closure that lives as long as
 * the request, so a Buffer placed on the record stays reachable while an
 * answer streams. Both copies share this holder instead, and taking the
 * bytes out of it empties both.
 */
export class UploadBytes {
  private buffer: Buffer | undefined;

  constructor(buffer: Buffer) {
    this.buffer = buffer;
  }

  get isEmpty(): boolean {
    return this.buffer === undefined;
  }

  take(): Buffer {
    const buffer = this.buffer ?? Buffer.alloc(0);
    this.buffer = undefined;
    return buffer;
  }

  drop(): void {
    this.buffer = undefined;
  }
}

export type UploadedImageFile = Express.Multer.File & { bytes: UploadBytes };

export function uploadedImageFile(
  file: Express.Multer.File,
): UploadedImageFile {
  if (!('bytes' in file) || !(file.bytes instanceof UploadBytes)) {
    throw new TypeError(
      'Image upload was not received through TotalSizeLimitedMemoryStorage',
    );
  }
  return file as UploadedImageFile;
}
