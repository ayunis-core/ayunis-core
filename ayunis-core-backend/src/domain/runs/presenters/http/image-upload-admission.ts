import { HttpException, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';

export const IMAGE_UPLOADS_BUSY = 'IMAGE_UPLOADS_BUSY';

export class ImageUploadsBusyException extends HttpException {
  constructor() {
    super(
      {
        code: IMAGE_UPLOADS_BUSY,
        message:
          'Too many image uploads are being processed. Please try again in a moment.',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

/**
 * Bounds how many requests may hold raw image uploads at once. Each admitted
 * request can hold up to the aggregate upload budget in Multer buffers plus a
 * decoded frame while it normalizes. A slot is freed when the run releases its
 * original images or when the response closes, whichever comes first, so an
 * open answer stream does not keep it.
 */
export class ImageUploadAdmission {
  private active = 0;
  private readonly releases = new WeakMap<Request, () => void>();

  constructor(private readonly maxInFlight: number) {}

  get inFlight(): number {
    return this.active;
  }

  admit(request: Request): boolean {
    if (this.releases.has(request)) return true;
    if (this.active >= this.maxInFlight) return false;
    this.active += 1;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      this.active -= 1;
    };
    this.releases.set(request, release);
    request.res?.once('close', release);
    return true;
  }

  release(request: Request): void {
    this.releases.get(request)?.();
  }
}
