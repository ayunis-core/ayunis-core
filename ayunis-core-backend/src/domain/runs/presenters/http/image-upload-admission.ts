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

const NO_RESERVATION = () => {};

/**
 * Bounds the raw upload bytes held in memory per process. A request is
 * charged for each chunk the storage engine retains, never for what its
 * Content-Length declares, so a stalled or chunked request holds only what it
 * has sent. Until the route handler takes ownership with `transfer`, the
 * reservation is freed when the response closes, which covers requests Multer
 * rejects before the handler runs. After that, only the returned release frees
 * it: a client that disconnects mid-normalization must not free the bytes
 * while the run still holds them. Decoded frames are bounded separately by
 * the normalizer's concurrency cap.
 */
export class ImageUploadAdmission {
  private reserved = 0;
  private readonly reservations = new WeakMap<Request, Reservation>();

  constructor(private readonly budgetBytes: number) {}

  get reservedBytes(): number {
    return this.reserved;
  }

  reserve(request: Request, bytes: number): boolean {
    const reservation = this.reservations.get(request) ?? this.track(request);
    if (!reservation || reservation.released) return false;
    if (this.reserved + bytes > this.budgetBytes) return false;
    reservation.bytes += bytes;
    this.reserved += bytes;
    return true;
  }

  transfer(request: Request): () => void {
    const reservation = this.reservations.get(request);
    if (!reservation) return NO_RESERVATION;
    request.res?.removeListener('close', reservation.release);
    // The response can close between Multer keeping the files and the
    // handler starting; the handler now owns those bytes, so charge them
    // again until it releases them.
    if (reservation.released) {
      reservation.released = false;
      this.reserved += reservation.bytes;
    }
    return reservation.release;
  }

  // A chunk can still arrive after the client is gone; it must not be
  // charged, because the close event that frees the request has already
  // fired or never will. Only the response tells: a small body is fully
  // received, and its request destroyed, before Multer delivers its chunk.
  private track(request: Request): Reservation | undefined {
    if (request.res?.closed) return undefined;
    const reservation: Reservation = {
      bytes: 0,
      released: false,
      release: () => {
        if (reservation.released) return;
        reservation.released = true;
        this.reserved -= reservation.bytes;
      },
    };
    this.reservations.set(request, reservation);
    request.res?.once('close', reservation.release);
    return reservation;
  }
}

interface Reservation {
  bytes: number;
  released: boolean;
  release: () => void;
}
