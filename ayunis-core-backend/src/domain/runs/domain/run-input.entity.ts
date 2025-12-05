import { ImageUploadData } from 'src/domain/messages/application/use-cases/create-user-message/create-user-message.command';

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
