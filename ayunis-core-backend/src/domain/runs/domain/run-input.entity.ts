import type { UUID } from 'crypto';

/**
 * Domain-layer data structure for image uploads.
 * Contains the raw binary data and metadata needed for image storage.
 */
export interface ImageUploadData {
  readonly buffer: Buffer;
  readonly contentType: string;
  readonly altText?: string;
}

export class RunInput {}

export class RunUserInput extends RunInput {
  constructor(
    public readonly text: string,
    public readonly pendingImages: ImageUploadData[] = [],
    public readonly skillId?: UUID,
  ) {
    super();
  }
}

export class RunToolResultInput extends RunInput {
  constructor(
    public readonly toolId: string,
    public readonly toolName: string,
    public readonly result: string,
  ) {
    super();
  }
}
