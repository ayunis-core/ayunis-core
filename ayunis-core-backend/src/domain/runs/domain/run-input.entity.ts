import { ImageUploadData } from 'src/domain/messages/domain/value-objects/image-upload-data';

export { ImageUploadData };

export class RunInput {}

export class RunUserInput extends RunInput {
  constructor(
    public readonly text: string,
    public readonly pendingImages: ImageUploadData[] = [],
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
