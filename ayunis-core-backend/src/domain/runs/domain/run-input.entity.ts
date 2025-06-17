export class RunInput {}

export class RunTextInput extends RunInput {
  constructor(public readonly text: string) {
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
