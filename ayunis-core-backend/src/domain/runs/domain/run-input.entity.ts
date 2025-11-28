import { PendingImageUpload } from 'src/domain/messages/domain/value-objects/pending-image-upload.value-object';

export class RunInput {}

export class RunUserInput extends RunInput {
  constructor(
    public readonly text: string,
    public readonly pendingImages: PendingImageUpload[] = [],
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
