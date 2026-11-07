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
    private readonly onImagesReleased?: () => void,
  ) {
    super();
  }

  releaseImages(): void {
    this.pendingImages.length = 0;
    this.onImagesReleased?.();
  }
}

/** A nudge the system sends to an unattended run that replied with text. */
export class RunNudgeInput extends RunUserInput {
  constructor(text: string) {
    super(text);
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
