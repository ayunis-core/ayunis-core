export class RunInput {}

export class RunImageInput {
  constructor(
    public readonly imageUrl: string,
    public readonly altText?: string,
  ) {}
}

export class RunUserInput extends RunInput {
  constructor(
    public readonly text: string,
    public readonly images: RunImageInput[] = [],
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
